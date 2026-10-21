import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { AccountPasswordService, generateTemporaryPassword } from "./account-password.service";

// jose is ESM-only; AuthService (which imports it) is replaced by a stub here.
jest.mock("jose", () => ({}));

const ACTIVE_USER = {
  id: "acc-1",
  email: "linh@helios.test",
  keycloakUserId: "kc-1",
  adminRole: "user",
  accountStatus: "active",
  employee: { id: "emp-1" }
};

function setup(overrides: { account?: Record<string, unknown> | null; check?: string; smtp?: boolean; recentSent?: boolean } = {}) {
  const account = overrides.account === undefined ? ACTIVE_USER : overrides.account;
  const prisma = {
    userAccount: {
      findUnique: jest.fn().mockResolvedValue(account),
      update: jest.fn().mockResolvedValue({})
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(overrides.recentSent ? { id: "log-1" } : null)
    }
  };
  const keycloak = {
    checkPassword: jest.fn().mockResolvedValue(overrides.check ?? "valid"),
    resetPassword: jest.fn().mockResolvedValue(undefined),
    removeRequiredAction: jest.fn().mockResolvedValue(undefined),
    logoutUser: jest.fn().mockResolvedValue(undefined),
    sendRequiredActionsEmail: jest.fn().mockResolvedValue(undefined),
    findUserIdByLogin: jest.fn().mockResolvedValue(account ? "kc-1" : null)
  };
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const adminSettings = { isSmtpEmailEnabled: jest.fn().mockResolvedValue(overrides.smtp ?? true) };
  const audit = { contextFields: () => ({}) };
  const loginActivity = { revokeAllSessions: jest.fn().mockResolvedValue(new Date()) };
  const service = new AccountPasswordService(
    prisma as never,
    keycloak as never,
    config as never,
    adminSettings as never,
    audit as never,
    loginActivity as never
  );

  return { service, prisma, keycloak, loginActivity };
}

function userWith(adminRole: "user" | "system_admin", id = "acc-1"): AuthenticatedUser {
  return {
    sub: "kc-1",
    roles: [],
    claims: { preferred_username: "linh" },
    account: { id, email: "x@helios.test", displayName: "X", employeeId: "emp-actor", adminRole, accountStatus: "active", effectivePermissionKeys: [] }
  };
}

const auditActions = (prisma: ReturnType<typeof setup>["prisma"]) =>
  prisma.auditLog.create.mock.calls.map(([call]: [{ data: { action: string } }]) => call.data.action);

