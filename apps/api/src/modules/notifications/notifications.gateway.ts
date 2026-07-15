import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import type { Server } from "socket.io";
import { NotificationsService } from "./notifications.service";

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

  constructor(private readonly notificationsService: NotificationsService) {}

  @SubscribeMessage("notification.preview")
  preview(@MessageBody() body: { event?: string; title?: string }) {
    const payload = this.notificationsService.buildEventPayload(
      body.event ?? "notification.created",
      body.title ?? "Thông báo mới"
    );
    this.server.emit(payload.event, payload);
    return payload;
  }
}
