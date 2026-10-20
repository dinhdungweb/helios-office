import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { PostsService } from "./posts.service";

// Any signed-in user; enforced by the global JwtAuthGuard.
@ApiTags("posts")
@ApiBearerAuth()
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOkResponse({ description: "Intranet feed posts." })
  findFeed() {
    return this.postsService.findFeed();
  }
}
