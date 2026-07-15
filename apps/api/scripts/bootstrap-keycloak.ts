import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { userAccounts } from "../src/common/mock-data";

type KeycloakTokenResponse = {
  access_token?: string;
};

type KeycloakClient = {
  id: string;
  clientId: string;
};

type KeycloakRole = {
  id: string;
  name: string;
};

type KeycloakUser = {
  id?: string;
  username?: string;
  email?: string;
};

for (const envPath of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  loadEnv({ path: envPath, quiet: true });
}

const issuer = requiredEnv("KEYCLOAK_ISSUER").replace(/\/+$/, "");
const issuerUrl = new URL(issuer);
const keycloakOrigin = issuerUrl.origin;
const realmName = resolveRealmName(issuerUrl);
const adminRealm = process.env.KEYCLOAK_ADMIN_REALM || "master";
const adminClientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID || "admin-cli";
const adminUsername = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";
const webClientId = requiredEnv("KEYCLOAK_CLIENT_ID");
const webClientSecret = process.env.KEYCLOAK_CLIENT_SECRET || "change-me";
const webOrigins = resolveWebOrigins();
const seedPassword = process.env.KEYCLOAK_SEED_PASSWORD || "Welcome@123";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://helios:helios@localhost:5432/helios_office?schema=public";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl })
});

function requiredEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
}

function resolveRealmName(url: URL) {
  const match = url.pathname.match(/\/realms\/([^/]+)/);

  if (!match) {
    throw new Error("KEYCLOAK_ISSUER must include /realms/<realm>");
  }

  return decodeURIComponent(match[1]);
}

function splitEnvList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(value: string) {
  return new URL(value).origin;
}

function resolveWebOrigins() {
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  const configuredOrigins = [
    ...splitEnvList(process.env.WEB_ORIGIN),
    ...splitEnvList(process.env.WEB_ORIGINS)
  ];

  return Array.from(new Set([...defaults, ...configuredOrigins].map(normalizeOrigin)));
}

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    const fallback = parts[0] ?? displayName.trim();
    return {
      firstName: fallback,
      lastName: fallback
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? parts[0]
  };
}

function adminUrl(path: string) {
  return new URL(`/admin/realms/${encodeURIComponent(realmName)}/${path.replace(/^\/+/, "")}`, keycloakOrigin);
}

