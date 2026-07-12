"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { FormCheckbox, FormSwitch } from "@/components/ui/form-controls";
import { Button, FormField, FormInput, FormTextarea, ModalDialog } from "@/components/ui/primitives";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  deleteDeviceAuthRequestAction,
  updateDeviceAuthPolicyAction,
  updateDeviceAuthStatusAction
} from "@/lib/device-auth-actions";
import type { DeviceAuthData, DeviceAuthPolicy, DeviceAuthRequest, DeviceAuthStatus } from "@/lib/device-auth-api";
import {
  Bell,
  CheckCircle,
  Clock,
  FunnelSimple,
  GlobeHemisphereWest,
  Lock,
  PencilSimple,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Trash,
  Users,
  X
} from "@/lib/icons";

const statusLabels: Record<DeviceAuthStatus, string> = {
  pending: "Chờ xác thực",
  approved: "Đã xác thực",
  rejected: "Đã từ chối",
  locked: "Đã khóa"
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: X,
  locked: Lock
};

const statusTones: Record<DeviceAuthStatus, BadgeTone> = {
  approved: "success",
  locked: "neutral",
  pending: "warning",
  rejected: "danger"
};

const statusFilters: DeviceAuthStatus[] = ["pending", "approved", "rejected", "locked"];

type QuickFilter = "all" | DeviceAuthStatus;
type PlatformFilter = "all" | "ios" | "android";
type ColumnKey = "device" | "deviceId" | "submittedAt" | "status";

const columnOptions: Array<{ key: ColumnKey; label: string }> = [
  { key: "device", label: "Thiết bị" },
  { key: "deviceId", label: "Device ID" },
  { key: "submittedAt", label: "Ngày gửi" },
  { key: "status", label: "Trạng thái" }
];

const defaultVisibleColumns = new Set<ColumnKey>(columnOptions.map((column) => column.key));

function getPlatform(request: DeviceAuthRequest): "ios" | "android" {
  return request.deviceId.toLowerCase().startsWith("ios") ? "ios" : "android";
}

function todayApprovalNote(status: DeviceAuthStatus) {
  if (status === "approved") {
    return "Admin đã xác thực thiết bị.";
  }

  if (status === "rejected") {
    return "Admin đã từ chối yêu cầu xác thực.";
  }

  if (status === "locked") {
    return "Thiết bị đã bị khóa quyền chấm công.";
  }

  return undefined;
}

