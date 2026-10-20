import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/common/prisma/prisma.service";
import { AuthService } from "../src/modules/auth/auth.service";
import type { AuthenticatedUser } from "../src/modules/auth/auth.types";

// Boots the real AppModule so every registered route is covered, including routes added later.
// Only the database and Keycloak signature verification are replaced.

const SYNC_TOKEN = "e2e-attendance-sync-token";

// Routes that authenticate without a user session. Adding to this list must be a deliberate decision.
const PUBLIC_ROUTES = new Set(["POST /api/v1/attendance/sync", "GET /api/v1/health"]);

type Route = { method: string; path: string };

type FakeAccount = {
  id: string;
  adminRole: "system_admin" | "user";
  permissions: string[];
};

const accounts: Record<string, FakeAccount> = {
  "token-no-permissions": { id: "acc-none", adminRole: "user", permissions: [] },
  "token-payroll-viewer": { id: "acc-payroll", adminRole: "user", permissions: ["permission.payroll.view"] },
  "token-approval-viewer": { id: "acc-approval-view", adminRole: "user", permissions: ["permission.approvals.view"] },
  "token-approval-manager": { id: "acc-approval-manage", adminRole: "user", permissions: ["permission.approvals.manage"] },
  "token-hr-dashboard": { id: "acc-hr", adminRole: "user", permissions: ["hr.dashboard.requests.view"] },
  "token-system-admin": { id: "acc-admin", adminRole: "system_admin", permissions: [] }
};

const accountsById = new Map(Object.values(accounts).map((account) => [account.id, account]));

// Any model method resolves to an empty result, so handlers reached by an authorized request
// return 200/404 instead of touching a real database.
function createPrismaStub() {
  const userAccount = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      const account = accountsById.get(where.id);
      return account
        ? {
            id: account.id,
            adminRole: account.adminRole,
            accountStatus: "active",
            customPermissionsEnabled: false,
            customPermissions: null,
            permissionGroup: { status: "active", permissions: account.permissions }
          }
        : null;
    }
  };
  const permissionDefinition = {
    findMany: async () => [...new Set(Object.values(accounts).flatMap((account) => account.permissions))].map((key) => ({ key }))
  };
  const emptyModel = new Proxy({}, {
    get: (_target, method) => (method === "count" ? async () => 0 : method.toString().startsWith("findMany") ? async () => [] : async () => null)
  });

  return new Proxy(
    { userAccount, permissionDefinition, $connect: async () => undefined, $disconnect: async () => undefined },
    { get: (target, key) => (key in target ? target[key as keyof typeof target] : key === "then" ? undefined : emptyModel) }
  );
}

function fakeUser(token: string): AuthenticatedUser {
  const account = accounts[token];
  return {
    sub: account.id,
    roles: [],
    claims: {},
    account: {
      id: account.id,
      email: `${account.id}@helios.test`,
      displayName: account.id,
      employeeId: null,
      adminRole: account.adminRole,
      accountStatus: "active",
      effectivePermissionKeys: account.permissions
    }
  };
}

function listRoutes(app: INestApplication): Route[] {
  const expressApp = app.getHttpAdapter().getInstance();
  const stack = (expressApp.router ?? expressApp._router)?.stack ?? [];

  return stack
    .filter((layer: { route?: unknown }) => layer.route)
    .flatMap((layer: { route: { path: string; methods: Record<string, boolean> } }) =>
      Object.keys(layer.route.methods)
        .filter((method) => method !== "_all")
        .map((method) => ({ method: method.toUpperCase(), path: layer.route.path }))
    );
}

const concretePath = (path: string) => path.replace(/:[A-Za-z0-9_]+/g, "e2e-id");

