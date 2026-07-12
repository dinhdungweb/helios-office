"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { FormCheckbox, FormSelect } from "@/components/ui/form-controls";
import { Button, EmptyState, ModalDialog, ResponsiveTable } from "@/components/ui/primitives";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type {
  AdminApprovalAlertsData,
  AdminApprovalCategory,
  AdminApprovalItem,
  AdminApprovalPriority,
  AdminApprovalStatus,
  AdminSystemNotification
} from "@/lib/admin-approval-alerts-api";
import {
  ArrowSquareOut,
  Bell,
  CheckCircle,
  Clock,
  ClipboardText,
  PaperPlaneTilt,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  WarningCircle,
  X
} from "@/lib/icons";

type StatusFilter = "all" | "pending" | "processed";

type AdminApprovalAlertsBoardProps = {
  data: AdminApprovalAlertsData;
};

const statusLabels: Record<AdminApprovalStatus, string> = {
  pending: "Chờ duyệt",
  assigned: "Đã gán",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  resolved: "Đã xử lý"
};

const priorityLabels: Record<AdminApprovalPriority, string> = {
  normal: "Bình thường",
  high: "Cần chú ý",
  critical: "Quan trọng"
};

const notificationStatusLabels: Record<AdminSystemNotification["status"], string> = {
  info: "Thông tin",
  warning: "Cần chú ý",
  critical: "Quan trọng"
};

const priorityBadgeTones: Record<AdminApprovalPriority, BadgeTone> = {
  critical: "danger",
  high: "warning",
  normal: "neutral"
};

const statusBadgeTones: Record<AdminApprovalStatus, BadgeTone> = {
  assigned: "neutral",
  approved: "success",
  pending: "warning",
  rejected: "danger",
  resolved: "neutral"
};

const notificationBadgeTones: Record<AdminSystemNotification["status"], BadgeTone> = {
  critical: "danger",
  info: "info",
  warning: "warning"
};

function SummaryCard({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <article className="admin-approval-summary-card">
      <span>
        <Icon size={20} weight="duotone" aria-hidden="true" />
      </span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </article>
  );
}

function StatusChip({
  count,
  filter,
  isSelected,
  label,
  onSelect
}: {
  count: number;
  filter: StatusFilter;
  isSelected: boolean;
  label: string;
  onSelect: (filter: StatusFilter) => void;
}) {
  return (
    <button className={isSelected ? "is-selected" : undefined} type="button" onClick={() => onSelect(filter)}>
      <span>{label}</span>
      <strong>{count}</strong>
    </button>
  );
}

function PriorityBadge({ priority }: { priority: AdminApprovalPriority }) {
  return <Badge tone={priorityBadgeTones[priority]}>{priorityLabels[priority]}</Badge>;
}

function StatusBadge({ status }: { status: AdminApprovalStatus }) {
  return <Badge tone={statusBadgeTones[status]}>{statusLabels[status]}</Badge>;
}

function isProcessed(status: AdminApprovalStatus) {
  return status === "approved" || status === "rejected" || status === "resolved";
}

function isPendingFilterMatch(item: AdminApprovalItem, filter: StatusFilter) {
  return filter === "all" || (filter === "pending" && !isProcessed(item.status)) || (filter === "processed" && isProcessed(item.status));
}

function setItemStatus(
  items: AdminApprovalItem[],
  itemId: string,
  status: AdminApprovalStatus,
  assignee?: string
) {
  return items.map((item) => (item.id === itemId ? { ...item, status, assignee: assignee ?? item.assignee } : item));
}

