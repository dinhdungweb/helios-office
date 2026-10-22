import { ShiftScheduleBoard } from "@/components/hcns/shift-schedule-board";
import { UserFrame } from "@/components/user/user-frame";
import { getScheduleData } from "@/lib/shift-api";
import { addCalendarDays, mondayOf } from "@/lib/shift-format";

type ShiftSchedulePageProps = {
  searchParams?: Promise<{ from?: string; department?: string }>;
};

function todayInVietnam() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export default async function ShiftSchedulePage({ searchParams }: ShiftSchedulePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const requested = params?.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from) ? params.from : todayInVietnam();
  const from = mondayOf(requested);
  const data = await getScheduleData(from, addCalendarDays(from, 6));

  return (
    <UserFrame activeModule="hcns" title="Lịch ca">
      <ShiftScheduleBoard data={data} departmentId={params?.department ?? ""} />
    </UserFrame>
  );
}
