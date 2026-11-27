import type { Route } from "next";
import { redirect } from "next/navigation";

type OldShiftSchedulePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// The schedule moved into the "Công" module; keep old links working.
export default async function OldShiftSchedulePage({ searchParams }: OldShiftSchedulePageProps) {
  const params = new URLSearchParams();
  Object.entries((searchParams ? await searchParams : undefined) ?? {}).forEach(([key, value]) => {
    if (typeof value === "string") params.set(key, value);
  });
  const query = params.toString();
  redirect(`/user/attendance/shift-schedule${query ? `?${query}` : ""}` as Route);
}