function DeviceStatusBadge({ status }: { status: DeviceAuthStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <Badge
      className={`device-status device-status--${status}`}
      icon={<StatusIcon size={14} weight="duotone" aria-hidden="true" />}
      tone={statusTones[status]}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function DeviceAvatar({ request }: { request: DeviceAuthRequest }) {
  return (
    <span className="device-person-avatar" aria-hidden="true">
      {request.avatar}
    </span>
  );
}

function DeviceSummary({ requests }: { requests: DeviceAuthRequest[] }) {
  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const approvedCount = requests.filter((request) => request.status === "approved").length;
  const rejectedCount = requests.filter((request) => request.status === "rejected").length;
  const lockedCount = requests.filter((request) => request.status === "locked").length;
  const summaryItems = [
    { label: "Chờ xác thực", value: pendingCount, icon: Clock },
    { label: "Đã xác thực", value: approvedCount, icon: ShieldCheck },
    { label: "Đã từ chối", value: rejectedCount, icon: X },
    { label: "Đang khóa", value: lockedCount, icon: Lock }
  ];

  return (
    <section className="account-summary-grid" aria-label="Tổng quan xác thực thiết bị">
      {summaryItems.map((item) => (
        <article className="account-summary-card" key={item.label}>
          <span>
            <item.icon size={20} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <strong>{item.value}</strong>
            <p>{item.label}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function DeviceActions({
  isBusy,
  request,
  onDelete,
  onStatusChange
}: {
  isBusy: boolean;
  request: DeviceAuthRequest;
  onDelete: (requestId: string) => void;
  onStatusChange: (requestId: string, status: DeviceAuthStatus) => void;
}) {
  const canApprove = request.status === "pending" || request.status === "rejected";
  const canReject = request.status === "pending";
  const canLock = request.status === "approved";

  return (
    <div className="device-action-list" aria-label={`Tác vụ thiết bị của ${request.employeeName}`}>
      <button
        className="device-action-button device-action-button--approve"
        disabled={isBusy || !canApprove}
        type="button"
        onClick={() => onStatusChange(request.id, "approved")}
      >
        <CheckCircle size={14} weight="duotone" aria-hidden="true" />
        Xác thực
      </button>
      <button
        className="device-action-button device-action-button--reject"
        disabled={isBusy || !canReject}
        type="button"
        onClick={() => onStatusChange(request.id, "rejected")}
      >
        <X size={14} weight="duotone" aria-hidden="true" />
        Từ chối
      </button>
      <button className="device-action-button" disabled={isBusy || !canLock} type="button" onClick={() => onStatusChange(request.id, "locked")}>
        <Lock size={14} weight="duotone" aria-hidden="true" />
        Khóa
      </button>
      <button
        className="icon-button device-delete-button"
        disabled={isBusy}
        type="button"
        aria-label={`Xóa thiết bị ${request.deviceName}`}
        onClick={() => onDelete(request.id)}
      >
        <Trash size={15} weight="duotone" aria-hidden="true" />
      </button>
    </div>
  );
}

function FilterChip({
  count,
  filter,
  isSelected,
  label,
  onClick
}: {
  count: number;
  filter: QuickFilter;
  isSelected: boolean;
  label: string;
  onClick: (filter: QuickFilter) => void;
}) {
  return (
    <button className={isSelected ? "is-selected" : undefined} type="button" data-filter={filter} onClick={() => onClick(filter)}>
      <span>{label}</span>
      <strong>{count}</strong>
    </button>
  );
}

function FilterOption({
  isSelected,
  label,
  meta,
  onClick
}: {
  isSelected: boolean;
  label: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button className={isSelected ? "is-selected" : undefined} type="button" onClick={onClick}>
      <span>{label}</span>
      {meta ? <small>{meta}</small> : null}
    </button>
  );
}

function useToolbarMenu() {
  const [openMenu, setOpenMenu] = useState<"filter" | "columns" | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  return { openMenu, rootRef, setOpenMenu };
}

function countByStatus(requests: DeviceAuthRequest[], status: DeviceAuthStatus) {
  return requests.filter((request) => request.status === status).length;
}

function DeviceRequestTable({
  requests,
  setRequests
}: {
  requests: DeviceAuthRequest[];
  setRequests: Dispatch<SetStateAction<DeviceAuthRequest[]>>;
}) {
  const { openMenu, rootRef, setOpenMenu } = useToolbarMenu();
  const [isMutating, startTransition] = useTransition();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(defaultVisibleColumns));

  const departments = useMemo(() => Array.from(new Set(requests.map((request) => request.department))), [requests]);
  const branches = useMemo(() => Array.from(new Set(requests.map((request) => request.branch))), [requests]);

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        if (quickFilter !== "all" && request.status !== quickFilter) {
          return false;
        }

        if (departmentFilter !== "all" && request.department !== departmentFilter) {
          return false;
        }

        if (branchFilter !== "all" && request.branch !== branchFilter) {
          return false;
        }

        if (platformFilter !== "all" && getPlatform(request) !== platformFilter) {
          return false;
        }

        return true;
      }),
    [branchFilter, departmentFilter, platformFilter, quickFilter, requests]
  );

  const activeFilterCount =
    (quickFilter === "all" ? 0 : 1) +
    (departmentFilter === "all" ? 0 : 1) +
    (branchFilter === "all" ? 0 : 1) +
    (platformFilter === "all" ? 0 : 1);

  function handleStatusChange(requestId: string, status: DeviceAuthStatus) {
    setMutationError(null);
    startTransition(async () => {
      const result = await updateDeviceAuthStatusAction(requestId, status);

      if (!result.ok) {
        setMutationError(result.error);
        return;
      }

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? result.request ?? {
                ...request,
                status,
                lastUsedAt: status === "approved" ? request.lastUsedAt ?? "Vừa xác thực" : request.lastUsedAt,
                note: todayApprovalNote(status) ?? request.note
              }
            : request
        )
      );
    });
  }

  function handleDelete(requestId: string) {
    setMutationError(null);
    startTransition(async () => {
      const result = await deleteDeviceAuthRequestAction(requestId);

      if (!result.ok) {
        setMutationError(result.error);
        return;
      }

      setRequests((current) => current.filter((request) => request.id !== requestId));
    });
  }

  function resetFilters() {
    setQuickFilter("all");
    setDepartmentFilter("all");
    setBranchFilter("all");
    setPlatformFilter("all");
  }

  function toggleColumn(column: ColumnKey) {
    setVisibleColumns((current) => {
      const next = new Set(current);

      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }

      return next;
    });
  }

  return (
    <section className="account-panel device-table-panel" aria-labelledby="device-table-title">
      <header className="account-panel-header">
        <div>
          <h2 id="device-table-title">Danh sách yêu cầu xác thực thiết bị</h2>
          <p>
            {filteredRequests.length}/{requests.length} thiết bị từ App chấm công GPS/Wifi
          </p>
        </div>
        <div className="account-panel-actions account-toolbar" ref={rootRef}>
          <div className="account-toolbar-item">
            <button
              className={activeFilterCount > 0 ? "secondary-button is-active" : "secondary-button"}
              type="button"
              aria-expanded={openMenu === "filter"}
              onClick={() => setOpenMenu((current) => (current === "filter" ? null : "filter"))}
            >
              <FunnelSimple size={16} weight="duotone" aria-hidden="true" />
              Bộ lọc
              {activeFilterCount > 0 ? <span className="account-toolbar-count">{activeFilterCount}</span> : null}
            </button>

            {openMenu === "filter" ? (
              <div className="account-toolbar-menu account-filter-menu">
                <section>
                  <h3>Phòng ban</h3>
                  <div className="account-option-list">
                    <FilterOption isSelected={departmentFilter === "all"} label="Tất cả" onClick={() => setDepartmentFilter("all")} />
                    {departments.map((department) => (
                      <FilterOption
                        isSelected={departmentFilter === department}
                        label={department}
                        meta={`${requests.filter((request) => request.department === department).length} thiết bị`}
                        key={department}
                        onClick={() => setDepartmentFilter(department)}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h3>Chi nhánh</h3>
                  <div className="account-option-list">
                    <FilterOption isSelected={branchFilter === "all"} label="Tất cả" onClick={() => setBranchFilter("all")} />
                    {branches.map((branch) => (
                      <FilterOption
                        isSelected={branchFilter === branch}
                        label={branch}
                        meta={`${requests.filter((request) => request.branch === branch).length} thiết bị`}
                        key={branch}
                        onClick={() => setBranchFilter(branch)}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h3>Nền tảng</h3>
                  <div className="account-option-list">
                    <FilterOption isSelected={platformFilter === "all"} label="Tất cả" onClick={() => setPlatformFilter("all")} />
                    <FilterOption isSelected={platformFilter === "ios"} label="iOS" onClick={() => setPlatformFilter("ios")} />
                    <FilterOption isSelected={platformFilter === "android"} label="Android" onClick={() => setPlatformFilter("android")} />
                  </div>
                </section>

                <footer>
                  <button className="secondary-button" type="button" onClick={resetFilters}>
                    Đặt lại
                  </button>
                </footer>
              </div>
            ) : null}
          </div>

          <div className="account-toolbar-item">
            <button
              className="secondary-button"
              type="button"
              aria-expanded={openMenu === "columns"}
              onClick={() => setOpenMenu((current) => (current === "columns" ? null : "columns"))}
            >
              <SlidersHorizontal size={16} weight="duotone" aria-hidden="true" />
              Cột
            </button>

            {openMenu === "columns" ? (
              <div className="account-toolbar-menu account-column-menu">
                <section>
                  <h3>Cột hiển thị</h3>
                  <div className="account-column-list">
                    {columnOptions.map((column) => (
                      <FormCheckbox
                        checked={visibleColumns.has(column.key)}
                        label={column.label}
                        key={column.key}
                        onChange={() => toggleColumn(column.key)}
                      />
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {mutationError ? (
        <div className="account-api-banner device-action-error" role="alert">
          <strong>Chưa lưu thao tác</strong>
          <span>{mutationError}</span>
        </div>
      ) : null}

      <div className="account-filter-row device-filter-row" aria-label="Bộ lọc xác thực thiết bị">
        <FilterChip filter="all" isSelected={quickFilter === "all"} label="Tất cả" count={requests.length} onClick={setQuickFilter} />
        {statusFilters.map((status) => (
          <FilterChip
            filter={status}
            isSelected={quickFilter === status}
            label={statusLabels[status]}
            count={countByStatus(requests, status)}
            key={status}
            onClick={setQuickFilter}
          />
        ))}
      </div>

      <div className="account-table-shell" tabIndex={0} aria-label="Bảng yêu cầu thiết bị có thể cuộn ngang">
        <table className="account-table device-auth-table">
          <thead>
            <tr>
              <th scope="col">Nhân sự</th>
              {visibleColumns.has("device") ? <th scope="col">Thiết bị</th> : null}
              {visibleColumns.has("deviceId") ? <th scope="col">Device ID</th> : null}
              {visibleColumns.has("submittedAt") ? <th scope="col">Ngày gửi</th> : null}
              {visibleColumns.has("status") ? <th scope="col">Trạng thái</th> : null}
              <th scope="col">Tác vụ</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((request) => (
              <tr key={request.id}>
                <th scope="row">
                  <span className="account-person-cell">
                    <DeviceAvatar request={request} />
                    <span>
                      <strong>{request.employeeName}</strong>
                      <small>{request.employeeCode} · {request.department}</small>
                    </span>
                  </span>
                </th>
                {visibleColumns.has("device") ? (
                  <td>
                    <span className="device-name-cell">
                      <Phone size={16} weight="duotone" aria-hidden="true" />
                      <span>
                        <strong>{request.deviceName}</strong>
                        <small>{request.branch}</small>
                      </span>
                    </span>
                  </td>
                ) : null}
                {visibleColumns.has("deviceId") ? (
                  <td>
                    <code>{request.deviceId}</code>
                    {request.note ? <small>{request.note}</small> : null}
                  </td>
                ) : null}
                {visibleColumns.has("submittedAt") ? (
                  <td>
                    <span>{request.submittedAt}</span>
                    {request.lastUsedAt ? <small>Dùng gần nhất: {request.lastUsedAt}</small> : null}
                  </td>
                ) : null}
                {visibleColumns.has("status") ? (
                  <td>
                    <DeviceStatusBadge status={request.status} />
                  </td>
                ) : null}
                <td>
                  <DeviceActions
                    isBusy={isMutating}
                    request={request}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                </td>
              </tr>
            ))}
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.size + 2}>
                  <span className="account-empty-state">Không có thiết bị phù hợp bộ lọc.</span>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DevicePolicyDialog({
  onPolicyChange,
  policy
}: {
  onPolicyChange: (policy: DeviceAuthPolicy) => void;
  policy: DeviceAuthPolicy;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [draft, setDraft] = useState<DeviceAuthPolicy>(policy);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const isDirty =
    draft.maxDevicesPerUser !== policy.maxDevicesPerUser ||
    draft.requireNotificationEnabled !== policy.requireNotificationEnabled ||
    draft.requireGpsForAttendance !== policy.requireGpsForAttendance ||
    draft.requireWifiForOffice !== policy.requireWifiForOffice ||
    draft.approvalRefreshHint !== policy.approvalRefreshHint;

  useEffect(() => {
    setDraft(policy);
  }, [policy]);

  function updateDraft(nextValue: Partial<DeviceAuthPolicy>) {
    setMessage(null);
    setDraft((current) => ({ ...current, ...nextValue }));
  }

  function resetDraft() {
    setMessage(null);
    setDraft(policy);
  }

  function openDialog() {
    resetDraft();
    dialogRef.current?.showModal();
  }

  function savePolicy() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateDeviceAuthPolicyAction(draft);

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      if (result.policy) {
        onPolicyChange(result.policy);
        setDraft(result.policy);
      }

      dialogRef.current?.close();
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={openDialog}>
        <PencilSimple size={16} weight="duotone" aria-hidden="true" />
        Sửa
      </Button>
      <ModalDialog className="device-policy-dialog" ref={dialogRef} title="Sửa cài đặt thiết bị" onCloseRequest={() => dialogRef.current?.close()}>
        <form
          className="account-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            savePolicy();
          }}
        >
          <div className="account-dialog-grid">
            <FormField label="Giới hạn thiết bị" wide>
              <FormInput
                type="number"
                min={1}
                max={5}
                value={draft.maxDevicesPerUser}
                onChange={(event) =>
                  updateDraft({
                    maxDevicesPerUser: Math.max(1, Number(event.target.value) || 1)
                  })
                }
              />
            </FormField>

            <FormField label="Ghi chú sau xác thực" wide>
              <FormTextarea
                rows={4}
                value={draft.approvalRefreshHint}
                onChange={(event) => updateDraft({ approvalRefreshHint: event.target.value })}
              />
            </FormField>
          </div>

          <fieldset className="account-dialog-permissions device-policy-dialog-rules">
            <legend>Quy tắc kiểm soát</legend>
            <div className="device-policy-dialog-toggle-list">
              <article>
                <span>
                  <Bell size={17} weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <h3>Thông báo App</h3>
                  <p>{draft.requireNotificationEnabled ? "Bắt buộc bật thông báo" : "Không bắt buộc"}</p>
                </div>
                <FormSwitch
                  checked={draft.requireNotificationEnabled}
                  label={draft.requireNotificationEnabled ? "Bật" : "Tắt"}
                  onChange={(event) => updateDraft({ requireNotificationEnabled: event.target.checked })}
                />
              </article>

              <article>
                <span>
                  <GlobeHemisphereWest size={17} weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <h3>GPS chấm công</h3>
                  <p>{draft.requireGpsForAttendance ? "Bắt buộc định vị" : "Không bắt buộc"}</p>
                </div>
                <FormSwitch
                  checked={draft.requireGpsForAttendance}
                  label={draft.requireGpsForAttendance ? "Bật" : "Tắt"}
                  onChange={(event) => updateDraft({ requireGpsForAttendance: event.target.checked })}
                />
              </article>

              <article>
                <span>
                  <ShieldCheck size={17} weight="duotone" aria-hidden="true" />
                </span>
                <div>
                  <h3>Wifi văn phòng</h3>
                  <p>{draft.requireWifiForOffice ? "Kiểm tra theo dải mạng" : "Không kiểm tra"}</p>
                </div>
                <FormSwitch
                  checked={draft.requireWifiForOffice}
                  label={draft.requireWifiForOffice ? "Bật" : "Tắt"}
                  onChange={(event) => updateDraft({ requireWifiForOffice: event.target.checked })}
                />
              </article>
            </div>
          </fieldset>

          {message ? (
            <p className={`device-policy-message device-policy-message--${message.tone}`}>{message.text}</p>
          ) : null}

          <div className="account-dialog-actions">
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() => {
                resetDraft();
                dialogRef.current?.close();
              }}
            >
              <X size={16} weight="duotone" aria-hidden="true" />
              Hủy
            </Button>
            <Button variant="primary" type="submit" disabled={isPending || !isDirty}>
              <CheckCircle size={16} weight="duotone" aria-hidden="true" />
              {isPending ? "Đang lưu" : "Lưu"}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </>
  );
}

function DevicePolicyPanel({
  onPolicyChange,
  policy
}: {
  onPolicyChange: (policy: DeviceAuthPolicy) => void;
  policy: DeviceAuthPolicy;
}) {
  const settings = [
    {
      label: "Giới hạn thiết bị",
      value: `${policy.maxDevicesPerUser} thiết bị / nhân viên`,
      icon: Phone
    },
    {
      label: "Thông báo App",
      value: policy.requireNotificationEnabled ? "Bắt buộc bật thông báo" : "Không bắt buộc",
      icon: Bell
    },
    {
      label: "GPS chấm công",
      value: policy.requireGpsForAttendance ? "Bắt buộc định vị" : "Không bắt buộc",
      icon: GlobeHemisphereWest
    },
    {
      label: "Wifi văn phòng",
      value: policy.requireWifiForOffice ? "Kiểm tra theo dải mạng" : "Không kiểm tra",
      icon: ShieldCheck
    }
  ];

  return (
    <section className="account-panel" aria-labelledby="device-policy-title">
      <header className="account-panel-header">
        <div>
          <h2 id="device-policy-title">Cài đặt nâng cao</h2>
          <p>Quy tắc kiểm soát thiết bị chấm công</p>
        </div>
        <div className="account-panel-actions">
          <DevicePolicyDialog policy={policy} onPolicyChange={onPolicyChange} />
        </div>
      </header>

      <div className="device-policy-list">
        {settings.map((setting) => (
          <article key={setting.label}>
            <span>
              <setting.icon size={17} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{setting.label}</h3>
              <p>{setting.value}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DeviceAdminNotesPanel({ policy }: { policy: DeviceAuthPolicy }) {
  const notes = [
    "Nhân viên phải bật thông báo cho App trước khi gửi yêu cầu xác thực.",
    policy.approvalRefreshHint,
    "Khi nhân viên mất máy hoặc đổi máy, Admin nên xóa thiết bị cũ trước khi duyệt thiết bị mới."
  ];

  return (
    <section className="account-panel" aria-labelledby="device-note-title">
      <header className="account-panel-header">
        <div>
          <h2 id="device-note-title">Lưu ý cho Admin</h2>
          <p>Các bước giúp trạng thái cập nhật đúng trên App</p>
        </div>
      </header>

      <div className="device-note-list">
        {notes.map((note) => (
          <article key={note}>
            <span>
              <CheckCircle size={15} weight="duotone" aria-hidden="true" />
            </span>
            <p>{note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DeviceScopePanel({ requests }: { requests: DeviceAuthRequest[] }) {
  const pendingByDepartment = Array.from(new Set(requests.map((request) => request.department))).map(
    (department) => ({
      department,
      count: requests.filter((request) => request.department === department && request.status === "pending").length
    })
  );

  return (
    <section className="account-panel" aria-labelledby="device-scope-title">
      <header className="account-panel-header">
        <div>
          <h2 id="device-scope-title">Theo phòng ban</h2>
          <p>Lọc nhanh yêu cầu cần xử lý</p>
        </div>
      </header>

      <div className="device-scope-list">
        {pendingByDepartment.map((item) => (
          <article key={item.department}>
            <span>
              <Users size={16} weight="duotone" aria-hidden="true" />
            </span>
            <strong>{item.department}</strong>
            <p>{item.count} yêu cầu chờ</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ApiStatusBanner({ data }: { data: DeviceAuthData }) {
  if (data.source === "api") {
    return null;
  }

  return (
    <section className="account-api-banner" role="status">
      <strong>Chưa kết nối được Device Auth API</strong>
      <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
    </section>
  );
}

export function DeviceAuthSettingsClient({ data }: { data: DeviceAuthData }) {
  const [requests, setRequests] = useState<DeviceAuthRequest[]>(data.requests);
  const [policy, setPolicy] = useState<DeviceAuthPolicy>(data.policy);

  useEffect(() => {
    setRequests(data.requests);
    setPolicy(data.policy);
  }, [data]);

  return (
    <main className="account-access-page device-auth-page" aria-label="Xác thực thiết bị chấm công">
      <ApiStatusBanner data={data} />

      <section className="org-page-heading" aria-labelledby="device-auth-page-title">
        <div>
          <span>Cài đặt hệ thống · Tài khoản người dùng</span>
          <h1 id="device-auth-page-title">Xác thực thiết bị</h1>
          <p>Quản lý điện thoại cá nhân được phép chấm công qua App, GPS và Wifi.</p>
        </div>
        <a className="secondary-button" href="/admin/settings/accounts">
          Quay lại tài khoản
        </a>
      </section>

      <DeviceSummary requests={requests} />

      <section className="account-access-layout" aria-label="Quản lý xác thực thiết bị">
        <div className="account-access-main">
          <DeviceRequestTable requests={requests} setRequests={setRequests} />
        </div>
        <aside className="account-access-side" aria-label="Cài đặt và lưu ý thiết bị">
          <DevicePolicyPanel policy={policy} onPolicyChange={setPolicy} />
          <DeviceScopePanel requests={requests} />
          <DeviceAdminNotesPanel policy={policy} />
        </aside>
      </section>
    </main>
  );
}
