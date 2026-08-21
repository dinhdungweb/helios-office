import type { Route } from "next";
import { redirect } from "next/navigation";

type PositionTitleSettingsPageProps = {
  searchParams?: Promise<{ catalog?: string; q?: string }>;
};

export default async function PositionTitleSettingsPage({ searchParams }: PositionTitleSettingsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const target = params?.catalog === "level"
    ? "/admin/settings/job-levels"
    : params?.catalog === "title"
      ? "/admin/settings/job-titles"
      : "/admin/settings/job-positions";
  const query = params?.q?.trim() ?? "";
  redirect((query ? `${target}?q=${encodeURIComponent(query)}` : target) as Route);
}
