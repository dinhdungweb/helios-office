import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, errors as joseErrors, jwtVerify, type JWTPayload } from "jose";
import { accountPermissionCatalog } from "../../common/mock-data";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  resolveCustomPermissionKeys,
  resolveEffectivePermissionKeys
} from "../account-access/account-access.utils";
import { AUTH_ERROR_CODES, type AuthenticatedUser } from "./auth.types";
import { isSessionRevoked } from "./session-revocation";

@Injectable()
export class AuthService {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  async verifyAuthorizationHeader(header: string | string[] | undefined): Promise<AuthenticatedUser> {
    const token = this.extractBearerToken(header);
    const issuers = this.getAcceptedIssuers();
    const audience = this.config.get<string>("JWT_AUDIENCE") || undefined;

    const payload = await this.verifyToken(token, issuers, audience);

    const sub = this.asString(payload.sub);
    if (!sub) {
      throw new UnauthorizedException("Token subject is missing");
    }

    const email = this.asString(payload.email);
    const name = this.asString(payload.name) ?? this.asString(payload.preferred_username);
    const account = await this.resolveAccount(sub, email);

    // `code` lets the web tell "valid Keycloak login, but no usable Helios account" apart from an
    // expired token, and refuse the session with a clear message (AU-24).
    if (!account) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        code: AUTH_ERROR_CODES.accountNotLinked,
        message: "No active Helios account is linked to this Keycloak user"
      });
    }

    if (account.accountStatus !== "active") {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        code: AUTH_ERROR_CODES.accountInactive,
        message: "Helios account is not active"
      });
    }

    // Force logout (AU-17) ends the Keycloak sessions, but access tokens already handed out stay
    // valid until they expire; refuse those here. iat has second precision, so compare in seconds.
    // A single session signed out from "Phiên đăng nhập" (AU-16) is refused the same way.
    const { sessionsRevokedAt, revokedSessionIds, ...accountView } = account;
    const revokedBefore = sessionsRevokedAt && typeof payload.iat === "number" && payload.iat < Math.floor(sessionsRevokedAt.getTime() / 1000);
    if (revokedBefore || isSessionRevoked(revokedSessionIds, payload.sid)) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: "Unauthorized",
        code: AUTH_ERROR_CODES.sessionRevoked,
        message: "This session was signed out"
      });
    }

    return {
      sub,
      email,
      name,
      roles: this.resolveRoles(payload),
      account: accountView,
      claims: payload
    };
  }

  // Signature, issuer and expiry only; no account checks. For the web server reporting which
  // Keycloak user and session a sign-in produced (AU-20), including refused ones.
  async verifyAccessToken(token: string) {
    return this.verifyToken(token, this.getAcceptedIssuers(), this.config.get<string>("JWT_AUDIENCE") || undefined);
  }

  private async verifyToken(token: string, issuers: string[], audience: string | undefined) {
    try {
      const { payload } = await jwtVerify(token, this.getJwks(), {
        issuer: issuers,
        audience
      });

      return payload;
    } catch (error) {
      // A bad, expired or foreign token is the caller's problem (401); failing to reach
      // Keycloak's JWKS endpoint is ours (503). Neither should surface as a 500.
      if (error instanceof joseErrors.JOSEError && !(error instanceof joseErrors.JWKSTimeout)) {
        throw new UnauthorizedException("Access token is invalid or expired");
      }

      throw new ServiceUnavailableException("Authentication provider is unavailable");
    }
  }

  private extractBearerToken(header: string | string[] | undefined) {
    const value = Array.isArray(header) ? header[0] : header;
    const match = value?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      throw new UnauthorizedException("Bearer token is required");
    }

    return match[1];
  }

  private splitList(value: string | undefined) {
    return (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private normalizeIssuer(value: string) {
    return value.replace(/\/$/, "");
  }

  private getPrimaryIssuer() {
    const issuer = this.config.get<string>("KEYCLOAK_ISSUER");

    if (!issuer) {
      throw new UnauthorizedException("KEYCLOAK_ISSUER is not configured");
    }

    return this.normalizeIssuer(issuer);
  }

  private getAcceptedIssuers() {
    return Array.from(
      new Set(
        [this.getPrimaryIssuer(), ...this.splitList(this.config.get<string>("KEYCLOAK_ISSUERS"))].map((issuer) =>
          this.normalizeIssuer(issuer)
        )
      )
    );
  }

  private getJwks() {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(`${this.getPrimaryIssuer()}/protocol/openid-connect/certs`));
    }

    return this.jwks;
  }

  private async resolveAccount(keycloakUserId: string, email: string | undefined) {
    const [account, permissionCatalog] = await Promise.all([
      this.prisma.userAccount.findFirst({
        where: {
          OR: [
            { keycloakUserId },
            ...(email ? [{ email }] : [])
          ]
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          adminRole: true,
          accountStatus: true,
          sessionsRevokedAt: true,
          revokedSessionIds: true,
          customPermissions: true,
          customPermissionsEnabled: true,
          customRevokedPermissions: true,
          employee: {
            select: {
              id: true
            }
          },
          permissionGroup: {
            select: {
              permissions: true,
              status: true
            }
          }
        }
      }),
      this.resolvePermissionCatalogKeys()
    ]);

    if (!account) {
      return null;
    }
    const customPermissionKeys = account.customPermissionsEnabled
      ? resolveCustomPermissionKeys(account.customPermissions)
      : [];
    const effectivePermissionKeys = resolveEffectivePermissionKeys(
      {
        adminRole: account.adminRole,
        accountStatus: account.accountStatus,
        permissionGroupStatus: account.permissionGroup?.status,
        groupPermissionKeys: account.permissionGroup?.permissions,
        customPermissionKeys,
        revokedPermissionKeys: account.customPermissionsEnabled ? account.customRevokedPermissions : []
      },
      permissionCatalog
    );

    return {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      employeeId: account.employee?.id ?? null,
      adminRole: account.adminRole,
      accountStatus: account.accountStatus,
      sessionsRevokedAt: account.sessionsRevokedAt,
      revokedSessionIds: account.revokedSessionIds,
      effectivePermissionKeys
    };
  }

  private async resolvePermissionCatalogKeys() {
    const permissions = await this.prisma.permissionDefinition.findMany({
      select: {
        key: true
      }
    });
    const keys = new Set(accountPermissionCatalog.map((permission) => permission.key));

    for (const permission of permissions) {
      keys.add(permission.key);
    }

    return Array.from(keys);
  }

  private resolveRoles(payload: JWTPayload) {
    const roles = new Set<string>();
    const realmRoles = this.readRoleArray(payload.realm_access, "roles");
    const clientId = this.config.get<string>("KEYCLOAK_CLIENT_ID");
    const resourceAccess = payload.resource_access;
    const clientRoles =
      clientId && resourceAccess && typeof resourceAccess === "object"
        ? this.readRoleArray((resourceAccess as Record<string, unknown>)[clientId], "roles")
        : [];
    const directRoles = this.readRoleArray(payload, "roles");

    for (const role of [...realmRoles, ...clientRoles, ...directRoles]) {
      roles.add(role);
    }

    return Array.from(roles);
  }

  private readRoleArray(value: unknown, key: string) {
    if (!value || typeof value !== "object") {
      return [];
    }

    const roles = (value as Record<string, unknown>)[key];
    if (!Array.isArray(roles)) {
      return [];
    }

    return roles.filter((role): role is string => typeof role === "string");
  }

  private asString(value: unknown) {
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
}
