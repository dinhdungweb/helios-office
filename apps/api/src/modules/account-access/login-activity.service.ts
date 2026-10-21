import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { AccountAdminRole, LoginOutcome } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { KeycloakAdminService } from "../auth/keycloak-admin.service";
import { addRevokedSession } from "../auth/session-revocation";
import type { RecordLoginEventDto } from "./login-activity.dto";

const DEFAULT_HISTORY_LIMIT = 50;
// Outcomes Keycloak reached with a valid password, so it issued a token that names the user.
const TOKEN_OUTCOMES = new Set<LoginOutcome>([LoginOutcome.success, LoginOutcome.account_not_linked, LoginOutcome.account_inactive]);

const LOGIN_EVENT_SELECT = {
  id: true,
  outcome: true,
  username: true,
  ipAddress: true,
  userAgent: true,
  sessionId: true,
  createdAt: true
} as const;

// Login history (AU-20), the user's own sessions (AU-16) and force logout (AU-17). Keycloak holds
// the sessions; Helios adds what Keycloak cannot see behind the web server: the browser's IP and
// user agent, recorded per sign-in and joined to sessions by their Keycloak session id (sid).
@Injectable()
export class LoginActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly keycloakAdmin: KeycloakAdminService,
    private readonly audit: AuditService
  ) {}

  async recordLoginEvent(dto: RecordLoginEventDto) {
    let keycloakUserId: string | null = null;
    let sessionId: string | null = null;

    if (TOKEN_OUTCOMES.has(dto.outcome)) {
      if (!dto.accessToken) {
        throw new BadRequestException(`accessToken is required for outcome ${dto.outcome}`);
      }

      const claims = await this.auth.verifyAccessToken(dto.accessToken);
      keycloakUserId = typeof claims.sub === "string" ? claims.sub : null;
      sessionId = typeof claims.sid === "string" ? claims.sid : null;
    } else {
      // Wrong or temporary password: no token, so find the person by what they typed (if anyone).
      keycloakUserId = await this.keycloakAdmin.findUserIdByLogin(dto.username).catch(() => null);
    }

    const account = keycloakUserId
      ? await this.prisma.userAccount.findUnique({ where: { keycloakUserId }, select: { id: true } })
      : null;

    await this.prisma.loginEvent.create({
      data: {
        accountId: account?.id ?? null,
        keycloakUserId,
        username: dto.username.trim().toLowerCase(),
        outcome: dto.outcome,
        sessionId,
        ipAddress: dto.ipAddress?.trim() || null,
        userAgent: dto.userAgent?.slice(0, 500) || null
      }
    });

    return { ok: true };
  }

  async loginHistory(accountId: string, limit = DEFAULT_HISTORY_LIMIT) {
    return this.prisma.loginEvent.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: LOGIN_EVENT_SELECT
    });
  }

  async accountLoginHistory(accountId: string, limit?: number) {
    await this.findAccount(accountId);
    return this.loginHistory(accountId, limit);
  }

  async listSessions(user: AuthenticatedUser) {
    const sessions = await this.keycloakAdmin.listUserSessions(user.sub);
    const currentSessionId = typeof user.claims.sid === "string" ? user.claims.sid : null;
    const events = sessions.length
      ? await this.prisma.loginEvent.findMany({
          where: { sessionId: { in: sessions.map((session) => session.id) }, outcome: LoginOutcome.success },
          select: { sessionId: true, ipAddress: true, userAgent: true }
        })
      : [];
    const eventBySession = new Map(events.map((event) => [event.sessionId, event]));

    return sessions
      .map((session) => {
        const event = eventBySession.get(session.id);
        return {
          id: session.id,
          current: session.id === currentSessionId,
          startedAt: session.start ? new Date(session.start).toISOString() : null,
          lastAccessAt: session.lastAccess ? new Date(session.lastAccess).toISOString() : null,
          // Keycloak's own address is the web server's; prefer the browser's from the sign-in.
          ipAddress: event?.ipAddress ?? null,
          userAgent: event?.userAgent ?? null
        };
      })
      .sort((a, b) => Number(b.current) - Number(a.current) || (b.lastAccessAt ?? "").localeCompare(a.lastAccessAt ?? ""));
  }

  async revokeSession(user: AuthenticatedUser, sessionId: string) {
    const sessions = await this.keycloakAdmin.listUserSessions(user.sub);

    // Only the caller's own sessions; someone else's id looks the same as one that does not exist.
    if (!sessions.some((session) => session.id === sessionId)) {
      throw new NotFoundException("Session was not found");
    }

    if (sessionId === user.claims.sid) {
      throw new BadRequestException("Đây là phiên đang dùng. Hãy dùng Đăng xuất.");
    }

    await this.keycloakAdmin.deleteSession(sessionId);

    // Keycloak has ended the session; also refuse the access tokens it already issued.
    if (user.account) {
      const account = await this.prisma.userAccount.findUnique({ where: { id: user.account.id }, select: { revokedSessionIds: true } });
      await this.prisma.userAccount.update({
        where: { id: user.account.id },
        data: { revokedSessionIds: addRevokedSession(account?.revokedSessionIds, sessionId) }
      });
    }

    await this.writeAudit("auth.session.revoke", user.account?.id ?? user.sub, { sessionId }, user.account?.employeeId ?? undefined);

    return { ok: true };
  }

  async forceLogout(accountId: string, actor: AuthenticatedUser) {
    const account = await this.findAccount(accountId);

    if (account.adminRole === AccountAdminRole.system_admin && actor.account?.adminRole !== AccountAdminRole.system_admin) {
      throw new ForbiddenException("Chỉ quản trị hệ thống mới buộc đăng xuất được tài khoản quản trị hệ thống.");
    }

    if (account.keycloakUserId.startsWith("local-")) {
      throw new ConflictException("Tài khoản chưa có trên máy chủ đăng nhập nên không có phiên nào.");
    }

    const sessionsRevokedAt = await this.revokeAllSessions(account);
    await this.writeAudit("account.force_logout", account.id, { sessionsRevokedAt }, actor.account?.employeeId ?? undefined);

    return { accountId: account.id, sessionsRevokedAt };
  }

  // Ends every Keycloak session and makes the API refuse access tokens issued before now.
  async revokeAllSessions(account: { id: string; keycloakUserId: string }) {
    await this.keycloakAdmin.logoutUser(account.keycloakUserId);
    const sessionsRevokedAt = new Date();
    await this.prisma.userAccount.update({ where: { id: account.id }, data: { sessionsRevokedAt } });

    return sessionsRevokedAt;
  }

  private async findAccount(id: string) {
    const account = await this.prisma.userAccount.findUnique({
      where: { id },
      select: { id: true, keycloakUserId: true, adminRole: true }
    });

    if (!account) {
      throw new NotFoundException(`Account ${id} was not found`);
    }

    return account;
  }

  private async writeAudit(action: string, entityId: string, afterValue: Record<string, unknown>, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        ...this.audit.contextFields(),
        actorId,
        action,
        entityType: "UserAccount",
        entityId,
        afterValue: afterValue as object
      }
    });
  }
}
