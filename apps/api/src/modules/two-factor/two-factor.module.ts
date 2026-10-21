import { Module } from "@nestjs/common";
import { SettingsSecretService } from "../../common/settings-secret.service";
import { AdminSettingsModule } from "../admin-settings/admin-settings.module";
import { AuthModule } from "../auth/auth.module";
import { TwoFactorController } from "./two-factor.controller";
import { TwoFactorService } from "./two-factor.service";

@Module({
  imports: [AuthModule, AdminSettingsModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService, SettingsSecretService],
  exports: [TwoFactorService]
})
export class TwoFactorModule {}
