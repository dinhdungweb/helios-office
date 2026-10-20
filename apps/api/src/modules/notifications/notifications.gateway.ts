import { Logger } from "@nestjs/common";
import { OnGatewayInit, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Namespace, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service";
import { accountRoom, NOTIFICATIONS_NAMESPACE } from "./notification-realtime";

// Realtime notifications (CORE-17). Clients connect with `auth: { token: <access token> }`. The token
// is verified in handshake middleware, so an unauthenticated socket is refused with a connect_error
// and never opens. An accepted socket joins its account's room. Clients only listen — events come
// from the worker through the Redis adapter. Cookies are not used, so CORS credentials stay off.
@WebSocketGateway({
  namespace: NOTIFICATIONS_NAMESPACE,
  cors: { origin: true, credentials: false }
})
export class NotificationsGateway implements OnGatewayInit {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server!: Namespace;

  constructor(private readonly auth: AuthService) {}

  afterInit(namespace: Namespace) {
    namespace.use((socket, next) => {
      this.authenticate(socket).then(
        () => next(),
        (error: Error) => {
          this.logger.debug(`Rejected socket ${socket.id}: ${error.message}`);
          next(new Error("Unauthorized"));
        }
      );
    });
  }

  private async authenticate(socket: Socket) {
    const token = handshakeToken(socket);
    const user = await this.auth.verifyAuthorizationHeader(token ? `Bearer ${token}` : undefined);
    const accountId = user.account!.id;
    socket.data.accountId = accountId;
    await socket.join(accountRoom(accountId));

    // Drop the socket when the access token expires; the client reconnects with a fresh one.
    const expiresAt = typeof user.claims.exp === "number" ? user.claims.exp * 1_000 : null;
    if (expiresAt) {
      setTimeout(() => socket.disconnect(true), Math.max(expiresAt - Date.now(), 0)).unref();
    }
  }
}

function handshakeToken(socket: Socket) {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === "string" && fromAuth.length > 0) return fromAuth;

  const header = socket.handshake.headers.authorization;
  return typeof header === "string" ? header.replace(/^Bearer\s+/i, "") : undefined;
}
