import { SecurityBoard } from "@/components/user/security-board";
import { UserFrame } from "@/components/user/user-frame";
import { getMyLoginHistory, getMySessions } from "@/lib/login-activity-api";
import { getTwoFactorStatus } from "@/lib/two-factor-actions";

export default async function UserSecurityPage() {
  const [sessions, history, twoFactor] = await Promise.all([
    getMySessions().catch(() => null),
    getMyLoginHistory().catch(() => null),
    getTwoFactorStatus()
  ]);

  return (
    <UserFrame activeModule="profile" title="Bảo mật đăng nhập">
      <SecurityBoard history={history} sessions={sessions} twoFactor={twoFactor.ok ? twoFactor.data : null} />
    </UserFrame>
  );
}
