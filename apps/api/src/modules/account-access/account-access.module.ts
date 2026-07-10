import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AccountAccessController } from "./account-access.controller";
import { AccountAccessService } from "./account-access.service";

@Module({
  imports: [AuthModule],
  controllers: [AccountAccessController],
  providers: [AccountAccessService],
  exports: [AccountAccessService]
})
export class AccountAccessModule {}
