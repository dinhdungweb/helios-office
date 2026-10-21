import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { AccountAdminRole, Prisma, TwoFactorMethod } from "@prisma/client";
import { createHash, randomInt } from "node:crypto";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SettingsSecretService, type EncryptedSettingSecret } from "../../common/settings-secret.service";
import { AdminSettingsService } from "../admin-settings/admin-settings.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { SecurityPolicyService } from "../auth/security-policy.service";
import { TwoFactorGateService } from "../auth/two-factor-gate.service";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "./totp";

const ISSUER = "Helios Office";
const EMAIL_CODE_TTL_MS = 5 * 60_000;
const EMAIL_CODE_COOLDOWN_MS = 60_000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
// Wrong codes allowed per account in the window before verification is paused.
const FAILED_LIMIT = 10;
const FAILED_WINDOW_MS = 15 * 60_000;
const FAILED_ACTION = "auth.two_factor.failed";

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

function hashEmailCode(accountId: string, code: string) {
  return createHash("sha256").update(`${accountId}:${code}`).digest("hex");
}

// Two-factor authentication (AU-18): authenticator app (TOTP) first, email codes as the fallback.
// A successful verification marks the caller's Keycloak session (sid) as verified, which is what
// TwoFactorGateService checks on every request.
@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: SecurityPolicyService,
    private readonly gate: TwoFactorGateService,
    private readonly secrets: SettingsSecretService,
    private readonly adminSettings: AdminSettingsService,
    private readonly audit: AuditService
  ) {}

  async status(user: AuthenticatedUser) {
    const account = this.requireAccount(user);
    const [policy, credential, verifiedAt, emailEnabled] = await Promise.all([
      this.policies.getTwoFactorPolicy(),
      this.prisma.twoFactorCredential.findUnique({ where: { accountId: account.id } }),
      this.gate.verifiedAt(user),
      this.adminSettings.isSmtpEmailEnabled()
    ]);

    return {
      policy: {
        enforced: policy.enforced,
        verificationMinutes: policy.verificationMinutes,
        otpDigits: policy.otpDigits,
        otpPeriodSeconds: policy.otpPeriodSeconds
      },
      totp: {
        enrolled: Boolean(credential?.confirmedAt && credential.secret),
        digits: credential?.confirmedAt ? credential.digits : policy.otpDigits,
        confirmedAt: credential?.confirmedAt ?? null
      },
      email: { available: emailEnabled, maskedAddress: maskEmail(account.email) },
      session: { verified: Boolean(verifiedAt), verifiedAt }
    };
  }

  // A new secret waits in pendingSecret until the user proves it with a code. Replacing an app
  // that is already set up needs a fresh verification of this session.
  async setupTotp(user: AuthenticatedUser) {
    const account = this.requireAccount(user);
    const [policy, credential] = await Promise.all([
      this.policies.getTwoFactorPolicy(),
      this.prisma.twoFactorCredential.findUnique({ where: { accountId: account.id }, select: { confirmedAt: true } })
    ]);

    if (credential?.confirmedAt) {
      await this.requireRecentVerification(user, policy.verificationMinutes);
    }

    const secret = generateTotpSecret();
    const pending = {
      pendingSecret: this.secrets.encrypt(secret) as unknown as Prisma.InputJsonObject,
      pendingDigits: policy.otpDigits,
      pendingPeriod: policy.otpPeriodSeconds,
      pendingCreatedAt: new Date()
    };
    await this.prisma.twoFactorCredential.upsert({
      where: { accountId: account.id },
      create: { accountId: account.id, ...pending },
      update: pending
    });

    return {
      secret,
      otpauthUrl: otpauthUrl({ secret, account: account.email, issuer: ISSUER, digits: policy.otpDigits, periodSeconds: policy.otpPeriodSeconds }),
      digits: policy.otpDigits,
      periodSeconds: policy.otpPeriodSeconds
    };
  }

  async confirmTotp(user: AuthenticatedUser, code: string) {
    const account = this.requireAccount(user);
    await this.assertNotLockedOut(account.id);
    const credential = await this.prisma.twoFactorCredential.findUnique({ where: { accountId: account.id } });

    if (!credential?.pendingSecret || !credential.pendingDigits || !credential.pendingPeriod) {
      throw new ConflictException("Chưa bắt đầu thiết lập app xác thực.");
    }

    const secret = this.secrets.decrypt(credential.pendingSecret as unknown as EncryptedSettingSecret);
    const step = verifyTotp(secret, code, { digits: credential.pendingDigits, periodSeconds: credential.pendingPeriod });

    if (step === null) {
      await this.recordFailure(account.id, "totp_setup");
      throw new BadRequestException("Mã không đúng. Kiểm tra giờ trên điện thoại và nhập mã đang hiện trong app.");
    }

    await this.prisma.twoFactorCredential.update({
      where: { accountId: account.id },
      data: {
        secret: credential.pendingSecret as Prisma.InputJsonObject,
        digits: credential.pendingDigits,
        periodSeconds: credential.pendingPeriod,
        confirmedAt: new Date(),
        lastUsedStep: step,
        pendingSecret: Prisma.DbNull,
        pendingDigits: null,
        pendingPeriod: null,
        pendingCreatedAt: null
      }
    });
    await this.writeAudit("auth.two_factor.totp_enrolled", account.id, {}, account.employeeId);
    // Proving the new app also proves this session.
    await this.markSessionVerified(user, TwoFactorMethod.totp);

    return { ok: true };
  }

  async removeTotp(user: AuthenticatedUser) {
    const account = this.requireAccount(user);
    const policy = await this.policies.getTwoFactorPolicy();
    await this.requireRecentVerification(user, policy.verificationMinutes);

    if (policy.enforced && !(await this.adminSettings.isSmtpEmailEnabled())) {
      throw new ConflictException("Công ty đang bắt buộc bảo mật 2 lớp và chưa bật mã qua email, nên không thể gỡ app xác thực. Hãy thiết lập app mới thay thế.");
    }

    await this.prisma.twoFactorCredential.deleteMany({ where: { accountId: account.id } });
    await this.writeAudit("auth.two_factor.totp_removed", account.id, {}, account.employeeId);
    return { ok: true };
  }

  async sendEmailCode(user: AuthenticatedUser) {
    const account = this.requireAccount(user);
    const policy = await this.policies.getTwoFactorPolicy();
    const latest = await this.prisma.twoFactorEmailCode.findFirst({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true }
    });

    if (latest && latest.createdAt.getTime() > Date.now() - EMAIL_CODE_COOLDOWN_MS) {
      throw new HttpException("Vừa gửi mã. Đợi một phút rồi gửi lại.", HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = Array.from({ length: policy.otpDigits }, () => randomInt(10)).join("");
    const result = await this.adminSettings.sendEmail({
      to: account.email,
      subject: "Mã xác thực đăng nhập Helios Office",
      text: `Mã xác thực của bạn là ${code}. Mã hết hạn sau 5 phút. Nếu không phải bạn đang đăng nhập, hãy đổi mật khẩu ngay.`,
      html: `<p>Mã xác thực của bạn là <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p><p>Mã hết hạn sau 5 phút. Nếu không phải bạn đang đăng nhập, hãy đổi mật khẩu ngay.</p>`
    });

    if (!result.sent) {
      throw new ConflictException("Hệ thống chưa bật gửi email nên không gửi được mã. Hãy dùng app xác thực hoặc liên hệ quản trị viên.");
    }

    await this.prisma.twoFactorEmailCode.create({
      data: { accountId: account.id, codeHash: hashEmailCode(account.id, code), expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS) }
    });
    await this.writeAudit("auth.two_factor.email_sent", account.id, { to: maskEmail(account.email) }, account.employeeId);

    return { sentTo: maskEmail(account.email), expiresInSeconds: EMAIL_CODE_TTL_MS / 1000 };
  }

  async verify(user: AuthenticatedUser, method: TwoFactorMethod, code: string) {
    const account = this.requireAccount(user);
    await this.assertNotLockedOut(account.id);

    const ok = method === TwoFactorMethod.totp ? await this.verifyTotpCode(account.id, code) : await this.verifyEmailCode(account.id, code);

    if (!ok) {
      await this.recordFailure(account.id, method);
      throw new BadRequestException("Mã xác thực không đúng hoặc đã hết hạn.");
    }

    await this.markSessionVerified(user, method);
    return { ok: true };
  }

  // Admin (AU-18): the person lost their phone. Removes the app and every verified session, so
  // their next request asks for the second factor again.
  async resetForAccount(accountId: string, actor: AuthenticatedUser) {
    const account = await this.prisma.userAccount.findUnique({ where: { id: accountId }, select: { id: true, adminRole: true } });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} was not found`);
    }

    if (account.adminRole === AccountAdminRole.system_admin && actor.account?.adminRole !== AccountAdminRole.system_admin) {
      throw new ForbiddenException("Chỉ quản trị hệ thống mới đặt lại được bảo mật 2 lớp của tài khoản quản trị hệ thống.");
    }

    await this.prisma.$transaction([
      this.prisma.twoFactorCredential.deleteMany({ where: { accountId } }),
      this.prisma.twoFactorSession.deleteMany({ where: { accountId } })
    ]);
    await this.writeAudit("account.two_factor.reset", accountId, {}, actor.account?.employeeId ?? undefined);

    return { ok: true };
  }

  private async verifyTotpCode(accountId: string, code: string) {
    const credential = await this.prisma.twoFactorCredential.findUnique({ where: { accountId } });
    if (!credential?.confirmedAt || !credential.secret) return false;

    const secret = this.secrets.decrypt(credential.secret as unknown as EncryptedSettingSecret);
    const step = verifyTotp(secret, code, { digits: credential.digits, periodSeconds: credential.periodSeconds });

    // A code already accepted (or an older one) cannot be replayed.
    if (step === null || (credential.lastUsedStep !== null && step <= credential.lastUsedStep)) return false;

    await this.prisma.twoFactorCredential.update({ where: { accountId }, data: { lastUsedStep: step } });
    return true;
  }

  private async verifyEmailCode(accountId: string, code: string) {
    const latest = await this.prisma.twoFactorEmailCode.findFirst({
      where: { accountId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    });

    if (!latest || latest.attempts >= EMAIL_CODE_MAX_ATTEMPTS) return false;

    if (latest.codeHash !== hashEmailCode(accountId, code)) {
      await this.prisma.twoFactorEmailCode.update({ where: { id: latest.id }, data: { attempts: { increment: 1 } } });
      return false;
    }

    await this.prisma.twoFactorEmailCode.update({ where: { id: latest.id }, data: { usedAt: new Date() } });
    return true;
  }

  private async markSessionVerified(user: AuthenticatedUser, method: TwoFactorMethod) {
    const account = this.requireAccount(user);
    const sessionId = user.claims.sid;

    if (typeof sessionId !== "string") {
      throw new BadRequestException("Phiên đăng nhập không có mã phiên (sid).");
    }

    const verifiedAt = new Date();
    await this.prisma.twoFactorSession.upsert({
      where: { sessionId },
      create: { sessionId, accountId: account.id, method, verifiedAt },
      update: { accountId: account.id, method, verifiedAt }
    });
    await this.writeAudit("auth.two_factor.verified", account.id, { method, sessionId }, account.employeeId);
  }

  private async requireRecentVerification(user: AuthenticatedUser, minutes: number) {
    const verifiedAt = await this.gate.verifiedAt(user);

    if (!verifiedAt || verifiedAt.getTime() < Date.now() - minutes * 60_000) {
      throw new ForbiddenException({
        statusCode: 403,
        error: "Forbidden",
        code: "two_factor_step_up_required",
        message: "Xác thực mã hiện tại trước khi thay đổi bảo mật 2 lớp."
      });
    }
  }

  private async assertNotLockedOut(accountId: string) {
    const failures = await this.prisma.auditLog.count({
      where: { action: FAILED_ACTION, entityId: accountId, createdAt: { gte: new Date(Date.now() - FAILED_WINDOW_MS) } }
    });

    if (failures >= FAILED_LIMIT) {
      throw new HttpException("Nhập sai mã quá nhiều lần. Thử lại sau 15 phút.", HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async recordFailure(accountId: string, method: string) {
    await this.writeAudit(FAILED_ACTION, accountId, { method });
  }

  private requireAccount(user: AuthenticatedUser) {
    if (!user.account) {
      throw new ForbiddenException("This session has no Helios account");
    }

    return { id: user.account.id, email: user.account.email, employeeId: user.account.employeeId ?? undefined };
  }

  private async writeAudit(action: string, accountId: string, afterValue: Record<string, unknown>, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        ...this.audit.contextFields(),
        actorId,
        action,
        entityType: "UserAccount",
        entityId: accountId,
        afterValue: afterValue as Prisma.InputJsonObject
      }
    });
  }
}
