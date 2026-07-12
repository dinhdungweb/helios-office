import { Module } from "@nestjs/common";
import { SettingsSecretService } from "../../common/settings-secret.service";
import { AuthModule } from "../auth/auth.module";
import { AdminSettingsController } from "./admin-settings.controller";
import { AdminSettingsService } from "./admin-settings.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminSettingsController],
  providers: [AdminSettingsService, SettingsSecretService],
  exports: [AdminSettingsService]
})
export class AdminSettingsModule {}
