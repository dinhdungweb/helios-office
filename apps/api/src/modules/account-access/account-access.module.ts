import { Module } from "@nestjs/common";
import { AdminSettingsModule } from "../admin-settings/admin-settings.module";
import { AuthModule } from "../auth/auth.module";
import { TwoFactorModule } from "../two-factor/two-factor.module";
import { AccountAccessController } from "./account-access.controller";
import { AccountAccessService } from "./account-access.service";
import { AccountPasswordService } from "./account-password.service";
import { AuthPasswordController } from "./auth-password.controller";
import { AuthSessionsController } from "./auth-sessions.controller";
import { LoginActivityService } from "./login-activity.service";
import { WebServiceGuard } from "./web-service.guard";

@Module({
  imports: [AuthModule, AdminSettingsModule, TwoFactorModule],
  controllers: [AccountAccessController, AuthPasswordController, AuthSessionsController],
  providers: [AccountAccessService, AccountPasswordService, LoginActivityService, WebServiceGuard],
  exports: [AccountAccessService]
})
export class AccountAccessModule {}
