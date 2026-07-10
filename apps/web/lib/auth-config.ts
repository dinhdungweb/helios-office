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

export function getWebAuthConfig(origin: string): WebAuthConfig {
  return {
    issuer: normalizeIssuer(requiredEnv("KEYCLOAK_ISSUER")),
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
