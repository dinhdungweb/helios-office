import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentSessionUserOrSignOut } from "@/lib/auth-user";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Signed-out or not yet 2FA-verified sessions go to the right page instead of the login form.
  const user = await getCurrentSessionUserOrSignOut();

  if (
    !user?.account ||
    user.account.adminRole !== "system_admin" ||
    user.account.accountStatus !== "active"
  ) {
    redirect("/login?redirectTo=/admin");
  }

  return children;
}
