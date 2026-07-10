import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AccountAccessModule } from "./modules/account-access/account-access.module";
import { AdminSettingsModule } from "./modules/admin-settings/admin-settings.module";
import { AnnouncementsModule } from "./modules/announcements/announcements.module";
import { ApprovalsModule } from "./modules/approvals/approvals.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AuthModule } from "./modules/auth/auth.module";
import { EmployeesModule } from "./modules/employees/employees.module";
import { LeaveRequestsModule } from "./modules/leave-requests/leave-requests.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PayrollModule } from "./modules/payroll/payroll.module";
import { PostsModule } from "./modules/posts/posts.module";
import { ReportsModule } from "./modules/reports/reports.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")],
      isGlobal: true
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
    PayrollModule,
    ReportsModule,
    NotificationsModule
  ]
})
export class AppModule {}
