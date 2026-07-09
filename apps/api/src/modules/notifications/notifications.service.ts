import { Injectable } from "@nestjs/common";
import { notifications } from "../../common/mock-data";

@Injectable()
export class NotificationsService {
  findUnread(userId: string) {
    return notifications.filter((notification) => notification.userId === userId && !notification.readAt);
  }

  buildEventPayload(event: string, title: string) {
    return {
      event,
      title,
      createdAt: new Date().toISOString()
    };
  }
}
