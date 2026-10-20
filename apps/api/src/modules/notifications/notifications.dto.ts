import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { ListQueryDto } from "../../common/pagination/list-query";

export class NotificationQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: ["true", "false"], description: "Only unread notifications when true." })
  @IsOptional()
  @IsIn(["true", "false"])
  unread?: "true" | "false";
}
