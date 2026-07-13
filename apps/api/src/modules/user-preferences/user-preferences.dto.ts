import { ApiProperty } from "@nestjs/swagger";
import { Allow, IsDefined } from "class-validator";

export class UpdateUserPreferenceDto {
  @ApiProperty({
    description: "JSON value stored for this user preference scope.",
    example: { menuKeys: ["home", "loans"] }
  })
  @Allow()
  @IsDefined()
  value!: unknown;
}
