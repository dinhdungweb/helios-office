import { Module } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { AdminRoleGuard } from "./admin-role.guard";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { KeycloakAdminService } from "./keycloak-admin.service";
import { PermissionGuard } from "./permission.guard";
import { SecurityPolicyService } from "./security-policy.service";
import { TwoFactorGateService } from "./two-factor-gate.service";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    AdminRoleGuard,
    PermissionGuard,
    KeycloakAdminService,
    SecurityPolicyService,
    TwoFactorGateService
  ],
  exports: [AuthService, JwtAuthGuard, AdminRoleGuard, PermissionGuard, KeycloakAdminService, SecurityPolicyService, TwoFactorGateService]
})
export class AuthModule {}
