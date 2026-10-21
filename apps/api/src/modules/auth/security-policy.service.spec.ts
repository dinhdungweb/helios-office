import { BadRequestException } from "@nestjs/common";
import {
  DEFAULT_SESSION_POLICY,
  mergeSessionPolicy,
  readSessionPolicy,
  readTwoFactorPolicy,
  SecurityPolicyService
} from "./security-policy.service";

describe("security policies (AU-18, AU-19)", () => {
  it("falls back to defaults for missing or out-of-range stored values", () => {
    expect(readTwoFactorPolicy({ enforced: true, otpDigits: 5, otpPeriodSeconds: 45 })).toEqual({
      enforced: true,
      verificationMinutes: 20,
      payrollRequired: false,
      otpDigits: 6,
      otpPeriodSeconds: 45
    });
    expect(readSessionPolicy(null)).toEqual(DEFAULT_SESSION_POLICY);
    expect(readSessionPolicy({ idleMinutes: 5, maxConcurrentSessions: 99 })).toMatchObject({ idleMinutes: 30, maxConcurrentSessions: 0 });
  });

  it("refuses a warning that does not leave a minute before sign-out", () => {
    expect(() => mergeSessionPolicy(DEFAULT_SESSION_POLICY, { idleMinutes: 10, warningSeconds: 600 })).toThrow(BadRequestException);
    expect(mergeSessionPolicy(DEFAULT_SESSION_POLICY, { idleMinutes: 10, warningSeconds: 540 })).toMatchObject({ idleMinutes: 10, warningSeconds: 540 });
  });

  it("sets Keycloak's idle timeout from the policy, back to 30 minutes when switched off, before saving", async () => {
    const tx = {
      adminSetting: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
      auditLog: { create: jest.fn() }
    };
    const prisma = { ...tx, $transaction: jest.fn(async (run: (client: typeof tx) => Promise<void>) => run(tx)) };
    const keycloak = { updateRealmSessionIdle: jest.fn().mockResolvedValue(undefined) };
    const service = new SecurityPolicyService(prisma as never, { contextFields: () => ({}) } as never, keycloak as never);

    await service.updateSessionPolicy({ autoLogoutEnabled: true, idleMinutes: 15 });
    await service.updateSessionPolicy({ autoLogoutEnabled: false });

    expect(keycloak.updateRealmSessionIdle.mock.calls).toEqual([[900], [1800]]);
    expect(prisma.adminSetting.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.auditLog.create.mock.calls[0][0].data.action).toBe("admin_setting.security.session.update");
  });

  it("saves nothing when Keycloak refuses the change", async () => {
    const prisma = { adminSetting: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() }, $transaction: jest.fn() };
    const keycloak = { updateRealmSessionIdle: jest.fn().mockRejectedValue(new Error("down")) };
    const service = new SecurityPolicyService(prisma as never, { contextFields: () => ({}) } as never, keycloak as never);

    await expect(service.updateSessionPolicy({ autoLogoutEnabled: true })).rejects.toThrow("down");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
