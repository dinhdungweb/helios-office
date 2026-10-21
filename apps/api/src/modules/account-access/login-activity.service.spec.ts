import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { LoginActivityService } from "./login-activity.service";

// jose is ESM-only; AuthService (which imports it) is replaced by a stub here.
jest.mock("jose", () => ({}));

function setup(options: { account?: Record<string, unknown> | null; sessions?: Array<Record<string, unknown>> } = {}) {
  const account = options.account === undefined ? { id: "acc-1", keycloakUserId: "kc-1", adminRole: "user" } : options.account;
  const prisma = {
    userAccount: {
      findUnique: jest.fn().mockResolvedValue(account),
      update: jest.fn().mockResolvedValue({})
    },
    loginEvent: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([])
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) }
  };
  const auth = { verifyAccessToken: jest.fn().mockResolvedValue({ sub: "kc-1", sid: "sid-1" }) };
  const keycloak = {
    findUserIdByLogin: jest.fn().mockResolvedValue("kc-1"),
    listUserSessions: jest.fn().mockResolvedValue(options.sessions ?? []),
    deleteSession: jest.fn().mockResolvedValue(undefined),
    logoutUser: jest.fn().mockResolvedValue(undefined)
  };
  const service = new LoginActivityService(prisma as never, auth as never, keycloak as never, { contextFields: () => ({}) } as never);

  return { service, prisma, auth, keycloak };
}

function user(adminRole: "user" | "system_admin" = "user", sid = "sid-current"): AuthenticatedUser {
  return {
    sub: "kc-1",
    roles: [],
    claims: { sid },
    account: { id: "acc-1", email: "a@helios.test", displayName: "A", employeeId: "emp-1", adminRole, accountStatus: "active", effectivePermissionKeys: [] }
  };
}

describe("LoginActivityService", () => {
  describe("recordLoginEvent (AU-20)", () => {
    it("takes the user and session from the verified token of a successful sign-in", async () => {
      const { service, prisma, keycloak } = setup();

      await service.recordLoginEvent({ username: " KhangLM ", outcome: "success", accessToken: "token", ipAddress: "10.0.0.7", userAgent: "Firefox" });

      expect(keycloak.findUserIdByLogin).not.toHaveBeenCalled();
      expect(prisma.loginEvent.create).toHaveBeenCalledWith({
        data: {
          accountId: "acc-1",
          keycloakUserId: "kc-1",
          username: "khanglm",
          outcome: "success",
          sessionId: "sid-1",
          ipAddress: "10.0.0.7",
          userAgent: "Firefox"
        }
      });
    });

    it("needs a token for outcomes Keycloak issued one for", async () => {
      const { service } = setup();

      await expect(service.recordLoginEvent({ username: "x", outcome: "account_inactive" })).rejects.toBeInstanceOf(BadRequestException);
    });

    it("finds the account of a wrong password by the typed login, and records unknown logins without one", async () => {
      const known = setup();
      await known.service.recordLoginEvent({ username: "khanglm", outcome: "invalid_credentials" });
      expect(known.keycloak.findUserIdByLogin).toHaveBeenCalledWith("khanglm");
      expect(known.prisma.loginEvent.create.mock.calls[0][0].data).toMatchObject({ accountId: "acc-1", sessionId: null });

      const unknown = setup({ account: null });
      unknown.keycloak.findUserIdByLogin.mockResolvedValue(null);
      await unknown.service.recordLoginEvent({ username: "ghost", outcome: "invalid_credentials" });
      expect(unknown.prisma.loginEvent.create.mock.calls[0][0].data).toMatchObject({ accountId: null, keycloakUserId: null, username: "ghost" });
    });
  });

  describe("sessions (AU-16)", () => {
    const sessions = [
      { id: "sid-old", start: 1_000, lastAccess: 2_000, ipAddress: "172.18.0.1" },
      { id: "sid-current", start: 3_000, lastAccess: 4_000, ipAddress: "172.18.0.1" }
    ];

    it("lists the current session first with the browser's IP from the sign-in, not Keycloak's", async () => {
      const { service, prisma } = setup({ sessions });
      prisma.loginEvent.findMany.mockResolvedValue([{ sessionId: "sid-old", ipAddress: "10.0.0.9", userAgent: "Chrome" }]);

      const result = await service.listSessions(user());

      expect(result.map((session) => [session.id, session.current])).toEqual([["sid-current", true], ["sid-old", false]]);
      expect(result[1]).toMatchObject({ ipAddress: "10.0.0.9", userAgent: "Chrome" });
      expect(result[0].ipAddress).toBeNull();
    });

    it("revokes another of the user's sessions and audits it", async () => {
      const { service, keycloak, prisma } = setup({ sessions });

      await service.revokeSession(user(), "sid-old");

      expect(keycloak.deleteSession).toHaveBeenCalledWith("sid-old");
      expect(prisma.userAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { revokedSessionIds: [{ sid: "sid-old", at: expect.any(String) }] }
      });
      expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "auth.session.revoke" });
    });

    it("refuses someone else's session id and the current session", async () => {
      const { service, keycloak } = setup({ sessions });

      await expect(service.revokeSession(user(), "sid-of-someone-else")).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.revokeSession(user(), "sid-current")).rejects.toBeInstanceOf(BadRequestException);
      expect(keycloak.deleteSession).not.toHaveBeenCalled();
    });
  });

  describe("forceLogout (AU-17)", () => {
    it("ends the Keycloak sessions, stamps sessionsRevokedAt and audits", async () => {
      const { service, keycloak, prisma } = setup();

      const result = await service.forceLogout("acc-1", user());

      expect(keycloak.logoutUser).toHaveBeenCalledWith("kc-1");
      expect(prisma.userAccount.update).toHaveBeenCalledWith({ where: { id: "acc-1" }, data: { sessionsRevokedAt: result.sessionsRevokedAt } });
      expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "account.force_logout", actorId: "emp-1" });
    });

    it("lets only the system admin sign the system admin out", async () => {
      const target = { id: "acc-root", keycloakUserId: "kc-root", adminRole: "system_admin" };

      await expect(setup({ account: target }).service.forceLogout("acc-root", user("user"))).rejects.toBeInstanceOf(ForbiddenException);
      await expect(setup({ account: target }).service.forceLogout("acc-root", user("system_admin"))).resolves.toMatchObject({ accountId: "acc-root" });
    });
  });
});
