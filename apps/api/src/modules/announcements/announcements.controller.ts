import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AnnouncementsService } from "./announcements.service";

// Any signed-in user; enforced by the global JwtAuthGuard.
@ApiTags("announcements")
@ApiBearerAuth()
@Controller("announcements")
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @ApiOkResponse({ description: "Company announcements with read tracking." })
  findAll() {
    return this.announcementsService.findAll();
  }
}
