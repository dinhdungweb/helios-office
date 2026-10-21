import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { AuditLogQueryDto } from "./audit-logs.dto";
import { AuditLogsService } from "./audit-logs.service";

@ApiTags("audit-logs")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions("system.accounts.manage")
@ApiBearerAuth()
@Controller("audit-logs")
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  @ApiOkResponse({ description: "Paginated audit trail, newest first by default." })
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogs.findAll(query);
  }

  @Get(":id")
  @ApiOkResponse({ description: "Single audit entry with before/after values." })
  findOne(@Param("id") id: string) {
    return this.auditLogs.findOne(id);
  }
}
