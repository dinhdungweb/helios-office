import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server } from "socket.io";

// Realtime channel for notifications. Clients only listen; the demo "notification.preview"
// handler that let any client broadcast to everyone was removed. Handshake authentication and
// per-account rooms arrive with CORE-17.
@WebSocketGateway({
  namespace: "notifications",
  cors: {
    origin: true,
    credentials: true
  }
})
export class NotificationsGateway {
  @WebSocketServer()
  server!: Server;
}
