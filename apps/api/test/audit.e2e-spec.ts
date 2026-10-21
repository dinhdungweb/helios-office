import { BadRequestException, Body, Controller, Get, Global, INestApplication, Injectable, Module, Param, Patch, Post } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AuditModule } from "../src/common/audit/audit.module";
import { AuditService } from "../src/common/audit/audit.service";
import { SkipAudit } from "../src/common/audit/skip-audit.decorator";
import { PrismaService } from "../src/common/prisma/prisma.service";

// Exercises AuditInterceptor + AuditService in a small app: request context on domain entries,
// the HTTP safety net, and the cases that must not write anything.

type AuditData = Record<string, unknown>;
const written: AuditData[] = [];

const prismaFake = {
  auditLog: {
    create: async ({ data }: { data: AuditData }) => {
      written.push(data);
      return data;
    }
  }
};

@Global()
@Module({ providers: [{ provide: PrismaService, useValue: prismaFake }], exports: [PrismaService] })
class FakePrismaModule {}

@Injectable()
class WidgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  // Mirrors how domain services write audit entries.
  async rename(id: string, name: string) {
    await this.prisma.auditLog.create({
      data: { ...this.audit.contextFields(), action: "widget.rename", entityType: "Widget", entityId: id, afterValue: { name } }
    });
    return { id, name };
  }
}

@Controller("widgets")
class WidgetController {
  constructor(private readonly widgets: WidgetService) {}

  @Get(":id")
  read(@Param("id") id: string) {
    return { id };
  }

  @Patch(":id")
  rename(@Param("id") id: string, @Body() body: { name: string }) {
    return this.widgets.rename(id, body.name);
  }

  @Post(":id/archive")
  archive(@Param("id") id: string) {
    return { id, archived: true };
  }

  @Post("preferences")
  @SkipAudit()
  savePreference() {
    return { ok: true };
  }

  @Post("broken")
  broken() {
    throw new BadRequestException("nope");
  }
}

describe("Audit trail (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [FakePrismaModule, AuditModule],
      controllers: [WidgetController],
      providers: [WidgetService]
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    // Stand-in for JwtAuthGuard: the interceptor reads the signed-in account from request.user.
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = { account: { id: "acc-1", employeeId: "emp-1" } };
      next();
    });
    await app.init();
  });

  beforeEach(() => {
    written.length = 0;
  });

  afterAll(async () => {
    await app?.close();
  });

  const server = () => app.getHttpServer();

  it("fills actor, IP, user agent and request id into domain entries and writes no extra HTTP entry", async () => {
    const response = await request(server())
      .patch("/widgets/w1")
      .set("User-Agent", "audit-test")
      .set("X-Request-Id", "req-123")
      .send({ name: "Renamed" })
      .expect(200);

    expect(response.headers["x-request-id"]).toBe("req-123");
    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      action: "widget.rename",
      actorAccountId: "acc-1",
      userAgent: "audit-test",
      requestId: "req-123"
    });
    expect(written[0].ipAddress).toBeTruthy();
  });

  it("writes an HTTP safety-net entry for a mutation that recorded nothing, without body values", async () => {
    await request(server()).post("/widgets/w2/archive").send({ password: "secret", reason: "old" }).expect(201);

    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      source: "http",
      action: "http.post",
      entityType: "Widget",
      entityId: "w2",
      actorAccountId: "acc-1",
      actorId: "emp-1"
    });
    expect(written[0].afterValue).toMatchObject({ route: "/widgets/:id/archive", bodyFields: ["password", "reason"], statusCode: 201 });
    expect(JSON.stringify(written[0])).not.toContain("secret");
  });

  it("does not audit reads", async () => {
    await request(server()).get("/widgets/w3").expect(200);
    expect(written).toHaveLength(0);
  });

  it("does not audit routes marked @SkipAudit", async () => {
    await request(server()).post("/widgets/preferences").send({ theme: "dark" }).expect(201);
    expect(written).toHaveLength(0);
  });

  it("does not audit failed mutations", async () => {
    await request(server()).post("/widgets/broken").expect(400);
    expect(written).toHaveLength(0);
  });

  it("generates a request id when the client sends none", async () => {
    const response = await request(server()).post("/widgets/w4/archive").expect(201);
    expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(written[0].requestId).toBe(response.headers["x-request-id"]);
  });
});
