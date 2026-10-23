import { AttendanceConfirmationBanner } from "@/components/attendance/attendance-confirmation-banner";
import { AttendanceModuleTabs } from "@/components/attendance/attendance-module-tabs";
import { MyDeviceCard } from "@/components/attendance/my-device-card";
import { AttendanceBoard } from "@/components/user/attendance-board";
import { UserFrame } from "@/components/user/user-frame";
import { getMyAttendanceData, getMyMonthConfirmation, getMyShiftSchedule, resolveAttendanceMonth } from "@/lib/attendance-api";
import { getAttendanceModuleTabs } from "@/lib/attendance-module";
import { getMyDeviceData } from "@/lib/my-device";

type UserAttendancePageProps = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function UserAttendancePage({ searchParams }: UserAttendancePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const attendanceMonth = resolveAttendanceMonth(params?.month);
  const [data, schedule, tabs, confirmation, device] = await Promise.all([
    getMyAttendanceData(attendanceMonth),
    getMyShiftSchedule(attendanceMonth),
    getAttendanceModuleTabs("personal"),
    getMyMonthConfirmation(attendanceMonth),
    getMyDeviceData()
  ]);

  return (
    <UserFrame activeModule="attendance">
      <AttendanceBoard
        banner={
          <>
            <MyDeviceCard data={device} />
            <AttendanceConfirmationBanner data={confirmation} />
          </>
        }
        data={data}
        key={schedule.month}
        moduleTabs={<AttendanceModuleTabs tabs={tabs} />}
        schedule={schedule}
        standard={confirmation?.standard}
      />
    </UserFrame>
  );
}
