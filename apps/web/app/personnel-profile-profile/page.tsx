import type { Route } from "next";
import { redirect } from "next/navigation";

export default function LegacyPersonnelProfileDirectoryPage() {
  redirect("/apps/personnel-profile-profile" as Route);
}
