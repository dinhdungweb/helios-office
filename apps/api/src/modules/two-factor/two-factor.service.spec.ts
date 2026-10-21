import { BadRequestException, ConflictException, ForbiddenException, HttpException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types";
import { DEFAULT_TWO_FACTOR_POLICY } from "../auth/security-policy.service";
import { timeStep, totpCode } from "./totp";
import { TwoFactorService } from "./two-factor.service";

// jose is ESM-only; AuthService is not used here but sits in the import graph.
jest.mock("jose", () => ({}));

const SECRET = "JBSWY3DPEHPK3PXP";
// The "encryption" stub keeps the plain secret inside, so tests can compute real codes.
const secrets = { encrypt: (value: string) => ({ value }), decrypt: (secret: { value: string }) => secret.value };

const user: AuthenticatedUser = {
  sub: "kc-1",
  roles: [],
  claims: { sid: "sid-1" },
  account: { id: "acc-1", email: "khanglm@helios.vn", displayName: "K", employeeId: "emp-1", adminRole: "user", accountStatus: "active", effectivePermissionKeys: [] }
};

function setup(options: { credential?: Record<string, unknown> | null; verifiedAt?: Date | null; smtp?: boolean; failures?: number; emailCode?: Record<string, unknown> | null } = {}) {
  const prisma = {
    twoFactorCredential: {
      findUnique: jest.fn().mockResolvedValue(options.credential ?? null),
      upsert: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn()
    },
    twoFactorSession: { upsert: jest.fn(), deleteMany: jest.fn() },
    twoFactorEmailCode: {
      findFirst: jest.fn().mockResolvedValue(options.emailCode ?? null),
      create: jest.fn(),
      update: jest.fn()
    },
    userAccount: { findUnique: jest.fn().mockResolvedValue({ id: "acc-2", adminRole: "user" }) },
    auditLog: { create: jest.fn(), count: jest.fn().mockResolvedValue(options.failures ?? 0) },
    $transaction: jest.fn()
  };
  const policies = { getTwoFactorPolicy: jest.fn().mockResolvedValue({ ...DEFAULT_TWO_FACTOR_POLICY, enforced: true }) };
  const gate = { verifiedAt: jest.fn().mockResolvedValue(options.verifiedAt ?? null) };
  const adminSettings = {
    isSmtpEmailEnabled: jest.fn().mockResolvedValue(options.smtp ?? false),
    sendEmail: jest.fn().mockResolvedValue(options.smtp ? { sent: true } : { sent: false, reason: "smtp_disabled" })
  };
  const service = new TwoFactorService(
    prisma as never,
    policies as never,
    gate as never,
    secrets as never,
    adminSettings as never,
    { contextFields: () => ({}) } as never
  );

  return { service, prisma, adminSettings };
}

const confirmed = { secret: { value: SECRET }, digits: 6, periodSeconds: 30, confirmedAt: new Date(), lastUsedStep: null };
const actions = (prisma: ReturnType<typeof setup>["prisma"]) => prisma.auditLog.create.mock.calls.map(([call]: [{ data: { action: string } }]) => call.data.action);

describe("TwoFactorService (AU-18)", () => {
  it("starts app setup with a pending secret and an otpauth URL", async () => {
    const { service, prisma } = setup();

    const result = await service.setupTotp(user);

    expect(result.otpauthUrl).toContain(`secret=${result.secret}`);
    expect(prisma.twoFactorCredential.upsert.mock.calls[0][0].create).toMatchObject({ accountId: "acc-1", pendingDigits: 6, pendingPeriod: 30 });
  });

  it("needs a fresh verification to replace an app already set up", async () => {
    await expect(setup({ credential: { confirmedAt: new Date() } }).service.setupTotp(user)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(setup({ credential: { confirmedAt: new Date() }, verifiedAt: new Date() }).service.setupTotp(user)).resolves.toHaveProperty("secret");
  });

  it("confirms setup with a valid code and verifies the session", async () => {
    const pending = { pendingSecret: { value: SECRET }, pendingDigits: 6, pendingPeriod: 30 };
    const { service, prisma } = setup({ credential: pending });

    await service.confirmTotp(user, totpCode(SECRET, timeStep(30), 6));

    expect(prisma.twoFactorCredential.update.mock.calls[0][0].data).toMatchObject({ secret: { value: SECRET }, digits: 6 });
    expect(prisma.twoFactorSession.upsert.mock.calls[0][0].where).toEqual({ sessionId: "sid-1" });
    expect(actions(prisma)).toEqual(["auth.two_factor.totp_enrolled", "auth.two_factor.verified"]);
  });

  it("verifies with the app code once, then refuses the same code again", async () => {
    const code = totpCode(SECRET, timeStep(30), 6);
    const first = setup({ credential: confirmed });
    await first.service.verify(user, "totp", code);
    const step = first.prisma.twoFactorCredential.update.mock.calls[0][0].data.lastUsedStep;

    const replay = setup({ credential: { ...confirmed, lastUsedStep: step } });
    await expect(replay.service.verify(user, "totp", code)).rejects.toBeInstanceOf(BadRequestException);
    expect(actions(replay.prisma)).toEqual(["auth.two_factor.failed"]);
  });

  it("pauses verification after too many wrong codes", async () => {
    await expect(setup({ credential: confirmed, failures: 10 }).service.verify(user, "totp", "000000")).rejects.toBeInstanceOf(HttpException);
  });

  it("refuses to email a code while SMTP is off", async () => {
    await expect(setup({ smtp: false }).service.sendEmailCode(user)).rejects.toBeInstanceOf(ConflictException);
  });

  it("emails a code, stores only its hash, and accepts it once", async () => {
    const { service, prisma, adminSettings } = setup({ smtp: true });
    await service.sendEmailCode(user);
    const code = /\d{6}/.exec(adminSettings.sendEmail.mock.calls[0][0].text)?.[0] as string;
    const stored = prisma.twoFactorEmailCode.create.mock.calls[0][0].data;
    expect(stored.codeHash).not.toContain(code);

    const verifying = setup({ emailCode: { id: "code-1", codeHash: stored.codeHash, attempts: 0 } });
    await verifying.service.verify(user, "email", code);
    expect(verifying.prisma.twoFactorEmailCode.update).toHaveBeenCalledWith({ where: { id: "code-1" }, data: { usedAt: expect.any(Date) } });
  });

  it("keeps the app when 2FA is enforced and email codes are off", async () => {
    await expect(setup({ credential: confirmed, verifiedAt: new Date(), smtp: false }).service.removeTotp(user)).rejects.toBeInstanceOf(ConflictException);
  });

  it("lets only the system admin reset the system admin's 2FA", async () => {
    const { service, prisma } = setup();
    prisma.userAccount.findUnique.mockResolvedValue({ id: "acc-root", adminRole: "system_admin" });

    await expect(service.resetForAccount("acc-root", user)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
