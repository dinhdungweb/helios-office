import { INestApplication, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AddressInfo } from "node:net";
import { io, type Socket } from "socket.io-client";
import { AuthService } from "../src/modules/auth/auth.service";
import { accountRoom, NOTIFICATION_CREATED_EVENT } from "../src/modules/notifications/notification-realtime";
import { NotificationsGateway } from "../src/modules/notifications/notifications.gateway";
import { TwoFactorGateService } from "../src/modules/auth/two-factor-gate.service";

// Real Socket.IO server + client: handshake authentication and per-account rooms (CORE-17).

const tokens: Record<string, string> = { "token-a": "acc-a", "token-b": "acc-b", "token-no-2fa": "acc-no-2fa" };

const authStub = {
  verifyAuthorizationHeader: async (header?: string) => {
    const accountId = tokens[(header ?? "").replace(/^Bearer\s+/i, "")];
    if (!accountId) throw new UnauthorizedException("Access token is invalid or expired");
    return { sub: accountId, roles: [], claims: { exp: Math.floor(Date.now() / 1000) + 300 }, account: { id: accountId } };
  }
};

// acc-no-2fa stands for a session that has not passed the enforced second factor (AU-18).
const twoFactorGateStub = {
  check: async (user: { account: { id: string } }) => {
    if (user.account.id === "acc-no-2fa") throw new UnauthorizedException("two_factor_required");
  }
};

describe("Notifications gateway (e2e)", () => {
  let app: INestApplication;
  let url: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: AuthService, useValue: authStub },
        { provide: TwoFactorGateService, useValue: twoFactorGateStub }
      ]
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.listen(0, "127.0.0.1");
    url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/notifications`;
  });

  afterEach(() => {
    sockets.splice(0).forEach((socket) => socket.disconnect());
  });

  afterAll(async () => {
    await app?.close();
  });

  function connect(token?: string) {
    const socket = io(url, { auth: token ? { token } : {}, transports: ["websocket"], reconnection: false });
    sockets.push(socket);
    return socket;
  }

  // Resolves with the auth error the server sends before closing, or "connected" if it stays open.
  function outcome(socket: Socket) {
    return new Promise<string>((resolve) => {
      socket.on("auth.error", (payload: { message: string }) => resolve(`rejected: ${payload.message}`));
      socket.on("connect", () => setTimeout(() => resolve(socket.connected ? "connected" : "dropped"), 300));
      socket.on("connect_error", (error) => resolve(`connect_error: ${error.message}`));
    });
  }

  it("refuses a socket without a token at the handshake (never connects)", async () => {
    expect(await outcome(connect())).toBe("connect_error: Unauthorized");
  });

  it("refuses a socket with an invalid token at the handshake", async () => {
    expect(await outcome(connect("not-a-token"))).toBe("connect_error: Unauthorized");
  });

  it("refuses a session that has not passed enforced 2FA", async () => {
    expect(await outcome(connect("token-no-2fa"))).toBe("connect_error: Unauthorized");
  });

  it("accepts a valid token and delivers only the account's own events", async () => {
    const socketA = connect("token-a");
    const socketB = connect("token-b");
    expect(await Promise.all([outcome(socketA), outcome(socketB)])).toEqual(["connected", "connected"]);

    const receivedByA: unknown[] = [];
    const receivedByB: unknown[] = [];
    socketA.on(NOTIFICATION_CREATED_EVENT, (payload) => receivedByA.push(payload));
    socketB.on(NOTIFICATION_CREATED_EVENT, (payload) => receivedByB.push(payload));

    app.get(NotificationsGateway).server.to(accountRoom("acc-a")).emit(NOTIFICATION_CREATED_EVENT, { id: "n1", title: "Hello A" });
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(receivedByA).toEqual([{ id: "n1", title: "Hello A" }]);
    expect(receivedByB).toEqual([]);
  });
});
