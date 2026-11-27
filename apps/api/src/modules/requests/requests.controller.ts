import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CommentDto, CreateRequestDto, ReasonDto, RequestListQueryDto, UpdateRequestDto } from "./requests.dto";
import { RequestsService } from "./requests.service";

// Anyone signed in creates and follows their own requests; seeing other people's needs
// permission.requests.view, checked per request in the service (docs/design/approval-engine.md §10).
@ApiTags("requests")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("requests")
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get()
  @ApiOkResponse({ description: "Requests by box: mine, to_approve, processed, following, all (HR, data scope) (LV-03)." })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: RequestListQueryDto) {
    return this.requests.list(user, query);
  }

  @Get("types")
  @ApiOkResponse({ description: "Request types that can be created, with the fields workflow conditions can use." })
  types() {
    return this.requests.types();
  }

  @Get(":id")
  @ApiOkResponse({ description: "Request detail with steps and what the viewer may do (LV-04)." })
  detail(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.requests.detail(user, id);
  }

  @Post()
  @ApiOkResponse({ description: "Create a request; submit: true sends it for approval (LV-02)." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRequestDto) {
    return this.requests.create(user, dto);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Edit a draft or returned request (LV-05)." })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateRequestDto) {
    return this.requests.update(user, id, dto);
  }

  @Post(":id/submit")
  @ApiOkResponse({ description: "Send a draft or returned request for approval (LV-02)." })
  submit(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.requests.submit(user, id);
  }

  @Post(":id/recall")
  @ApiOkResponse({ description: "Take a pending request back to draft while nobody acted on it (LV-06)." })
  recall(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.requests.recall(user, id);
  }

  @Post(":id/cancel")
  @ApiOkResponse({ description: "Cancel a request; an approved one only by HR, with a reason (LV-06)." })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: ReasonDto) {
    return this.requests.cancel(user, id, dto.reason);
  }

  @Get(":id/comments")
  @ApiOkResponse({ description: "Comments on a request (LV-07)." })
  comments(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.requests.comments(user, id);
  }

  @Post(":id/comments")
  @ApiOkResponse({ description: "Comment on a request (LV-07)." })
  addComment(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CommentDto) {
    return this.requests.addComment(user, id, dto.body);
  }
}
