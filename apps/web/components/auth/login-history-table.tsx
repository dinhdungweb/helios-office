import type { LoginHistoryEntry } from "@/lib/login-activity-api";
import type { LoginOutcome } from "@/lib/login-events";
import { describeUserAgent } from "@/lib/user-agent";

const OUTCOME_LABELS: Record<LoginOutcome, string> = {
  success: "Thành công",
  invalid_credentials: "Sai mật khẩu",
  password_update_required: "Mật khẩu tạm, phải đổi",
  account_not_linked: "Chưa được cấp quyền",
  account_inactive: "Tài khoản bị khoá"
};

const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Asia/Ho_Chi_Minh"
});

export function formatDateTime(value: string | null) {
  return value ? dateTimeFormat.format(new Date(value)) : "--";
}

// AU-20: sign-in attempts, newest first. Shared by the user's security page and the admin
// account detail page.
export function LoginHistoryTable({ entries, label }: { entries: LoginHistoryEntry[]; label: string }) {
  if (entries.length === 0) {
    return <p className="login-activity-empty">Chưa có lần đăng nhập nào được ghi lại.</p>;
  }

  return (
    <div className="login-activity-table-shell" tabIndex={0} aria-label={label}>
      <table className="login-activity-table">
        <thead>
          <tr>
            <th scope="col">Thời gian</th>
            <th scope="col">Kết quả</th>
            <th scope="col">Địa chỉ IP</th>
            <th scope="col">Thiết bị</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{formatDateTime(entry.createdAt)}</td>
              <td>
                <span className={entry.outcome === "success" ? "login-activity-outcome is-success" : "login-activity-outcome is-failed"}>
                  {OUTCOME_LABELS[entry.outcome] ?? entry.outcome}
                </span>
              </td>
              <td>{entry.ipAddress ?? "--"}</td>
              <td title={entry.userAgent ?? undefined}>{describeUserAgent(entry.userAgent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
