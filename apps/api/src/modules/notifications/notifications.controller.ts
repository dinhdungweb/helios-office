import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import { NotificationsService } from "./notifications.service";

// Any signed-in user; enforced by the global JwtAuthGuard.
@ApiTags("notifications")
@ApiBearerAuth()
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
