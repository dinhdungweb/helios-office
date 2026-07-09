import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("unread")
  @ApiQuery({ name: "userId", required: false, example: "emp-001" })
  @ApiOkResponse({ description: "Unread notifications for a user." })
  findUnread(@Query("userId") userId = "emp-001") {
    return this.notificationsService.findUnread(userId);
  }
}