describe("AccountPasswordService", () => {
  describe("changeOwnPassword (AU-13)", () => {
    it("checks the current password with the token's username, sets the new one and audits", async () => {
      const { service, prisma, keycloak } = setup();

      await service.changeOwnPassword(userWith("user"), { currentPassword: "Old@12345", newPassword: "New@12345" });

      expect(keycloak.checkPassword).toHaveBeenCalledWith("linh", "Old@12345");
      expect(keycloak.resetPassword).toHaveBeenCalledWith("kc-1", "New@12345", false);
      expect(keycloak.removeRequiredAction).toHaveBeenCalledWith("kc-1", "UPDATE_PASSWORD");
      expect(prisma.userAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { passwordResetRequired: false, temporaryPasswordIssuedAt: null }
      });
      expect(auditActions(prisma)).toEqual(["account.password.change"]);
      expect(JSON.stringify(prisma.auditLog.create.mock.calls)).not.toContain("New@12345");
    });

    it("refuses a wrong current password without touching Keycloak", async () => {
      const { service, keycloak } = setup({ check: "invalid" });

      await expect(
        service.changeOwnPassword(userWith("user"), { currentPassword: "wrong", newPassword: "New@12345" })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(keycloak.resetPassword).not.toHaveBeenCalled();
    });

    it("refuses a new password equal to the current one", async () => {
      const { service, keycloak } = setup();

      await expect(
        service.changeOwnPassword(userWith("user"), { currentPassword: "Same@12345", newPassword: "Same@12345" })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(keycloak.checkPassword).not.toHaveBeenCalled();
    });
  });

  describe("changeTemporaryPassword", () => {
    it("accepts a proven temporary password and clears the required action", async () => {
      const { service, keycloak, prisma } = setup({ check: "update_required" });

      await service.changeTemporaryPassword({ username: "linh", currentPassword: "Temp@1234", newPassword: "New@12345" });

      expect(keycloak.resetPassword).toHaveBeenCalledWith("kc-1", "New@12345", false);
      expect(keycloak.removeRequiredAction).toHaveBeenCalledWith("kc-1", "UPDATE_PASSWORD");
      expect(auditActions(prisma)).toEqual(["account.password.change_temporary"]);
    });

    it("refuses wrong credentials before looking the account up", async () => {
      const { service, keycloak } = setup({ check: "invalid" });

      await expect(
        service.changeTemporaryPassword({ username: "linh", currentPassword: "bad", newPassword: "New@12345" })
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(keycloak.findUserIdByLogin).not.toHaveBeenCalled();
    });

    it("refuses a Keycloak user without an active Helios account", async () => {
      const { service, keycloak } = setup({ check: "update_required", account: { ...ACTIVE_USER, accountStatus: "locked" } });

      await expect(
        service.changeTemporaryPassword({ username: "linh", currentPassword: "Temp@1234", newPassword: "New@12345" })
      ).rejects.toBeInstanceOf(ConflictException);
      expect(keycloak.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe("forgot password (AU-14)", () => {
    it("answers the same for unknown logins and sends nothing", async () => {
      const { service, keycloak } = setup({ account: null });

      expect(service.requestPasswordReset({ login: "nobody" })).toEqual({ ok: true });
      await expect(service.sendForgotPasswordEmail("nobody")).resolves.toBe("unknown_login");
      expect(keycloak.sendRequiredActionsEmail).not.toHaveBeenCalled();
    });

    it("emails an active account and audits it", async () => {
      const { service, keycloak, prisma } = setup();

      await expect(service.sendForgotPasswordEmail("linh")).resolves.toBe("sent");
      expect(keycloak.sendRequiredActionsEmail).toHaveBeenCalledWith("kc-1", ["UPDATE_PASSWORD"]);
      expect(auditActions(prisma)).toEqual(["account.password.forgot.sent"]);
    });

    it.each([
      ["account_not_active", { account: { ...ACTIVE_USER, accountStatus: "closed" } }],
      ["email_disabled", { smtp: false }],
      ["cooldown", { recentSent: true }]
    ])("skips with reason %s", async (reason, options) => {
      const { service, keycloak, prisma } = setup(options);

      await expect(service.sendForgotPasswordEmail("linh")).resolves.toBe(reason);
      expect(keycloak.sendRequiredActionsEmail).not.toHaveBeenCalled();
      expect(auditActions(prisma)).toEqual(["account.password.forgot.skipped"]);
    });
  });

  describe("resetAccountPassword (AU-15)", () => {
    it("sets a generated temporary password, signs the account out and returns the password once", async () => {
      const { service, keycloak, prisma, loginActivity } = setup();

      const result = await service.resetAccountPassword("acc-1", { method: "temporary_password" }, userWith("user", "acc-admin"));

      expect(result.temporaryPassword).toEqual(expect.any(String));
      expect(keycloak.resetPassword).toHaveBeenCalledWith("kc-1", result.temporaryPassword, true);
      expect(loginActivity.revokeAllSessions).toHaveBeenCalledWith(expect.objectContaining({ id: "acc-1", keycloakUserId: "kc-1" }));
      expect(prisma.userAccount.update).toHaveBeenCalledWith({
        where: { id: "acc-1" },
        data: { passwordResetRequired: true, temporaryPasswordIssuedAt: expect.any(Date) }
      });
      expect(auditActions(prisma)).toEqual(["account.password.reset"]);
      expect(JSON.stringify(prisma.auditLog.create.mock.calls)).not.toContain(result.temporaryPassword as string);
    });

    it("does not echo a password the admin typed, and can keep sessions", async () => {
      const { service, keycloak, loginActivity } = setup();

      const result = await service.resetAccountPassword(
        "acc-1",
        { method: "temporary_password", temporaryPassword: "Typed@123", signOutSessions: false },
        userWith("user", "acc-admin")
      );

      expect(result).not.toHaveProperty("temporaryPassword");
      expect(keycloak.resetPassword).toHaveBeenCalledWith("kc-1", "Typed@123", true);
      expect(loginActivity.revokeAllSessions).not.toHaveBeenCalled();
    });

    it("emails a reset link when SMTP is on, and refuses when it is off", async () => {
      const on = setup();
      await expect(on.service.resetAccountPassword("acc-1", { method: "email" }, userWith("user", "acc-admin"))).resolves.toMatchObject({
        emailSentTo: "linh@helios.test"
      });
      expect(on.keycloak.sendRequiredActionsEmail).toHaveBeenCalledWith("kc-1", ["UPDATE_PASSWORD"]);

      const off = setup({ smtp: false });
      await expect(off.service.resetAccountPassword("acc-1", { method: "email" }, userWith("user", "acc-admin"))).rejects.toBeInstanceOf(
        ConflictException
      );
    });

    it("lets only the system admin reset the system admin's password", async () => {
      const target = { ...ACTIVE_USER, adminRole: "system_admin" };

      await expect(
        setup({ account: target }).service.resetAccountPassword("acc-1", { method: "temporary_password" }, userWith("user", "acc-admin"))
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        setup({ account: target }).service.resetAccountPassword("acc-1", { method: "temporary_password" }, userWith("system_admin", "acc-root"))
      ).resolves.toMatchObject({ method: "temporary_password" });
    });

    it.each([
      ["closed", { ...ACTIVE_USER, accountStatus: "closed" }],
      ["not provisioned in Keycloak", { ...ACTIVE_USER, keycloakUserId: "local-acc-1" }]
    ])("refuses an account that is %s", async (_label, account) => {
      const { service, keycloak } = setup({ account });

      await expect(service.resetAccountPassword("acc-1", { method: "temporary_password" }, userWith("system_admin"))).rejects.toBeInstanceOf(
        ConflictException
      );
      expect(keycloak.resetPassword).not.toHaveBeenCalled();
    });
  });

  it("generates temporary passwords with every character class and no look-alikes", () => {
    for (let run = 0; run < 50; run += 1) {
      const password = generateTemporaryPassword();
      expect(password).toHaveLength(12);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[@#$%&*!?]/);
      expect(password).not.toMatch(/[0O1lI]/);
    }
  });
});
