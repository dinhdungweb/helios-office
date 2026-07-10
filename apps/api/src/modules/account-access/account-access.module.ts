import { Module } from "@nestjs/common";
import { AccountAccessController } from "./account-access.controller";
import { AccountAccessService } from "./account-access.service";

@Module({
  controllers: [AccountAccessController],
  providers: [AccountAccessService],
  exports: [AccountAccessService]
})
export class AccountAccessModule {}
