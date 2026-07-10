import type { Route } from "next";
import { redirect } from "next/navigation";

export default function AdminAccountsPage() {
  redirect("/admin/settings/accounts" as Route);
}
