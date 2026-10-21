import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { PrismaService } from "../../common/prisma/prisma.service";
import { AuthService } from "./auth.service";

// jose is ESM-only; token verification itself is stubbed per test below.
jest.mock("jose", () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
  errors: { JOSEError: class extends Error {}, JWKSTimeout: class extends Error {} }
}));

// AU-24: a valid Keycloak token without a usable Helios account is refused with a reason code the
// web uses to show the right message (and refuse the session) instead of a generic 401.

let account: Record<string, unknown> | null;

const prisma = {
  userAccount: { findFirst: async () => account },
  permissionDefinition: { findMany: async () => [{ key: "employees.department.manage" }] }
} as unknown as PrismaService;

const config = {
  get: (key: string) => ({ KEYCLOAK_ISSUER: "http://keycloak.test/realms/helios" })[key]
} as unknown as ConfigService;

function serviceWithToken(claims: Record<string, unknown>) {
  const service = new AuthService(config, prisma);
  jest.spyOn(service as unknown as { verifyToken: () => Promise<unknown> }, "verifyToken").mockResolvedValue(claims);
  return service;
}

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error as UnauthorizedException;
  }
  throw new Error("expected a rejection");
}

const activeAccount = {
  id: "acc-1",
  email: "user@helios.test",
  displayName: "User",
  adminRole: "user",
  accountStatus: "active",
  customPermissions: null,
  customPermissionsEnabled: false,
  employee: { id: "emp-1" },
  permissionGroup: { permissions: [], status: "active" }
};

describe("AuthService account resolution (AU-24)", () => {
  it("refuses a Keycloak user without a Helios account with code account_not_linked", async () => {
    account = null;

    const error = await rejection(serviceWithToken({ sub: "kc-1", email: "nobody@helios.test" }).verifyAuthorizationHeader("Bearer x"));

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error.getStatus()).toBe(401);
    expect(error.getResponse()).toMatchObject({ code: "account_not_linked" });
  });

  it("refuses a closed or not yet activated account with code account_inactive", async () => {
    account = { ...activeAccount, accountStatus: "closed" };

    const error = await rejection(serviceWithToken({ sub: "kc-1" }).verifyAuthorizationHeader("Bearer x"));

    expect(error.getStatus()).toBe(401);
    expect(error.getResponse()).toMatchObject({ code: "account_inactive" });
  });

  it("returns the account for an active, linked user", async () => {
    account = activeAccount;

    const user = await serviceWithToken({ sub: "kc-1" }).verifyAuthorizationHeader("Bearer x");

    expect(user.account).toMatchObject({ id: "acc-1", employeeId: "emp-1", accountStatus: "active" });
  });

  it("refuses tokens issued before a force logout with code session_revoked, and accepts later ones (AU-17)", async () => {
    const revokedAtSeconds = 1_800_000_000;
    account = { ...activeAccount, sessionsRevokedAt: new Date(revokedAtSeconds * 1000 + 400) };

    const error = await rejection(serviceWithToken({ sub: "kc-1", iat: revokedAtSeconds - 1 }).verifyAuthorizationHeader("Bearer x"));
    expect(error.getStatus()).toBe(401);
    expect(error.getResponse()).toMatchObject({ code: "session_revoked" });

    const user = await serviceWithToken({ sub: "kc-1", iat: revokedAtSeconds }).verifyAuthorizationHeader("Bearer x");
    expect(user.account).not.toHaveProperty("sessionsRevokedAt");
  });

  it("refuses tokens of a session signed out on its own, but not the account's other sessions (AU-16)", async () => {
    account = { ...activeAccount, revokedSessionIds: [{ sid: "sid-gone", at: new Date().toISOString() }] };

    const error = await rejection(serviceWithToken({ sub: "kc-1", sid: "sid-gone" }).verifyAuthorizationHeader("Bearer x"));
    expect(error.getResponse()).toMatchObject({ code: "session_revoked" });

    const user = await serviceWithToken({ sub: "kc-1", sid: "sid-other" }).verifyAuthorizationHeader("Bearer x");
    expect(user.account).not.toHaveProperty("revokedSessionIds");
  });

  it("keeps a plain 401 without a code for a missing token", async () => {
    const error = await rejection(new AuthService(config, prisma).verifyAuthorizationHeader(undefined));

    expect(error.getStatus()).toBe(401);
    expect(error.getResponse()).not.toHaveProperty("code");
  });
});
