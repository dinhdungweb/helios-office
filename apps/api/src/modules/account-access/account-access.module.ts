import { Module } from "@nestjs/common";
import { AdminSettingsModule } from "../admin-settings/admin-settings.module";
import { AuthModule } from "../auth/auth.module";
import { AccountAccessController } from "./account-access.controller";
import { AccountAccessService } from "./account-access.service";
import { AccountPasswordService } from "./account-password.service";
import { AuthPasswordController } from "./auth-password.controller";

@Module({
  imports: [AuthModule, AdminSettingsModule],
  controllers: [AccountAccessController, AuthPasswordController],
  providers: [AccountAccessService, AccountPasswordService],
  exports: [AccountAccessService]
})
export class AccountAccessModule {}
