import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, Matches } from "class-validator";

// POST /attendance/reminders/run: the work date to remind about, yesterday when left out.
export class RunReminderDto {
  @ApiPropertyOptional({ example: "2026-10-22" })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Ngày phải có dạng YYYY-MM-DD." })
  date?: string;
}
