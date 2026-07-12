import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth-user";

export default async function HcnsLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentSessionUser();

  if (!user?.account || user.account.accountStatus !== "active") {
    redirect("/login?redirectTo=/hcns");
  }

  return children;
}
