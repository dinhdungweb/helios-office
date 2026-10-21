import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { SkipAudit } from "../../common/audit/skip-audit.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { NotificationQueryDto } from "./notifications.dto";
import { NotificationsService } from "./notifications.service";

// Every route works on the signed-in account's own inbox (enforced by the global JwtAuthGuard);
// there is no way to read someone else's notifications.
@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOkResponse({ description: "My notifications, newest first; ?unread=true for unread only." })
  findMine(@CurrentUser() user: AuthenticatedUser, @Query() query: NotificationQueryDto) {
    return this.notificationsService.list(accountIdOf(user), query);
  }

  @Get("unread-count")
  @ApiOkResponse({ description: "Number of unread notifications, for the header badge." })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.unreadCount(accountIdOf(user));
  }

  @Get("unread")
  @ApiOkResponse({ description: "My 20 latest unread notifications." })
  findUnread(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.list(accountIdOf(user), { unread: "true", limit: 20 });
  }

  // Reading notifications is not business data; keep it out of the audit trail.
  @Post("read-all")
  @SkipAudit()
  @ApiOkResponse({ description: "Mark all my notifications as read." })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(accountIdOf(user));
  }

  @Post(":id/read")
  @SkipAudit()
  @ApiOkResponse({ description: "Mark one of my notifications as read; 404 for anyone else's." })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.notificationsService.markRead(accountIdOf(user), id);
  }

  // Lets an administrator check the whole pipeline (queue → worker → inbox/realtime/email) on themself.
  @Post("test")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions("system.accounts.manage")
  @ApiOkResponse({ description: "Send a test notification to the calling administrator." })
  sendTest(@CurrentUser() user: AuthenticatedUser) {
    const accountId = accountIdOf(user);
    return this.notificationsService.notify({
      event: "system.test",
      recipients: { accountIds: [accountId] },
      title: "Thông báo thử",
      body: "Hệ thống thông báo đang hoạt động.",
      link: "/user",
      actorAccountId: accountId,
      includeActor: true
    });
  }
}

function accountIdOf(user: AuthenticatedUser) {
  // JwtAuthGuard rejects tokens without a linked active account, so this is always set here.
  return user.account!.id;
}
