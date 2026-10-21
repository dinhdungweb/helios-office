import { formatDateTime, LoginHistoryTable } from "@/components/auth/login-history-table";
import { SessionRevokeButton } from "@/components/user/session-revoke-button";
import { TwoFactorSecurityCard } from "@/components/user/two-factor-security-card";
import type { TwoFactorStatus } from "@/lib/two-factor-actions";
import type { LoginHistoryEntry, LoginSession } from "@/lib/login-activity-api";
import { describeUserAgent } from "@/lib/user-agent";

// AU-16 + AU-20: where the user is signed in, and recent sign-in attempts on their account.
export function SecurityBoard({
  history,
  sessions,
  twoFactor
}: {
  history: LoginHistoryEntry[] | null;
  sessions: LoginSession[] | null;
  twoFactor: TwoFactorStatus | null;
}) {
  return (
    <main className="security-page" aria-label="Bảo mật đăng nhập">
      <TwoFactorSecurityCard status={twoFactor} />

      <section className="security-card" aria-labelledby="security-sessions-title">
        <header>
          <h2 id="security-sessions-title">Phiên đăng nhập</h2>
          <p>Các thiết bị đang đăng nhập tài khoản của bạn. Thấy thiết bị lạ thì đăng xuất nó và đổi mật khẩu.</p>
        </header>
        {sessions === null ? (
          <p className="login-activity-empty">Không tải được danh sách phiên. Thử lại sau.</p>
        ) : (
          <ul className="security-session-list">
            {sessions.map((session) => (
              <li key={session.id} className={session.current ? "is-current" : undefined}>
                <div>
                  <strong>{describeUserAgent(session.userAgent)}</strong>
                  {session.current ? <span className="security-session-badge">Phiên này</span> : null}
                  <small>
                    IP {session.ipAddress ?? "không rõ"} · đăng nhập {formatDateTime(session.startedAt)} · hoạt động gần nhất{" "}
                    {formatDateTime(session.lastAccessAt)}
                  </small>
                </div>
                {session.current ? null : <SessionRevokeButton sessionId={session.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="security-card" aria-labelledby="security-history-title">
        <header>
          <h2 id="security-history-title">Lịch sử đăng nhập</h2>
          <p>50 lần đăng nhập gần nhất, kể cả lần sai mật khẩu.</p>
        </header>
        {history === null ? (
          <p className="login-activity-empty">Không tải được lịch sử đăng nhập. Thử lại sau.</p>
        ) : (
          <LoginHistoryTable entries={history} label="Lịch sử đăng nhập có thể cuộn ngang" />
        )}
      </section>
    </main>
  );
}
