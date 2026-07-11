import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type KeycloakTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type KeycloakUserRepresentation = {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  requiredActions?: string[];
  credentials?: Array<{
    type: "password";
    value: string;
    temporary: boolean;
  }>;
};

type KeycloakRoleRepresentation = {
  id: string;
  name: string;
};

export type ProvisionKeycloakUserInput = {
  email: string;
  displayName: string;
  enabled: boolean;
  initialPassword?: string;
  roles: string[];
  username?: string;
};

export type UpdateKeycloakUserInput = {
  displayName?: string;
  email?: string;
  enabled?: boolean;
  roles?: string[];
};

@Injectable()
export class KeycloakAdminService {
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  async provisionUser(input: ProvisionKeycloakUserInput) {
    const username = this.normalizeUsername(input.username ?? input.email);
    const existing = await this.findUser(username, input.email);
    const profile = this.splitDisplayName(input.displayName);

    if (existing?.id) {
      await this.updateUser(existing.id, {
        displayName: input.displayName,
        email: input.email,
        enabled: input.enabled,
        roles: input.roles
      });

      if (input.initialPassword) {
        await this.setPassword(existing.id, input.initialPassword);
      }

      return { id: existing.id, username };
    }

    const token = await this.getAdminToken();
    const response = await fetch(this.adminUrl("users"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        email: input.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        enabled: input.enabled,
        emailVerified: true,
        requiredActions: [],
        credentials: input.initialPassword
          ? [
              {
                type: "password",
                value: input.initialPassword,
                temporary: false
              }
            ]
          : undefined
      } satisfies KeycloakUserRepresentation)
    });

    if (!response.ok) {
      await this.throwKeycloakError("create user", response);
    }

    const location = response.headers.get("location");
    const id = location?.split("/").pop() ?? (await this.findUser(username, input.email))?.id;

    if (!id) {
      throw new ServiceUnavailableException("Keycloak user was created but could not be resolved");
    }

    await this.setRealmRoles(id, input.roles);

    return { id, username };
  }

  async updateUser(userId: string, input: UpdateKeycloakUserInput) {
    const token = await this.getAdminToken();
    const body: KeycloakUserRepresentation = {};

    if (input.email !== undefined) {
      body.email = input.email;
    }

    if (input.displayName !== undefined) {
      const profile = this.splitDisplayName(input.displayName);
      body.firstName = profile.firstName;
      body.lastName = profile.lastName;
      body.requiredActions = [];
    }

    if (input.enabled !== undefined) {
      body.enabled = input.enabled;
    }

    if (Object.keys(body).length > 0) {
      const response = await fetch(this.adminUrl(`users/${encodeURIComponent(userId)}`), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        await this.throwKeycloakError("update user", response);
      }
    }

    if (input.roles) {
      await this.setRealmRoles(userId, input.roles);
    }
  }

  async setUserEnabled(userId: string, enabled: boolean) {
    await this.updateUser(userId, { enabled });
  }

  private async setPassword(userId: string, password: string) {
    const token = await this.getAdminToken();
    const response = await fetch(this.adminUrl(`users/${encodeURIComponent(userId)}/reset-password`), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "password",
        value: password,
        temporary: false
      })
    });

    if (!response.ok) {
      await this.throwKeycloakError("set user password", response);
    }
  }

  private async findUser(username: string, email: string) {
    const token = await this.getAdminToken();
    const byUsername = await this.searchUsers({ username, exact: "true" }, token);

    if (byUsername[0]) {
      return byUsername[0];
    }

    const byEmail = await this.searchUsers({ email, exact: "true" }, token);
    return byEmail[0] ?? null;
  }

  private async searchUsers(query: Record<string, string>, token: string) {
    const url = this.adminUrl("users");

    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      await this.throwKeycloakError("search users", response);
    }

    return response.json() as Promise<KeycloakUserRepresentation[]>;
  }

  private async setRealmRoles(userId: string, roleNames: string[]) {
    const desiredRoleNames = Array.from(new Set(roleNames.filter(Boolean)));
    const desiredRoles = await Promise.all(desiredRoleNames.map((roleName) => this.ensureRealmRole(roleName)));
    const managedRoles = await Promise.all(["system_admin", "user"].map((roleName) => this.ensureRealmRole(roleName)));
    const token = await this.getAdminToken();

    const removeRoles = managedRoles.filter((role) => !desiredRoleNames.includes(role.name));

    if (removeRoles.length > 0) {
      const removeResponse = await fetch(this.adminUrl(`users/${encodeURIComponent(userId)}/role-mappings/realm`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(removeRoles)
      });

      if (!removeResponse.ok) {
        await this.throwKeycloakError("remove realm roles", removeResponse);
      }
    }

    if (desiredRoles.length > 0) {
      const addResponse = await fetch(this.adminUrl(`users/${encodeURIComponent(userId)}/role-mappings/realm`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(desiredRoles)
      });

      if (!addResponse.ok) {
        await this.throwKeycloakError("assign realm roles", addResponse);
      }
    }
  }

  private async ensureRealmRole(name: string): Promise<KeycloakRoleRepresentation> {
    const token = await this.getAdminToken();
    const getResponse = await fetch(this.adminUrl(`roles/${encodeURIComponent(name)}`), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (getResponse.ok) {
      return getResponse.json() as Promise<KeycloakRoleRepresentation>;
    }

    if (getResponse.status !== 404) {
      await this.throwKeycloakError("read realm role", getResponse);
    }

    const createResponse = await fetch(this.adminUrl("roles"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name })
    });

    if (!createResponse.ok && createResponse.status !== 409) {
      await this.throwKeycloakError("create realm role", createResponse);
    }

    const retryResponse = await fetch(this.adminUrl(`roles/${encodeURIComponent(name)}`), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!retryResponse.ok) {
      await this.throwKeycloakError("read created realm role", retryResponse);
    }

    return retryResponse.json() as Promise<KeycloakRoleRepresentation>;
  }

  private async getAdminToken() {
    const cached = this.tokenCache;
    const now = Date.now();

    if (cached && cached.expiresAt > now + 30_000) {
      return cached.token;
    }

    const body = new URLSearchParams({
      grant_type: "password",
      client_id: this.config.get<string>("KEYCLOAK_ADMIN_CLIENT_ID") || "admin-cli",
      username: this.config.get<string>("KEYCLOAK_ADMIN_USERNAME") || "admin",
      password: this.config.get<string>("KEYCLOAK_ADMIN_PASSWORD") || "admin"
    });
    const response = await fetch(
      `${this.keycloakOrigin()}/realms/${encodeURIComponent(this.adminRealm())}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      }
    );

    if (!response.ok) {
      await this.throwKeycloakError("get admin token", response);
    }

    const tokenSet = (await response.json()) as KeycloakTokenResponse;

    if (!tokenSet.access_token) {
      throw new ServiceUnavailableException("Keycloak admin token response is missing access_token");
    }

    this.tokenCache = {
      token: tokenSet.access_token,
      expiresAt: now + (tokenSet.expires_in ?? 60) * 1000
    };

    return tokenSet.access_token;
  }

  private adminUrl(path: string) {
    return new URL(
      `/admin/realms/${encodeURIComponent(this.realmName())}/${path.replace(/^\/+/, "")}`,
      this.keycloakOrigin()
    );
  }

  private keycloakOrigin() {
    return new URL(this.issuer()).origin;
  }

  private realmName() {
    const pathname = new URL(this.issuer()).pathname;
    const match = pathname.match(/\/realms\/([^/]+)/);

    if (!match) {
      throw new ServiceUnavailableException("KEYCLOAK_ISSUER must include /realms/<realm>");
    }

    return decodeURIComponent(match[1]);
  }

  private adminRealm() {
    return this.config.get<string>("KEYCLOAK_ADMIN_REALM") || "master";
  }

  private issuer() {
    const issuer = this.config.get<string>("KEYCLOAK_ISSUER");

    if (!issuer) {
      throw new ServiceUnavailableException("KEYCLOAK_ISSUER is not configured");
    }

    return issuer.replace(/\/+$/, "");
  }

  private normalizeUsername(value: string) {
    return value.trim().toLowerCase();
  }

  private splitDisplayName(displayName: string) {
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

  private async throwKeycloakError(action: string, response: Response): Promise<never> {
    const body = await response.text().catch(() => "");
    const detail = body ? `: ${body.slice(0, 300)}` : "";
    throw new ServiceUnavailableException(`Keycloak ${action} failed with ${response.status}${detail}`);
  }
}
