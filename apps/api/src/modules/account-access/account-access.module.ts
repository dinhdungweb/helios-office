import { Module } from "@nestjs/common";
import { AdminSettingsModule } from "../admin-settings/admin-settings.module";
import { AuthModule } from "../auth/auth.module";
import { AccountAccessController } from "./account-access.controller";
import { AccountAccessService } from "./account-access.service";

@Module({
  imports: [AuthModule, AdminSettingsModule],
  controllers: [AccountAccessController],
  providers: [AccountAccessService],
  exports: [AccountAccessService]
})
export class AccountAccessModule {}