function BulkAssignDialog({
  count,
  onAssign,
  onClose
}: {
  count: number;
  onAssign: (assignee: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [assignee, setAssignee] = useState("HCNS");

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <ModalDialog className="admin-approval-assign-dialog" ref={dialogRef} title="Gán người xử lý" onCancel={onClose} onCloseRequest={onClose}>
      <div className="admin-approval-assign-body">
        <p>{count} yêu cầu sẽ được chuyển cho người phụ trách được chọn.</p>
        <FormSelect
          ariaLabel="Chọn người xử lý"
          defaultValue={assignee}
          menuLabel="Danh sách người xử lý"
          onValueChange={setAssignee}
          options={[
            { label: "HCNS", description: "Theo dõi đơn từ, hợp đồng và thử việc" },
            { label: "IT Admin", description: "Xử lý thiết bị, tài khoản và bảo mật" },
            { label: "System Admin", description: "Cấu hình, phân quyền và hệ thống" },
            { label: "HR Ops", description: "Chấm công, ca làm và dữ liệu vận hành" }
          ]}
          placeholder="Chọn người xử lý"
        />
      </div>
      <footer className="admin-approval-dialog-actions">
        <Button icon={<X size={15} weight="duotone" aria-hidden="true" />} variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button icon={<PaperPlaneTilt size={15} weight="duotone" aria-hidden="true" />} variant="primary" onClick={() => onAssign(assignee)}>
          Gán xử lý
        </Button>
      </footer>
    </ModalDialog>
  );
}

function SectionHeader({
  action,
  eyebrow,
  id,
  title
}: {
  action?: ReactNode;
  eyebrow: string;
  id?: string;
  title: string;
}) {
  return (
    <header className="admin-approval-panel-header">
      <div>
        <p>{eyebrow}</p>
        <h2 id={id}>{title}</h2>
      </div>
      {action}
    </header>
  );
}

function ApprovalRequestsSection({
  items,
  selectedIds,
  setItems,
  setSelectedIds,
  onAssignSelected
}: {
  items: AdminApprovalItem[];
  selectedIds: Set<string>;
  setItems: Dispatch<SetStateAction<AdminApprovalItem[]>>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  onAssignSelected: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const visibleItems = useMemo(() => items.filter((item) => isPendingFilterMatch(item, statusFilter)), [items, statusFilter]);
  const processedCount = items.filter((item) => isProcessed(item.status)).length;
  const pendingCount = items.length - processedCount;
  const isAllSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedIds.has(item.id));

  useEffect(() => {
    const visibleIds = new Set(visibleItems.map((item) => item.id));

    setSelectedIds((currentIds) => {
      const nextIds = new Set([...currentIds].filter((id) => visibleIds.has(id)));

      return nextIds.size === currentIds.size ? currentIds : nextIds;
    });
  }, [setSelectedIds, visibleItems]);

  function toggleAll() {
    setSelectedIds(isAllSelected ? new Set() : new Set(visibleItems.map((item) => item.id)));
  }

  function toggleItem(itemId: string) {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(itemId)) {
        nextIds.delete(itemId);
      } else {
        nextIds.add(itemId);
      }

      return nextIds;
    });
  }

  function approveSelected() {
    setItems((currentItems) =>
      currentItems.map((item) => (selectedIds.has(item.id) ? { ...item, status: "approved" } : item))
    );
    setSelectedIds(new Set());
  }

  function updateItem(itemId: string, status: AdminApprovalStatus, assignee?: string) {
    setItems((currentItems) => setItemStatus(currentItems, itemId, status, assignee));
    setSelectedIds(new Set());
  }

  return (
    <section className="admin-approval-panel" id="approval-requests" aria-labelledby="approval-requests-title">
      <SectionHeader
        eyebrow="Approval requests"
        id="approval-requests-title"
        title="Phê duyệt đơn từ"
        action={
          <div className="admin-approval-bulk-actions">
            <Button
              disabled={selectedIds.size === 0}
              icon={<CheckCircle size={15} weight="duotone" aria-hidden="true" />}
              variant="secondary"
              onClick={approveSelected}
            >
              Duyệt
            </Button>
            <Button
              disabled={selectedIds.size === 0}
              icon={<PaperPlaneTilt size={15} weight="duotone" aria-hidden="true" />}
              variant="secondary"
              onClick={onAssignSelected}
            >
              Gán xử lý
            </Button>
          </div>
        }
      />

      <div className="admin-approval-filter-bar">
        <div className="admin-approval-filter-group" aria-label="Lọc đơn từ theo trạng thái">
          <StatusChip count={items.length} filter="all" isSelected={statusFilter === "all"} label="Tất cả" onSelect={setStatusFilter} />
          <StatusChip count={pendingCount} filter="pending" isSelected={statusFilter === "pending"} label="Chờ duyệt" onSelect={setStatusFilter} />
          <StatusChip count={processedCount} filter="processed" isSelected={statusFilter === "processed"} label="Đã xử lý" onSelect={setStatusFilter} />
        </div>
      </div>

      {selectedIds.size > 0 ? (
        <div className="admin-approval-selection-bar" role="status">
          Đã chọn {selectedIds.size} đơn từ.
        </div>
      ) : null}

      {visibleItems.length === 0 ? (
        <EmptyState title="Không có đơn từ phù hợp">Không có đơn hành chính, nhân sự hoặc tài chính nào trong bộ lọc hiện tại.</EmptyState>
      ) : (
        <ResponsiveTable className="admin-approval-table-shell" label="Bảng phê duyệt đơn từ">
          <table className="admin-approval-table admin-approval-table--requests">
            <thead>
              <tr>
                <th scope="col">
                  <FormCheckbox checked={isAllSelected} label={<span className="sr-only">Chọn tất cả đơn từ</span>} onChange={toggleAll} />
                </th>
                <th scope="col">Đơn từ</th>
                <th scope="col">Người gửi</th>
                <th scope="col">Hạn xử lý</th>
                <th scope="col">Mức</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <FormCheckbox checked={selectedIds.has(item.id)} label={<span className="sr-only">Chọn {item.title}</span>} onChange={() => toggleItem(item.id)} />
                  </td>
                  <th scope="row">
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </th>
                  <td>
                    <strong>{item.requester}</strong>
                    <small>{item.department}</small>
                  </td>
                  <td>
                    <span>{item.dueAt}</span>
                    <small>{item.createdAt}</small>
                  </td>
                  <td>
                    <PriorityBadge priority={item.priority} />
                  </td>
                  <td>
                    <StatusBadge status={item.status} />
                    <small>{item.assignee}</small>
                  </td>
                  <td>
                    <div className="admin-approval-row-actions">
                      <button
                        className="icon-button"
                        disabled={isProcessed(item.status)}
                        type="button"
                        aria-label={`Duyệt ${item.title}`}
                        onClick={() => updateItem(item.id, "approved")}
                      >
                        <CheckCircle size={15} weight="duotone" aria-hidden="true" />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Gán xử lý ${item.title}`}
                        onClick={() => updateItem(item.id, "assigned", "HCNS")}
                      >
                        <PaperPlaneTilt size={15} weight="duotone" aria-hidden="true" />
                      </button>
                      <a className="icon-button" href={item.href} aria-label={`Mở chi tiết ${item.title}`}>
                        <ArrowSquareOut size={15} weight="duotone" aria-hidden="true" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      )}
    </section>
  );
}

function AlertTable({
  emptyText,
  items,
  setItems,
  tableLabel
}: {
  emptyText: string;
  items: AdminApprovalItem[];
  setItems: Dispatch<SetStateAction<AdminApprovalItem[]>>;
  tableLabel: string;
}) {
  function updateStatus(status: AdminApprovalStatus, assignee?: string) {
    return (itemId: string) => {
      setItems((currentItems) => setItemStatus(currentItems, itemId, status, assignee));
    };
  }

  if (items.length === 0) {
    return <EmptyState title={emptyText}>Khi có dữ liệu phát sinh, hệ thống sẽ hiển thị trong mục này.</EmptyState>;
  }

  return (
    <ResponsiveTable className="admin-approval-table-shell" label={tableLabel}>
      <table className="admin-approval-table admin-approval-table--alerts">
        <thead>
          <tr>
            <th scope="col">Nội dung</th>
            <th scope="col">Người / nguồn</th>
            <th scope="col">Hạn xử lý</th>
            <th scope="col">Mức</th>
            <th scope="col">Trạng thái</th>
            <th scope="col">Tác vụ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <th scope="row">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </th>
              <td>
                <strong>{item.requester}</strong>
                <small>{item.department}</small>
              </td>
              <td>
                <span>{item.dueAt}</span>
                <small>{item.createdAt}</small>
              </td>
              <td>
                <PriorityBadge priority={item.priority} />
              </td>
              <td>
                <StatusBadge status={item.status} />
                <small>{item.assignee}</small>
              </td>
              <td>
                <div className="admin-approval-row-actions">
                  <button
                    className="icon-button"
                    disabled={isProcessed(item.status)}
                    type="button"
                    aria-label={`Đánh dấu xử lý ${item.title}`}
                    onClick={() => updateStatus("resolved")(item.id)}
                  >
                    <CheckCircle size={15} weight="duotone" aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Gán xử lý ${item.title}`}
                    onClick={() => updateStatus("assigned", item.category === "security" ? "IT Admin" : "System Admin")(item.id)}
                  >
                    <PaperPlaneTilt size={15} weight="duotone" aria-hidden="true" />
                  </button>
                  <a className="icon-button" href={item.href} aria-label={`Mở chi tiết ${item.title}`}>
                    <ArrowSquareOut size={15} weight="duotone" aria-hidden="true" />
                  </a>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ResponsiveTable>
  );
}

