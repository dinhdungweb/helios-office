import { formatDateTime } from "@/components/auth/login-history-table";
import type { AuditLogEntry, AuditLogFilters, AuditLogPage } from "@/lib/audit-log-api";
import { describeUserAgent } from "@/lib/user-agent";

// CORE-13: who did what, when and from where. Filters are a GET form, so every view is a URL that
// can be shared or bookmarked.

function actorLabel(entry: AuditLogEntry) {
  if (entry.actorAccount) return entry.actorAccount.displayName;
  if (entry.employee) return `${entry.employee.fullName} (${entry.employee.code})`;
  return "Hệ thống";
}

function json(value: unknown) {
  return value === null || value === undefined ? "—" : JSON.stringify(value, null, 2);
}

function pageHref(filters: AuditLogFilters, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== "page") params.set(key, value);
  }
  params.set("page", String(page));
  return `?${params.toString()}`;
}

export function AuditLogBoard({ data, error, filters }: { data: AuditLogPage | null; error: string | null; filters: AuditLogFilters }) {
  return (
    <div className="audit-log-board">
      <form className="audit-log-filters" method="get">
        <label>
          <span>Tìm kiếm</span>
          <input defaultValue={filters.q ?? ""} name="q" placeholder="Hành động, mã đối tượng, người thực hiện" type="search" />
        </label>
        <label>
          <span>Hành động bắt đầu bằng</span>
          <input defaultValue={filters.action ?? ""} name="action" placeholder="vd. account. hoặc auth." type="text" />
        </label>
        <label>
          <span>Loại đối tượng</span>
          <input defaultValue={filters.entityType ?? ""} name="entityType" placeholder="vd. UserAccount, Employee" type="text" />
        </label>
        <label>
          <span>Nguồn</span>
          <select defaultValue={filters.source ?? ""} name="source">
            <option value="">Tất cả</option>
            <option value="domain">Nghiệp vụ (có giá trị trước/sau)</option>
            <option value="http">Ghi tự động theo request</option>
          </select>
        </label>
        <label>
          <span>Từ ngày</span>
          <input defaultValue={filters.from ?? ""} name="from" type="date" />
        </label>
        <label>
          <span>Đến ngày</span>
          <input defaultValue={filters.to ?? ""} name="to" type="date" />
        </label>
        <div className="audit-log-filter-actions">
          <button className="primary-button" type="submit">Lọc</button>
          <a className="secondary-button" href="?">Xoá lọc</a>
        </div>
      </form>

      {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}

      {data ? (
        <>
          <p className="audit-log-summary">
            {data.total.toLocaleString("vi-VN")} bản ghi · trang {data.page}/{data.pageCount}
          </p>
          <div className="login-activity-table-shell" tabIndex={0} aria-label="Nhật ký hệ thống có thể cuộn ngang">
            <table className="login-activity-table audit-log-table">
              <thead>
                <tr>
                  <th scope="col">Thời gian</th>
                  <th scope="col">Người thực hiện</th>
                  <th scope="col">Hành động</th>
                  <th scope="col">Đối tượng</th>
                  <th scope="col">IP · Thiết bị</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td>{actorLabel(entry)}</td>
                    <td>
                      <details className="audit-log-details">
                        <summary>
                          <code>{entry.action}</code>
                          {entry.source === "http" ? <small> (tự động)</small> : null}
                        </summary>
                        <div className="audit-log-values">
                          <div>
                            <strong>Trước</strong>
                            <pre>{json(entry.beforeValue)}</pre>
                          </div>
                          <div>
                            <strong>Sau</strong>
                            <pre>{json(entry.afterValue)}</pre>
                          </div>
                          {entry.requestId ? <small>Request {entry.requestId}</small> : null}
                        </div>
                      </details>
                    </td>
                    <td>
                      {entry.entityType}
                      <small className="audit-log-entity-id">{entry.entityId}</small>
                    </td>
                    <td title={entry.userAgent ?? undefined}>
                      {entry.ipAddress ?? "--"}
                      {entry.userAgent ? <small className="audit-log-entity-id">{describeUserAgent(entry.userAgent)}</small> : null}
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Không có bản ghi nào khớp bộ lọc.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {data.pageCount > 1 ? (
            <nav className="audit-log-pages" aria-label="Phân trang nhật ký">
              {data.page > 1 ? <a href={pageHref(filters, data.page - 1)}>‹ Trang trước</a> : <span />}
              {data.page < data.pageCount ? <a href={pageHref(filters, data.page + 1)}>Trang sau ›</a> : null}
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
