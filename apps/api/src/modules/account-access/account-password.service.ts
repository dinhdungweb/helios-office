import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountAdminRole, AccountLifecycleStatus } from "@prisma/client";
import { randomInt } from "node:crypto";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AdminSettingsService } from "../admin-settings/admin-settings.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { KeycloakAdminService } from "../auth/keycloak-admin.service";
import type {
  ChangePasswordDto,
  ChangeTemporaryPasswordDto,
  ForgotPasswordDto,
  ResetAccountPasswordDto
} from "./account-password.dto";

const UPDATE_PASSWORD = "UPDATE_PASSWORD";
// One forgot-password email per account in this window, however often the form is submitted.
export const FORGOT_PASSWORD_COOLDOWN_MS = 2 * 60_000;
const FORGOT_PASSWORD_SENT = "account.password.forgot.sent";

const PASSWORD_ACCOUNT_SELECT = {
  id: true,
  email: true,
  keycloakUserId: true,
  adminRole: true,
  accountStatus: true,
  employee: { select: { id: true } }
} as const;

type PasswordAccount = {
  id: string;
  email: string;
  keycloakUserId: string;
  adminRole: AccountAdminRole;
  accountStatus: AccountLifecycleStatus;
  employee: { id: string } | null;
};

// Temporary passwords skip look-alike characters so they survive being read out or retyped.
const PASSWORD_ALPHABETS = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "@#$%&*!?"];

export function generateTemporaryPassword(length = 12) {
  const all = PASSWORD_ALPHABETS.join("");
  const characters = PASSWORD_ALPHABETS.map((alphabet) => alphabet[randomInt(alphabet.length)]);

  while (characters.length < length) {
    characters.push(all[randomInt(all.length)]);
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [characters[index], characters[swap]] = [characters[swap], characters[index]];
  }

  return characters.join("");
}

// Password changes (AU-13), forgot password (AU-14) and admin resets (AU-15). Keycloak holds the
// credentials; Helios checks who may change them, keeps passwordResetRequired in step and audits.
// Passwords never reach the audit log or the application log.
@Injectable()
export class AccountPasswordService {
  private readonly logger = new Logger(AccountPasswordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
    private readonly config: ConfigService,
    private readonly adminSettings: AdminSettingsService,
    private readonly audit: AuditService
  ) {}

  async changeOwnPassword(user: AuthenticatedUser, dto: ChangePasswordDto) {
    if (!user.account) {
      throw new ForbiddenException("This session has no Helios account");
    }

    const account = await this.findAccount(user.account.id);
    const username = typeof user.claims.preferred_username === "string" ? user.claims.preferred_username : account.email;
    this.assertNewPasswordDiffers(dto);

    if ((await this.keycloakAdmin.checkPassword(username, dto.currentPassword)) === "invalid") {
      throw new BadRequestException("Mật khẩu hiện tại không đúng.");
    }

    await this.applyNewPassword(account, dto.newPassword, "account.password.change");
    return { ok: true };
  }

  // Public: the person has no token yet, so the temporary password itself is the proof.
  async changeTemporaryPassword(dto: ChangeTemporaryPasswordDto) {
    this.assertNewPasswordDiffers(dto);

    if ((await this.keycloakAdmin.checkPassword(dto.username, dto.currentPassword)) === "invalid") {
      throw new BadRequestException("Sai tên đăng nhập hoặc mật khẩu.");
    }

    const keycloakUserId = await this.keycloakAdmin.findUserIdByLogin(dto.username);
    const account = keycloakUserId
      ? await this.prisma.userAccount.findUnique({ where: { keycloakUserId }, select: PASSWORD_ACCOUNT_SELECT })
      : null;

    // The credentials are proven at this point, so saying why is not an account enumeration leak.
    if (!account || account.accountStatus !== AccountLifecycleStatus.active) {
      throw new ConflictException("Tài khoản chưa được cấp quyền hoặc đang bị khoá trong Helios Office. Liên hệ quản trị viên.");
    }

    await this.applyNewPassword(account, dto.newPassword, "account.password.change_temporary");
    return { ok: true };
  }

  // Public and always the same answer, so it cannot be used to find out which logins exist. The
  // email goes out after the response, which also keeps the response time the same either way.
  requestPasswordReset(dto: ForgotPasswordDto) {
    void this.sendForgotPasswordEmail(dto.login.trim()).catch((error: unknown) => {
      this.logger.error(`Forgot password email failed: ${error instanceof Error ? error.message : error}`);
    });

    return { ok: true };
  }

