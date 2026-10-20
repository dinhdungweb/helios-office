import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { resolve } from "node:path";
import { PrismaModule } from "./common/prisma/prisma.module";
import { SessionThrottlerGuard } from "./common/throttle/session-throttler.guard";
import { AccountAccessModule } from "./modules/account-access/account-access.module";
import { AdminSettingsModule } from "./modules/admin-settings/admin-settings.module";
import { AnnouncementsModule } from "./modules/announcements/announcements.module";
import { ApprovalsModule } from "./modules/approvals/approvals.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JwtAuthGuard } from "./modules/auth/jwt-auth.guard";
import { DeviceAuthModule } from "./modules/device-auth/device-auth.module";
import { EmployeesModule } from "./modules/employees/employees.module";
import { LeaveRequestsModule } from "./modules/leave-requests/leave-requests.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PayrollModule } from "./modules/payroll/payroll.module";
import { PostsModule } from "./modules/posts/posts.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { UserPreferencesModule } from "./modules/user-preferences/user-preferences.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")],
      isGlobal: true
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get("THROTTLE_TTL_MS") ?? 60_000),
          limit: Number(config.get("THROTTLE_LIMIT") ?? 600)
        }
      ]
    }),
    PrismaModule,
    AuthModule,
    AccountAccessModule,
    AdminSettingsModule,
    EmployeesModule,
    PostsModule,
    AnnouncementsModule,
    ApprovalsModule,
    LeaveRequestsModule,
    AttendanceModule,
    DeviceAuthModule,
    PayrollModule,
    ReportsModule,
    UserPreferencesModule,
    NotificationsModule
  ],
  // Global guards run in this order: rate limit first so rejected tokens still count, then
  // authentication. Every route requires a verified session unless it is marked @Public().
  providers: [
    { provide: APP_GUARD, useClass: SessionThrottlerGuard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard }
  ]
})
export class AppModule {}
