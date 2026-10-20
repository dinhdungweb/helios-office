import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import { CurrentUser } from "../../modules/auth/current-user.decorator";
import { ExportsService } from "./exports.service";
import { CreateExportDto } from "./import-export.dto";
import { ImportExportRegistry } from "./import-export.registry";

// Any signed-in user (global JwtAuthGuard); each export type's permission is checked by
// ExportsService against its handler. Jobs are visible to their creator only.
@ApiTags("exports")
@ApiBearerAuth()
@Controller("exports")
export class ExportsController {
  constructor(
    private readonly exports: ExportsService,
    private readonly registry: ImportExportRegistry
  ) {}

  @Get("types")
  @ApiOkResponse({ description: "Export types the caller may use." })
  types(@CurrentUser() user: AuthenticatedUser) {
    return this.registry.available(user).exports;
  }

  @Post()
  @ApiOkResponse({ description: "Starts building the .xlsx within the caller's data scope; poll GET /exports/:id." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateExportDto) {
    return this.exports.create(user, body);
  }

  @Get(":id")
  @ApiOkResponse({ description: "Status and, once ready, a 5-minute download URL." })
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.exports.get(user, id);
  }
}
