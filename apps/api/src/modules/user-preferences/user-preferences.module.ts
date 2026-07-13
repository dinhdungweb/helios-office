import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserPreferencesController } from "./user-preferences.controller";
import { UserPreferencesService } from "./user-preferences.service";

@Module({
  imports: [AuthModule],
  controllers: [UserPreferencesController],
  providers: [UserPreferencesService],
  exports: [UserPreferencesService]
})
export class UserPreferencesModule {}
