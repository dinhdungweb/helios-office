import { Module } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AdminRoleGuard } from "./admin-role.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminRoleGuard],
  exports: [AuthService, JwtAuthGuard, AdminRoleGuard]
})
export class AuthModule {}
