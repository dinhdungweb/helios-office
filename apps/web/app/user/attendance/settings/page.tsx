import type { Route } from "next";
import { redirect } from "next/navigation";

// Like 1Office, the module's settings open on the shift list.
export default function AttendanceSettingsPage() {
  redirect("/user/attendance/settings/shifts" as Route);
}