  async sendForgotPasswordEmail(login: string) {
    const keycloakUserId = await this.keycloakAdmin.findUserIdByLogin(login);
    const account = keycloakUserId
      ? await this.prisma.userAccount.findUnique({ where: { keycloakUserId }, select: PASSWORD_ACCOUNT_SELECT })
      : null;

    if (!account) {
      return "unknown_login" as const;
    }

    const skip = async (reason: string) => {
      await this.writeAudit("account.password.forgot.skipped", account, { reason });
      return reason;
    };

    if (account.accountStatus !== AccountLifecycleStatus.active) {
      return skip("account_not_active");
    }

    if (!(await this.isEmailEnabled())) {
      return skip("email_disabled");
    }

    const recent = await this.prisma.auditLog.findFirst({
      where: {
        action: FORGOT_PASSWORD_SENT,
        entityId: account.id,
        createdAt: { gte: new Date(Date.now() - FORGOT_PASSWORD_COOLDOWN_MS) }
      },
      select: { id: true }
    });

    if (recent) {
      return skip("cooldown");
    }

    try {
      await this.keycloakAdmin.sendRequiredActionsEmail(account.keycloakUserId, [UPDATE_PASSWORD]);
    } catch (error) {
      await this.writeAudit("account.password.forgot.failed", account, {
        reason: error instanceof Error ? error.message.slice(0, 300) : "unknown_error"
      });
      return "failed" as const;
    }

    await this.writeAudit(FORGOT_PASSWORD_SENT, account, { email: account.email });
    return "sent" as const;
  }

  async resetAccountPassword(accountId: string, dto: ResetAccountPasswordDto, actor: AuthenticatedUser) {
    const account = await this.findAccount(accountId);

    // Whoever sets the system admin's password can sign in as the system admin.
    if (account.adminRole === AccountAdminRole.system_admin && actor.account?.adminRole !== AccountAdminRole.system_admin) {
      throw new ForbiddenException("Chỉ quản trị hệ thống mới đặt lại được mật khẩu của tài khoản quản trị hệ thống.");
    }

    if (account.accountStatus === AccountLifecycleStatus.closed) {
      throw new ConflictException("Tài khoản đã đóng, không thể đặt lại mật khẩu.");
    }

    if (account.keycloakUserId.startsWith("local-")) {
      throw new ConflictException("Tài khoản chưa có trên máy chủ đăng nhập. Hãy kích hoạt hoặc gửi lời mời trước.");
    }

    const signOutSessions = dto.signOutSessions ?? true;
    let temporaryPassword: string | undefined;

    if (dto.method === "email") {
      if (!(await this.isEmailEnabled())) {
        throw new ConflictException("Chưa bật gửi email (SMTP). Hãy dùng mật khẩu tạm hoặc cấu hình SMTP trước.");
      }

      await this.keycloakAdmin.sendRequiredActionsEmail(account.keycloakUserId, [UPDATE_PASSWORD]);
    } else {
      temporaryPassword = dto.temporaryPassword ?? generateTemporaryPassword();
      // temporary=true makes Keycloak add UPDATE_PASSWORD, so the next sign-in asks for a new one.
      await this.keycloakAdmin.resetPassword(account.keycloakUserId, temporaryPassword, true);
      await this.prisma.userAccount.update({
        where: { id: account.id },
        data: { passwordResetRequired: true, temporaryPasswordIssuedAt: new Date() }
      });
    }

    if (signOutSessions) {
      await this.keycloakAdmin.logoutUser(account.keycloakUserId);
    }

    await this.writeAudit("account.password.reset", account, {
      method: dto.method,
      signOutSessions,
      generatedPassword: dto.method === "temporary_password" && !dto.temporaryPassword
    }, actor.account?.employeeId ?? undefined);

    return {
      accountId: account.id,
      method: dto.method,
      signOutSessions,
      ...(dto.method === "email" ? { emailSentTo: account.email } : {}),
      // Shown once to the admin who asked for it; never stored by Helios.
      ...(temporaryPassword && !dto.temporaryPassword ? { temporaryPassword } : {})
    };
  }

  private async applyNewPassword(account: PasswordAccount, newPassword: string, action: string) {
    await this.keycloakAdmin.resetPassword(account.keycloakUserId, newPassword, false);
    await this.keycloakAdmin.removeRequiredAction(account.keycloakUserId, UPDATE_PASSWORD);
    await this.prisma.userAccount.update({
      where: { id: account.id },
      data: { passwordResetRequired: false, temporaryPasswordIssuedAt: null }
    });
    await this.writeAudit(action, account, { email: account.email }, account.employee?.id);
  }

  private assertNewPasswordDiffers(dto: ChangePasswordDto) {
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException("Mật khẩu mới phải khác mật khẩu hiện tại.");
    }
  }

  private async findAccount(id: string): Promise<PasswordAccount> {
    const account = await this.prisma.userAccount.findUnique({ where: { id }, select: PASSWORD_ACCOUNT_SELECT });

    if (!account) {
      throw new NotFoundException(`Account ${id} was not found`);
    }

    return account;
  }

  private async isEmailEnabled() {
    return this.config.get<string>("ACCOUNT_INVITE_EMAIL_ENABLED") === "true" || this.adminSettings.isSmtpEmailEnabled();
  }

  private async writeAudit(action: string, account: PasswordAccount, afterValue: Record<string, unknown>, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        ...this.audit.contextFields(),
        actorId,
        action,
        entityType: "UserAccount",
        entityId: account.id,
        afterValue: afterValue as object
      }
    });
  }
}
