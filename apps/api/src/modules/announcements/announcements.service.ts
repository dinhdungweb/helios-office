import { Injectable } from "@nestjs/common";
import { announcements } from "../../common/mock-data";

@Injectable()
export class AnnouncementsService {
  findAll() {
    return announcements;
  }
}
