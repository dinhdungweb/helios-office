import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import { CurrentUser } from "../../modules/auth/current-user.decorator";
import { CommitImportDto, CreateExportDto, CreateImportDto } from "./import-export.dto";
import { ImportExportRegistry } from "./import-export.registry";
import { ImportsService } from "./imports.service";
import { ExportsService } from "./exports.service";
import { XLSX_MIME_TYPE } from "./spreadsheet";

// Any signed-in user (global JwtAuthGuard); the permission each type needs is checked by the
// services against the type's handler. Jobs are visible to their creator only.
@ApiTags("imports")
@ApiBearerAuth()
@Controller("imports")
export class ImportsController {
  constructor(
    private readonly imports: ImportsService,
    private readonly registry: ImportExportRegistry
  ) {}

  @Get("types")
  @ApiOkResponse({ description: "Import types the caller may use, with their columns." })
  types(@CurrentUser() user: AuthenticatedUser) {
    return this.registry.available(user).imports;
  }

  @Get("templates/:type")
  @ApiOkResponse({ description: "Empty .xlsx template with the type's headers and an example row." })
  async template(@CurrentUser() user: AuthenticatedUser, @Param("type") type: string, @Res() response: Response) {
    const { fileName, body } = await this.imports.template(user, type);
    response.setHeader("Content-Type", XLSX_MIME_TYPE);
    response.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    response.send(body);
  }

  @Post()
  @ApiOkResponse({ description: "Starts validating an uploaded file; poll GET /imports/:id." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateImportDto) {
    return this.imports.create(user, body);
  }

  @Get(":id")
  @ApiOkResponse({ description: "Status, row errors and a preview of the valid rows." })
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.imports.get(user, id);
  }

  @Post(":id/commit")
  @ApiOkResponse({ description: "Writes the valid rows; 409 when there are errors and skipInvalid is not set." })
  commit(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() body: CommitImportDto) {
    return this.imports.commit(user, id, body.skipInvalid ?? false);
  }
}

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
