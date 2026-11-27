import type { Route } from "next";
import { redirect } from "next/navigation";

// Attendance settings live in the "Công" module now, like 1Office.
export default function MovedAttendanceSettingsPage() {
  redirect("/user/attendance/settings/timekeeping" as Route);
}
