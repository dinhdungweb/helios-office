import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdateUserPreferenceDto } from "./user-preferences.dto";
import { UserPreferencesService } from "./user-preferences.service";

@ApiTags("user-preferences")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("user-preferences")
export class UserPreferencesController {
  constructor(private readonly userPreferencesService: UserPreferencesService) {}

  @Get(":scope")
  @ApiOkResponse({ description: "Current account preference for a UI scope." })
  find(@Param("scope") scope: string, @CurrentUser() user: AuthenticatedUser) {
    return this.userPreferencesService.find(user.account!.id, scope);
  }

  @Patch(":scope")
  @ApiOkResponse({ description: "Create or update current account preference for a UI scope." })
  update(
    @Param("scope") scope: string,
    @Body() body: UpdateUserPreferenceDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.userPreferencesService.update(user.account!.id, scope, body);
  }

  @Delete(":scope")
  @ApiOkResponse({ description: "Remove current account preference for a UI scope." })
  remove(@Param("scope") scope: string, @CurrentUser() user: AuthenticatedUser) {
    return this.userPreferencesService.remove(user.account!.id, scope);
  }
}
