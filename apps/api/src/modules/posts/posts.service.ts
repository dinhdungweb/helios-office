import { Injectable } from "@nestjs/common";
import { posts } from "../../common/mock-data";

@Injectable()
export class PostsService {
  findFeed() {
    return posts;
  }
}
