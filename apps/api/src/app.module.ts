import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AnnouncementsModule } from "./modules/announcements/announcements.module";
import { ApprovalsModule } from "./modules/approvals/approvals.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { EmployeesModule } from "./modules/employees/employees.module";
import { LeaveRequestsModule } from "./modules/leave-requests/leave-requests.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PayrollModule } from "./modules/payroll/payroll.module";
import { PostsModule } from "./modules/posts/posts.module";
import { ReportsModule } from "./modules/reports/reports.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
