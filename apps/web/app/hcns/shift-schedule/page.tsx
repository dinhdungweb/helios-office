import { ShiftScheduleBoard } from "@/components/hcns/shift-schedule-board";
import { UserFrame } from "@/components/user/user-frame";
import { getScheduleData, getShiftPatterns } from "@/lib/shift-api";
import { addCalendarDays, mondayOf, monthRange } from "@/lib/shift-format";

type ShiftSchedulePageProps = {
  searchParams?: Promise<{ from?: string; department?: string; view?: string }>;
};

function todayInVietnam() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export default async function ShiftSchedulePage({ searchParams }: ShiftSchedulePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const requested = params?.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from) ? params.from : todayInVietnam();
  // Month view like 1Office's "Phân ca"; week view for day-to-day edits.
  const view = params?.view === "month" ? "month" : "week";
  const range = view === "month" ? monthRange(requested) : { from: mondayOf(requested), to: addCalendarDays(mondayOf(requested), 6) };
  const [data, patterns] = await Promise.all([getScheduleData(range.from, range.to), getShiftPatterns()]);

  return (
    <UserFrame activeModule="hcns" title="Lịch ca">
      <ShiftScheduleBoard data={data} departmentId={params?.department ?? ""} patterns={patterns} view={view} />
    </UserFrame>
  );
}
