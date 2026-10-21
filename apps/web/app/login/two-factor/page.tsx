import { redirect } from "next/navigation";
import { LoginShell } from "@/components/auth/login-shell";
import { TwoFactorLogin } from "@/components/auth/two-factor-login";
import { getTwoFactorStatus } from "@/lib/two-factor-actions";

// AU-18: reached after a correct password while the company enforces 2FA (the page frame sends
// every unverified session here).
export default async function TwoFactorLoginPage() {
  const status = await getTwoFactorStatus();

  if (!status.ok) {
    redirect(status.code === "no_session" ? "/login" : "/login?error=provider");
  }

  if (status.data.session.verified || !status.data.policy.enforced) {
    redirect("/user");
  }

  return (
    <LoginShell formLabel="Bảo mật 2 lớp">
      <TwoFactorLogin status={status.data} />
    </LoginShell>
  );
}
