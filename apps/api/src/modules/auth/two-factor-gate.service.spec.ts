import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { AuthenticatedUser } from "./auth.types";
import { DEFAULT_TWO_FACTOR_POLICY, type TwoFactorPolicy } from "./security-policy.service";
import { TwoFactorGateService } from "./two-factor-gate.service";

const user: AuthenticatedUser = {
  sub: "kc-1",
  roles: [],
  claims: { sid: "sid-1" },
  account: { id: "acc-1", email: "a@helios.test", displayName: "A", employeeId: null, adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
};

function gate(policy: Partial<TwoFactorPolicy>, session: { accountId: string; verifiedAt: Date } | null) {
  const prisma = { twoFactorSession: { findUnique: jest.fn().mockResolvedValue(session) } };
  const policies = { getTwoFactorPolicy: jest.fn().mockResolvedValue({ ...DEFAULT_TWO_FACTOR_POLICY, ...policy }) };
  return { service: new TwoFactorGateService(prisma as never, policies as never), prisma };
}

async function codeOf(promise: Promise<unknown>) {
  try {
    await promise;
    return "passed";
  } catch (error) {
    return [(error as UnauthorizedException).getStatus(), ((error as UnauthorizedException).getResponse() as { code?: string }).code];
  }
}

describe("TwoFactorGateService (AU-18)", () => {
  it("does nothing, not even a lookup, while 2FA is off and the route needs no step-up", async () => {
    const { service, prisma } = gate({ enforced: false }, null);

    await expect(codeOf(service.check(user, { allowPending: false }))).resolves.toBe("passed");
    expect(prisma.twoFactorSession.findUnique).not.toHaveBeenCalled();
  });

  it("refuses an unverified session when enforced, except on the routes that verify it", async () => {
    await expect(codeOf(gate({ enforced: true }, null).service.check(user, { allowPending: false }))).resolves.toEqual([401, "two_factor_required"]);
    await expect(codeOf(gate({ enforced: true }, null).service.check(user, { allowPending: true }))).resolves.toBe("passed");
  });

  it("accepts a verified session, but not one verified for another account", async () => {
    const now = new Date();
    await expect(codeOf(gate({ enforced: true }, { accountId: "acc-1", verifiedAt: now }).service.check(user, { allowPending: false }))).resolves.toBe("passed");
    await expect(codeOf(gate({ enforced: true }, { accountId: "acc-2", verifiedAt: now }).service.check(user, { allowPending: false }))).resolves.toEqual([
      401,
      "two_factor_required"
    ]);
  });

  it("asks payroll to verify again once the last verification is older than the window", async () => {
    const old = new Date(Date.now() - 21 * 60_000);
    const recent = new Date(Date.now() - 5 * 60_000);
    const policy = { payrollRequired: true, verificationMinutes: 20 };

    await expect(codeOf(gate(policy, { accountId: "acc-1", verifiedAt: old }).service.check(user, { allowPending: false, stepUp: "payroll" }))).resolves.toEqual([
      403,
      "two_factor_step_up_required"
    ]);
    await expect(codeOf(gate(policy, { accountId: "acc-1", verifiedAt: recent }).service.check(user, { allowPending: false, stepUp: "payroll" }))).resolves.toBe(
      "passed"
    );
    await expect(codeOf(gate({ payrollRequired: false }, null).service.check(user, { allowPending: false, stepUp: "payroll" }))).resolves.toBe("passed");
  });

  it("treats a token without a session id as unverified", async () => {
    const noSid = { ...user, claims: {} };
    await expect(codeOf(gate({ enforced: true }, null).service.check(noSid, { allowPending: false }))).resolves.toEqual([401, "two_factor_required"]);
  });

  it("uses Forbidden for step-up so the web does not treat it as a lost session", () => {
    expect(new ForbiddenException().getStatus()).toBe(403);
  });
});
