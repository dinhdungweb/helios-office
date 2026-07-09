import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AnnouncementsService } from "./announcements.service";

@ApiTags("announcements")
@Controller("announcements")
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  @ApiOkResponse({ description: "Company announcements with read tracking." })
  findAll() {
    return this.announcementsService.findAll();
  }
}