function AlertSection({
  category,
  description,
  emptyText,
  items,
  setItems,
  title
}: {
  category: AdminApprovalCategory;
  description: string;
  emptyText: string;
  items: AdminApprovalItem[];
  setItems: Dispatch<SetStateAction<AdminApprovalItem[]>>;
  title: string;
}) {
  return (
    <section className="admin-approval-panel" id={`section-${category}`} aria-labelledby={`section-${category}-title`}>
      <SectionHeader eyebrow={description} id={`section-${category}-title`} title={title} />
      <AlertTable emptyText={emptyText} items={items} setItems={setItems} tableLabel={`Bảng ${title.toLowerCase()}`} />
    </section>
  );
}

function NotificationPanel({ notifications }: { notifications: AdminSystemNotification[] }) {
  return (
    <section className="admin-approval-panel" id="system-notifications" aria-labelledby="system-notifications-title">
      <SectionHeader eyebrow="System notifications" id="system-notifications-title" title="Thông báo từ hệ thống" />
      <ResponsiveTable className="admin-approval-table-shell" label="Bảng thông báo hệ thống">
        <table className="admin-approval-table admin-approval-table--notifications">
          <thead>
            <tr>
              <th scope="col">Thông báo</th>
              <th scope="col">Nội dung</th>
              <th scope="col">Thời gian</th>
              <th scope="col">Mức</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification) => (
              <tr key={notification.id}>
                <th scope="row">
                  <strong>{notification.title}</strong>
                </th>
                <td>{notification.description}</td>
                <td>{notification.time}</td>
                <td>
                  <Badge tone={notificationBadgeTones[notification.status]}>{notificationStatusLabels[notification.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>
    </section>
  );
}

export function AdminApprovalAlertsBoard({ data }: AdminApprovalAlertsBoardProps) {
  const [items, setItems] = useState(data.items);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const currentSummary = useMemo(
    () => ({
      pendingApprovals: items.filter((item) => item.category === "approval" && !isProcessed(item.status)).length,
      securityAlerts: items.filter((item) => item.category === "security" && !isProcessed(item.status)).length,
      deadlineAlerts: items.filter((item) => item.category === "deadline" && !isProcessed(item.status)).length,
      workflowAlerts: items.filter((item) => item.category === "workflow" && !isProcessed(item.status)).length,
      systemNotifications: data.notifications.length
    }),
    [data.notifications.length, items]
  );
  const approvalItems = items.filter((item) => item.category === "approval");
  const securityItems = items.filter((item) => item.category === "security");
  const deadlineItems = items.filter((item) => item.category === "deadline");
  const workflowItems = items.filter((item) => item.category === "workflow");

  function assignSelected(assignee: string) {
    setItems((currentItems) => currentItems.map((item) => (selectedIds.has(item.id) ? { ...item, assignee, status: "assigned" } : item)));
    setIsAssigning(false);
    setSelectedIds(new Set());
  }

  return (
    <main className="admin-approval-page" aria-label="Phê duyệt và cảnh báo Admin">
      <section className="admin-approval-heading" aria-labelledby="admin-approval-page-title">
        <div>
          <p>Approval & alert center</p>
          <h1 id="admin-approval-page-title">Phê duyệt & cảnh báo</h1>
          <span>Cập nhật {data.generatedAt}</span>
        </div>
        <div className="admin-approval-heading-actions">
          <a className="secondary-button" href="/admin/settings/accounts/device-auth">
            <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
            Xác thực thiết bị
          </a>
          <a className="secondary-button" href="/admin/settings#audit-logs">
            <ClipboardText size={16} weight="duotone" aria-hidden="true" />
            Nhật ký
          </a>
        </div>
      </section>

      {data.source !== "api" ? (
        <section className="account-api-banner" role="status">
          <strong>Một phần dữ liệu chưa sẵn sàng</strong>
          <span>{data.errors.slice(0, 2).join(" · ") || "Trang đang dùng dữ liệu dự phòng."}</span>
        </section>
      ) : null}

      <section className="admin-approval-summary-grid" aria-label="Tổng quan phê duyệt và cảnh báo">
        <SummaryCard icon={Clock} label="Đơn chờ duyệt" value={currentSummary.pendingApprovals} />
        <SummaryCard icon={ShieldCheck} label="Cảnh báo bảo mật" value={currentSummary.securityAlerts} />
        <SummaryCard icon={WarningCircle} label="Mốc thời hạn" value={currentSummary.deadlineAlerts} />
        <SummaryCard icon={SlidersHorizontal} label="Quy trình cần rà soát" value={currentSummary.workflowAlerts} />
        <SummaryCard icon={Bell} label="Thông báo hệ thống" value={currentSummary.systemNotifications} />
      </section>

      <div className="admin-approval-section-stack">
        <ApprovalRequestsSection
          items={approvalItems}
          selectedIds={selectedIds}
          setItems={setItems}
          setSelectedIds={setSelectedIds}
          onAssignSelected={() => setIsAssigning(true)}
        />
        <AlertSection
          category="security"
          description="Security alerts"
          emptyText="Không có cảnh báo bảo mật"
          items={securityItems}
          setItems={setItems}
          title="Cảnh báo bảo mật & tài khoản"
        />
        <AlertSection
          category="deadline"
          description="System deadlines"
          emptyText="Không có mốc thời hạn cần xử lý"
          items={deadlineItems}
          setItems={setItems}
          title="Cảnh báo vận hành & thời hạn"
        />
        <AlertSection
          category="workflow"
          description="Workflow alerts"
          emptyText="Không có điểm nghẽn quy trình"
          items={workflowItems}
          setItems={setItems}
          title="Cảnh báo công việc & quy trình"
        />
        <NotificationPanel notifications={data.notifications} />
      </div>

      {isAssigning ? <BulkAssignDialog count={selectedIds.size} onAssign={assignSelected} onClose={() => setIsAssigning(false)} /> : null}
    </main>
  );
}
