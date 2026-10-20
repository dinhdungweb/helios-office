import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AdminRoleGuard } from "./admin-role.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { KeycloakAdminService } from "./keycloak-admin.service";
import { PermissionGuard } from "./permission.guard";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    AdminRoleGuard,
    PermissionGuard,
    KeycloakAdminService,
    // Every route requires a verified session unless it is marked @Public().
    { provide: APP_GUARD, useExisting: JwtAuthGuard }
  ],
  exports: [AuthService, JwtAuthGuard, AdminRoleGuard, PermissionGuard, KeycloakAdminService]
})
export class AuthModule {}
