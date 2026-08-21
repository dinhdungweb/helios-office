"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormCheckbox } from "@/components/ui/form-controls";
import { StateBlock } from "@/components/ui/primitives";
import { deleteApprovalWorkflowsAction } from "@/lib/approval-workflow-actions";
import type { ApprovalWorkflowData, ApprovalWorkflowRecord } from "@/lib/approval-workflow-api";
import { FileText, Plus, Trash, UserCircle } from "@/lib/icons";

const objectLabels: Record<string, string> = {
  decision: "Quyết định",
  personnel_profile: "Hồ sơ nhân sự",
  labor_contract: "Hợp đồng lao động",
  leave_request: "Đơn nghỉ phép",
  proposal: "Đề xuất"
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("vi");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "medium" }).format(date);
}

function initials(person: ApprovalWorkflowRecord["createdBy"]) {
  return person?.fullName.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "A";
}

export function ApprovalWorkflowSettingsBoard({ data, query = "" }: { data: ApprovalWorkflowData; query?: string }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isDeleting, startDelete] = useTransition();
  const workflows = useMemo(() => {
    const term = normalize(query);
    return term ? data.workflows.filter((item) => normalize(`${item.code ?? ""} ${item.name} ${item.objectType}`).includes(term)) : data.workflows;
  }, [data.workflows, query]);
  const allSelected = workflows.length > 0 && workflows.every((item) => selectedIds.includes(item.id));

  const deleteSelected = () => {
    if (!window.confirm(`Xóa ${selectedIds.length} quy trình đã chọn?`)) return;
    setMessage("");
    startDelete(async () => {
      const result = await deleteApprovalWorkflowsAction(selectedIds);
      if (!result.ok) {
        setMessage(result.error ?? "Không xóa được quy trình.");
        return;
      }
      setSelectedIds([]);
      router.refresh();
    });
  };

  return (
    <section className="approval-workflow-card" aria-labelledby="approval-workflow-title">
      <header className="approval-workflow-list-header">
        {selectedIds.length > 0 ? (
          <button className="personnel-catalog-selection-action" disabled={isDeleting} type="button" onClick={deleteSelected}>
            <Trash size={16} aria-hidden="true" />
            {isDeleting ? "Đang xóa" : "Xóa"}
          </button>
        ) : (
          <h2 id="approval-workflow-title"><Plus size={18} aria-hidden="true" /> Quy trình duyệt</h2>
        )}
        <a className="approval-workflow-create-link" href="/admin/settings/approval-workflows/new">
          <Plus size={16} aria-hidden="true" /> Tạo mới
        </a>
      </header>

      {message ? <p className="personnel-catalog-message is-error" role="alert">{message}</p> : null}
      {data.source === "unavailable" ? (
        <StateBlock tone="error" title="Chưa kết nối được API quy trình duyệt">{data.error}</StateBlock>
      ) : workflows.length === 0 ? (
        <div className="approval-workflow-empty">
          <FileText size={34} weight="duotone" aria-hidden="true" />
          <span>Không tìm thấy kết quả nào</span>
        </div>
      ) : (
        <div className="approval-workflow-table-shell" tabIndex={0} aria-label="Bảng quy trình duyệt có thể cuộn ngang">
          <p className="approval-workflow-record-count">Hiển thị 1 - {workflows.length} / {workflows.length} bản ghi</p>
          <table className="approval-workflow-table">
            <thead>
              <tr>
                <th><FormCheckbox label={<span className="sr-only">Chọn tất cả quy trình</span>} checked={allSelected} onChange={() => setSelectedIds(allSelected ? [] : workflows.map((item) => item.id))} /></th>
                <th>Mã quy trình</th><th>Tên quy trình</th><th>Đối tượng</th><th>Đối tượng con</th><th>Trạng thái</th>
                <th>Phiên bản</th><th>Loại duyệt</th><th>Người theo dõi</th><th>Hiển thị sơ đồ duyệt</th>
                <th>Ngày tạo</th><th>Ngày cập nhật</th><th>Tạo bởi</th><th>Người cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((item) => (
                <tr key={item.id}>
                  <td><FormCheckbox label={<span className="sr-only">Chọn {item.name}</span>} checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /></td>
                  <td>{item.code ?? "--"}</td>
                  <td><strong>{item.name}</strong></td>
                  <td>{objectLabels[item.objectType] ?? item.objectType}</td>
                  <td>{item.subObject === "all" ? "Tất cả" : item.subObject}</td>
                  <td><span className={`approval-workflow-status is-${item.status}`}>{item.status === "active" ? "Hoạt động" : item.status === "draft" ? "Bản nháp" : "Ngừng hoạt động"}</span></td>
                  <td><strong className="approval-workflow-version">{item.versionMode ? "Dùng thật" : "Thử nghiệm"}</strong></td>
                  <td>Quy trình duyệt</td>
                  <td>{item.follower ? <span className="approval-workflow-person" title={item.follower.fullName}>{initials(item.follower)}</span> : <UserCircle className="approval-workflow-follower-empty" size={26} aria-label="Chưa chọn" />}</td>
                  <td>{item.showFlowInObject ? "Có" : "Không"}</td>
                  <td>{formatDateTime(item.createdAt)}</td><td>{formatDateTime(item.updatedAt)}</td>
                  <td><span className="approval-workflow-person" title={item.createdBy?.fullName ?? "Admin"}>{initials(item.createdBy)}</span></td>
                  <td><span className="approval-workflow-person" title={item.updatedBy?.fullName ?? "Admin"}>{initials(item.updatedBy)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
