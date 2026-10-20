import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/app.setup";
import { PrismaService } from "../src/common/prisma/prisma.service";

const LIMIT = 5;

describe("HTTP hardening (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.THROTTLE_LIMIT = String(LIMIT);
    process.env.THROTTLE_TTL_MS = "60000";
    process.env.KEYCLOAK_ISSUER = "http://127.0.0.1:9/realms/helios-e2e";

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $connect: async () => undefined, $disconnect: async () => undefined })
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("sends security headers", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/auth/me");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("rate-limits repeated rejected tokens before authentication runs", async () => {
    const server = app.getHttpServer();
    const statuses: number[] = [];

    for (let index = 0; index <= LIMIT; index += 1) {
      const response = await request(server).get("/api/v1/auth/me").set("Authorization", "Bearer not-a-jwt");
      statuses.push(response.status);
    }

    expect(statuses.slice(0, LIMIT)).toEqual(Array(LIMIT).fill(401));
    expect(statuses[LIMIT]).toBe(429);
  });

  it("counts quotas per session, not per shared server IP", async () => {
    const server = app.getHttpServer();
    // A different bearer token from the same IP starts with its own quota.
    const response = await request(server).get("/api/v1/auth/me").set("Authorization", "Bearer another-session");
    expect(response.status).toBe(401);
  });
});