async function getAdminToken() {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: adminClientId,
    username: adminUsername,
    password: adminPassword
  });
  let response: Response;

  try {
    response = await fetch(
      `${keycloakOrigin}/realms/${encodeURIComponent(adminRealm)}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      }
    );
  } catch (error) {
    throw new Error(
      `Cannot reach Keycloak at ${keycloakOrigin}. Start Keycloak first, then rerun npm run keycloak:bootstrap. ${
        error instanceof Error ? error.message : ""
      }`
    );
  }

  if (!response.ok) {
    throw new Error(`Cannot get Keycloak admin token: ${response.status} ${await response.text()}`);
  }

  const tokenSet = (await response.json()) as KeycloakTokenResponse;

  if (!tokenSet.access_token) {
    throw new Error("Keycloak admin token response is missing access_token");
  }

  return tokenSet.access_token;
}

async function keycloakRequest(pathOrUrl: string | URL, init: RequestInit = {}) {
  const token = await getAdminToken();
  const url = pathOrUrl instanceof URL ? pathOrUrl : adminUrl(pathOrUrl);
  const headers = new Headers(init.headers);

  headers.set("Authorization", `Bearer ${token}`);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(`Keycloak request ${url.pathname} failed: ${response.status} ${await response.text()}`);
  }

  return response;
}

async function ensureRealm() {
  const token = await getAdminToken();
  const getResponse = await fetch(`${keycloakOrigin}/admin/realms/${encodeURIComponent(realmName)}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (getResponse.ok) {
    return;
  }

  if (getResponse.status !== 404) {
    throw new Error(`Cannot inspect realm ${realmName}: ${getResponse.status} ${await getResponse.text()}`);
  }

  const createResponse = await fetch(`${keycloakOrigin}/admin/realms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      realm: realmName,
      enabled: true,
      loginWithEmailAllowed: true,
      duplicateEmailsAllowed: false,
      resetPasswordAllowed: true
    })
  });

  if (!createResponse.ok) {
    throw new Error(`Cannot create realm ${realmName}: ${createResponse.status} ${await createResponse.text()}`);
  }
}

async function ensureClient() {
  const searchUrl = adminUrl("clients");
  searchUrl.searchParams.set("clientId", webClientId);
  const response = await keycloakRequest(searchUrl);
  const clients = (await response.json()) as KeycloakClient[];
  const payload = {
    clientId: webClientId,
    name: "Helios Office Web",
    enabled: true,
    protocol: "openid-connect",
    publicClient: false,
    secret: webClientSecret,
    standardFlowEnabled: true,
    directAccessGrantsEnabled: true,
    redirectUris: webOrigins.map((origin) => `${origin}/api/auth/callback`),
    webOrigins,
    attributes: {
      "post.logout.redirect.uris": webOrigins.map((origin) => `${origin}/login`).join("##")
    }
  };

  if (clients[0]?.id) {
    await keycloakRequest(`clients/${encodeURIComponent(clients[0].id)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    return;
  }

  await keycloakRequest("clients", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function ensureRealmRole(name: string): Promise<KeycloakRole> {
  const response = await fetch(adminUrl(`roles/${encodeURIComponent(name)}`), {
    headers: {
      Authorization: `Bearer ${await getAdminToken()}`
    }
  });

  if (response.ok) {
    return response.json() as Promise<KeycloakRole>;
  }

  if (response.status !== 404) {
    throw new Error(`Cannot read role ${name}: ${response.status} ${await response.text()}`);
  }

  await keycloakRequest("roles", {
    method: "POST",
    body: JSON.stringify({ name })
  });

  const retry = await keycloakRequest(`roles/${encodeURIComponent(name)}`);
  return retry.json() as Promise<KeycloakRole>;
}

async function setRealmRoles(userId: string, roleNames: string[]) {
  const desiredRoleNames = Array.from(new Set(roleNames.filter(Boolean)));
  const desiredRoles = await Promise.all(desiredRoleNames.map((roleName) => ensureRealmRole(roleName)));
  const managedRoles = await Promise.all(["system_admin", "user"].map((roleName) => ensureRealmRole(roleName)));
  const removeRoles = managedRoles.filter((role) => !desiredRoleNames.includes(role.name));

  if (removeRoles.length > 0) {
    await keycloakRequest(`users/${encodeURIComponent(userId)}/role-mappings/realm`, {
      method: "DELETE",
      body: JSON.stringify(removeRoles)
    });
  }

  if (desiredRoles.length > 0) {
    await keycloakRequest(`users/${encodeURIComponent(userId)}/role-mappings/realm`, {
      method: "POST",
      body: JSON.stringify(desiredRoles)
    });
  }
}

async function findUser(username: string, email: string) {
  const token = await getAdminToken();

  for (const query of [{ username, exact: "true" }, { email, exact: "true" }]) {
    const url = adminUrl("users");

    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Cannot search users: ${response.status} ${await response.text()}`);
    }

    const users = (await response.json()) as KeycloakUser[];

    if (users[0]) {
      return users[0];
    }
  }

  return null;
}

async function ensureUser(account: (typeof userAccounts)[number]) {
  const dbAccount = await prisma.userAccount.findUnique({
    where: { email: account.email },
    select: {
      email: true,
      displayName: true,
      adminRole: true,
      accountStatus: true
    }
  });
  const email = dbAccount?.email ?? account.email;
  const displayName = dbAccount?.displayName ?? account.displayName;
  const roleName = dbAccount?.adminRole ?? account.role;
  const status = dbAccount?.accountStatus ?? account.status;
  const username = email.split("@")[0].toLowerCase();
  const existing = await findUser(username, email);
  const enabled = status === "active";
  const profile = splitDisplayName(displayName);
  const payload = {
    username,
    email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    enabled,
    emailVerified: true,
    requiredActions: []
  };
  let id = existing?.id;

  if (id) {
    await keycloakRequest(`users/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  } else {
    const response = await keycloakRequest("users", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const location = response.headers.get("location");
    id = location?.split("/").pop() ?? (await findUser(username, account.email))?.id;
  }

  if (!id) {
    throw new Error(`Cannot resolve Keycloak user for ${account.email}`);
  }

  await keycloakRequest(`users/${encodeURIComponent(id)}/reset-password`, {
    method: "PUT",
    body: JSON.stringify({
      type: "password",
      value: seedPassword,
      temporary: false
    })
  });

  await setRealmRoles(id, [roleName]);

  await prisma.userAccount.updateMany({
    where: { email },
    data: { keycloakUserId: id }
  });

  return { id, username, email, role: roleName, enabled };
}

async function main() {
  await ensureRealm();
  await ensureClient();
  await ensureRealmRole("system_admin");
  await ensureRealmRole("user");

  const users = [];

  for (const account of userAccounts) {
    users.push(await ensureUser(account));
  }

  console.log(
    JSON.stringify(
      {
        realm: realmName,
        clientId: webClientId,
        seededUsers: users.map((user) => ({
          email: user.email,
          enabled: user.enabled,
          role: user.role,
          username: user.username
        }))
      },
      null,
      2
    )
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
