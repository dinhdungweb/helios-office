import { AuditLogBoard } from "@/components/admin/audit-log-board";
import { SettingsWorkspaceShell } from "@/components/admin/settings-workspace-shell";
import { getAuditLogs, type AuditLogFilters } from "@/lib/audit-log-api";

type AuditLogsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const FILTER_KEYS = ["q", "source", "action", "entityType", "from", "to", "page"] as const;

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const params = (await searchParams) ?? {};
  const filters: AuditLogFilters = Object.fromEntries(
    FILTER_KEYS.map((key) => [key, Array.isArray(params[key]) ? params[key]?.[0] : params[key]]).filter(([, value]) => Boolean(value))
  );
  const result = await getAuditLogs(filters).then(
    (data) => ({ data, error: null }),
    () => ({ data: null, error: "Không tải được nhật ký. Kiểm tra bộ lọc (ngày hợp lệ) hoặc thử lại sau." })
  );

  return (
    <SettingsWorkspaceShell activeItem="audit-logs" mainLabel="Nhật ký hệ thống">
      <AuditLogBoard data={result.data} error={result.error} filters={filters} />
    </SettingsWorkspaceShell>
  );
}
