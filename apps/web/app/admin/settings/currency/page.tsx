import { redirect } from "next/navigation";

export default function CurrencySettingsPage() {
  redirect("/admin/settings#system-settings");
}
