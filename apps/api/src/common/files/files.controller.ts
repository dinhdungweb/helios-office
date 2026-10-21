import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { AuthenticatedUser } from "../../modules/auth/auth.types";
import { CurrentUser } from "../../modules/auth/current-user.decorator";
import { DirectUploadDto, PresignUploadDto } from "./files.dto";
import { FilesService } from "./files.service";

// Multipart fallback cap; browsers upload larger files straight to storage via /files/presign.
const DIRECT_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

// Any signed-in user (global JwtAuthGuard); what they may do with a file is decided by the purpose's
// FileAccessPolicy inside FilesService.
@ApiTags("files")
@ApiBearerAuth()
@Controller("files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("presign")
  @ApiOkResponse({ description: "Creates a pending file and returns a 10-minute PUT URL to upload it to storage." })
  presign(@CurrentUser() user: AuthenticatedUser, @Body() body: PresignUploadDto) {
    return this.files.presignUpload(user, body);
  }

  @Post(":id/complete")
  @ApiOkResponse({ description: "Confirms the upload after checking size and type in storage." })
  complete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.files.complete(user, id);
  }

  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: DIRECT_UPLOAD_MAX_BYTES, files: 1 } }))
  @ApiOkResponse({ description: "Multipart upload (max 10 MB) for scripts and integrations." })
  upload(@CurrentUser() user: AuthenticatedUser, @Body() body: DirectUploadDto, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("A file part named 'file' is required");
    }
    return this.files.uploadDirect(user, body.purpose, body.ownerId, file);
  }

  @Get(":id")
  @ApiOkResponse({ description: "Redirects (302) to a 5-minute download URL; 404 when missing or not allowed." })
  async download(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Res() response: Response) {
    response.redirect(302, await this.files.downloadUrl(user, id));
  }

  @Delete(":id")
  @ApiOkResponse({ description: "Deletes the file from storage and marks it deleted." })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.files.remove(user, id);
  }
}
