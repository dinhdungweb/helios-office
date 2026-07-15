import { getServerEnv } from "@/lib/server-env";

export type WebAuthConfig = {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
};

function requiredEnv(key: string) {
  const value = getServerEnv(key);

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
}

function normalizeIssuer(value: string) {
  return value.replace(/\/+$/, "");
}

function splitEnvList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isLoopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function configuredIssuers() {
  return Array.from(
    new Set([requiredEnv("KEYCLOAK_ISSUER"), ...splitEnvList(getServerEnv("KEYCLOAK_ISSUERS"))].map(normalizeIssuer))
  );
}

export function resolveKeycloakIssuer(origin: string) {
  const requestHostname = new URL(origin).hostname;
  const issuers = configuredIssuers();
  const matchingIssuer = issuers.find((issuer) => new URL(issuer).hostname === requestHostname);

  if (matchingIssuer) {
    return matchingIssuer;
  }

  const primaryIssuer = new URL(issuers[0]);

  if (!isLoopbackHostname(requestHostname) && isLoopbackHostname(primaryIssuer.hostname)) {
    primaryIssuer.hostname = requestHostname;
    return normalizeIssuer(primaryIssuer.toString());
  }

  return issuers[0];
}

export function getWebAuthConfig(origin: string): WebAuthConfig {
  return {
    issuer: resolveKeycloakIssuer(origin),
    clientId: requiredEnv("KEYCLOAK_CLIENT_ID"),
    clientSecret: getServerEnv("KEYCLOAK_CLIENT_SECRET") || undefined,
    redirectUri: new URL("/api/auth/callback", origin).toString(),
    postLogoutRedirectUri: new URL("/login", origin).toString()
  };
}

export function getKeycloakAuthUrl(config: WebAuthConfig) {
  return new URL(`${config.issuer}/protocol/openid-connect/auth`);
}

export function getKeycloakTokenUrl(config: WebAuthConfig) {
  return new URL(`${config.issuer}/protocol/openid-connect/token`);
}

export function getKeycloakLogoutUrl(config: WebAuthConfig) {
  return new URL(`${config.issuer}/protocol/openid-connect/logout`);
}