describe("API authentication and permissions (e2e)", () => {
  let app: INestApplication;
  let routes: Route[];

  beforeAll(async () => {
    process.env.ATTENDANCE_SYNC_TOKEN = SYNC_TOKEN;
    // Nothing listens on port 9, so JWKS lookups fail deterministically regardless of local Keycloak.
    process.env.KEYCLOAK_ISSUER = "http://127.0.0.1:9/realms/helios-e2e";
    process.env.KEYCLOAK_ISSUERS = "";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(createPrismaStub())
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    const authService = app.get(AuthService);
    const verify = authService.verifyAuthorizationHeader.bind(authService);
    jest.spyOn(authService, "verifyAuthorizationHeader").mockImplementation(async (header) => {
      const token = typeof header === "string" ? header.replace(/^Bearer\s+/i, "") : "";
      return token in accounts ? fakeUser(token) : verify(header);
    });

    routes = listRoutes(app);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("discovers the registered routes", () => {
    expect(routes.length).toBeGreaterThan(50);
  });

  it("rejects every non-public route without a token (401)", async () => {
    const failures: string[] = [];

    for (const route of routes) {
      const key = `${route.method} ${route.path}`;
      if (PUBLIC_ROUTES.has(key)) continue;

      const response = await request(app.getHttpServer())[route.method.toLowerCase() as "get"](concretePath(route.path));
      if (response.status !== 401) failures.push(`${key} → ${response.status}`);
    }

    expect(failures).toEqual([]);
  });

  it("only exposes the intended public routes", () => {
    const registered = new Set(routes.map((route) => `${route.method} ${route.path}`));
    for (const route of PUBLIC_ROUTES) expect(registered.has(route)).toBe(true);
  });

  it("answers a malformed token with 401, not 500", async () => {
    await request(app.getHttpServer()).get("/api/v1/auth/me").set("Authorization", "Bearer not-a-jwt").expect(401);
  });

  it("answers 503, not 500, when Keycloak cannot be reached to verify a token", async () => {
    const wellFormedJwt = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImUyZSJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl";
    await request(app.getHttpServer()).get("/api/v1/auth/me").set("Authorization", `Bearer ${wellFormedJwt}`).expect(503);
  });

  it("protects attendance sync with the machine token instead of a session", async () => {
    const server = app.getHttpServer();
    await request(server).post("/api/v1/attendance/sync").send({}).expect(401);
    await request(server).post("/api/v1/attendance/sync").set("Authorization", "Bearer token-system-admin").send({}).expect(401);
    const accepted = await request(server).post("/api/v1/attendance/sync").set("Authorization", `Bearer ${SYNC_TOKEN}`).send({});
    expect([401, 403]).not.toContain(accepted.status);
  });

  describe("permission rules for routes guarded in Phase 0", () => {
    const cases: Array<{ method: "get" | "post"; path: string; allowed: string[]; denied: string[] }> = [
      {
        method: "get",
        path: "/api/v1/payroll-cycles",
        allowed: ["token-payroll-viewer", "token-system-admin"],
        denied: ["token-no-permissions", "token-approval-manager"]
      },
      {
        method: "get",
        path: "/api/v1/payroll-cycles/workflow",
        allowed: ["token-payroll-viewer"],
        denied: ["token-no-permissions"]
      },
      {
        method: "get",
        path: "/api/v1/approvals",
        allowed: ["token-approval-viewer", "token-approval-manager"],
        denied: ["token-no-permissions", "token-payroll-viewer"]
      },
      {
        method: "post",
        path: "/api/v1/approvals/e2e-id/decision",
        allowed: ["token-approval-manager", "token-system-admin"],
        denied: ["token-approval-viewer", "token-no-permissions"]
      },
      {
        method: "get",
        path: "/api/v1/leave-requests",
        allowed: ["token-hr-dashboard", "token-system-admin"],
        denied: ["token-no-permissions", "token-payroll-viewer"]
      },
      {
        method: "get",
        path: "/api/v1/audit-logs",
        allowed: ["token-system-admin"],
        denied: ["token-no-permissions", "token-payroll-viewer", "token-approval-manager"]
      },
      {
        method: "get",
        path: "/api/v1/posts",
        allowed: ["token-no-permissions"],
        denied: []
      },
      {
        method: "get",
        path: "/api/v1/announcements",
        allowed: ["token-no-permissions"],
        denied: []
      },
      {
        method: "get",
        path: "/api/v1/notifications/unread",
        allowed: ["token-no-permissions"],
        denied: []
      }
    ];

    for (const testCase of cases) {
      it(`${testCase.method.toUpperCase()} ${testCase.path}`, async () => {
        const server = app.getHttpServer();
        const body = testCase.method === "post" ? { decision: "approved" } : undefined;

        for (const token of testCase.denied) {
          const response = await request(server)[testCase.method](testCase.path).set("Authorization", `Bearer ${token}`).send(body);
          expect({ token, status: response.status }).toEqual({ token, status: 403 });
        }

        for (const token of testCase.allowed) {
          const response = await request(server)[testCase.method](testCase.path).set("Authorization", `Bearer ${token}`).send(body);
          expect({ token, allowed: ![401, 403].includes(response.status) }).toEqual({ token, allowed: true });
        }
      });
    }
  });
});
