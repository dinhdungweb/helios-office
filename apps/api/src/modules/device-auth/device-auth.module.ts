import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DeviceAuthController, MyDeviceAuthController } from "./device-auth.controller";
import { DeviceAuthService } from "./device-auth.service";

@Module({
  imports: [AuthModule],
  controllers: [DeviceAuthController, MyDeviceAuthController],
  providers: [DeviceAuthService],
  exports: [DeviceAuthService]
})
export class DeviceAuthModule {}
