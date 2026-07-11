import { Module } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AdminRoleGuard } from "./admin-role.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { KeycloakAdminService } from "./keycloak-admin.service";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminRoleGuard, KeycloakAdminService],
  exports: [AuthService, JwtAuthGuard, AdminRoleGuard, KeycloakAdminService]
})
export class AuthModule {}
