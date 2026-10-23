"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModalDialog, StateBlock } from "@/components/ui/primitives";
import {
  createDeviceAction,
  deleteDeviceAction,
  resolveSyncErrorAction,
  searchSyncErrorCandidatesAction,
  setDeviceStatusAction,
  updateDeviceAction,
  type SyncErrorCandidate
} from "@/lib/attendance-device-actions";
import type { AttendanceDeviceRecord, DeviceBoardData, DeviceView, Paged, SyncErrorRecord } from "@/lib/attendance-device-api";
import { PencilSimple, Plus, Trash, WarningCircle } from "@/lib/icons";

const VERIFY_LABELS: Record<string, string> = {
  finger: "Vân tay",
  fingerprint: "Vân tay",
  face: "Khuôn mặt",
  card: "Thẻ",
  password: "Mật khẩu",
  pin: "Mật khẩu",
  // Web/app check-ins (AT-13): how the place was confirmed.
  gps: "GPS",
  ip: "Mạng văn phòng",
  wifi: "Wifi",
  none: "Không kiểm tra vị trí"
};

// Built from parts: vi-VN Intl prints dates as "22-10" in some runtimes.
function vnParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("day")}/${get("month")}/${get("year")}`, time: `${get("hour")}:${get("minute")}`, seconds: get("second") };
}

function vnDateTime(value: string | null, withSeconds = false) {
  if (!value) return "—";
  const parts = vnParts(value);
  return `${parts.date} ${parts.time}${withSeconds ? `:${parts.seconds}` : ""}`;
}

function sinceLabel(value: string | null) {
  if (!value) return "Chưa đồng bộ";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} giờ trước`;
  return vnDateTime(value);
}

// Shared shell for the small forms below; opens as a modal on mount.
function useModal() {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);
  return ref;
}

function DialogActions({ busy, disabled, label, busyLabel, tone = "primary", onCancel, onSubmit }: { busy: boolean; disabled?: boolean; label: string; busyLabel: string; tone?: "primary" | "danger"; onCancel: () => void; onSubmit: () => void }) {
  return (
    <div className="account-dialog-actions">
      <button className="secondary-button" type="button" onClick={onCancel}>
        HỦY BỎ
      </button>
      <button className={tone === "danger" ? "primary-button device-danger-button" : "primary-button"} disabled={busy || disabled} type="button" onClick={onSubmit}>
        {busy ? busyLabel : label}
      </button>
    </div>
  );
}

// AT-19: register or edit a machine. The id cannot change once punches refer to it.
function DeviceDialog({ device, workplaces, onClose, onDone }: { device: AttendanceDeviceRecord | null; workplaces: Array<{ id: string; name: string }>; onClose: () => void; onDone: () => void }) {
  const ref = useModal();
  const [form, setForm] = useState({
    deviceId: device?.deviceId ?? "",
    deviceName: device?.deviceName ?? "",
    storeCode: device?.storeCode ?? "",
    workplaceId: device?.workplaceId ?? "",
    note: device?.note ?? ""
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const validId = /^[A-Za-z0-9._-]{1,64}$/.test(form.deviceId.trim());

  const submit = async () => {
    setError(null);
    setIsSaving(true);
    const result = device ? await updateDeviceAction(device.id, form) : await createDeviceAction(form);
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
    onClose();
  };

  return (
    <ModalDialog className="shift-dialog" ref={ref} title={device ? `Sửa máy ${device.deviceId}` : "Thêm máy chấm công"} onCancel={onClose} onCloseRequest={onClose}>
      <div className="account-dialog-form">
        <div className="device-form-grid">
          <label className="account-dialog-field">
            <span>Mã máy *</span>
            <input autoFocus={!device} disabled={Boolean(device)} maxLength={64} placeholder="VD: VP-HN-01" value={form.deviceId} onChange={set("deviceId")} />
            <small>{device ? "Không đổi được vì log chấm công đã gắn với mã này." : "Trùng device_id máy gửi khi đồng bộ (chữ, số, . _ -)."}</small>
          </label>
          <label className="account-dialog-field">
            <span>Tên máy</span>
            <input autoFocus={Boolean(device)} maxLength={120} placeholder="VD: Máy cửa chính tầng 1" value={form.deviceName} onChange={set("deviceName")} />
          </label>
          <label className="account-dialog-field">
            <span>Địa điểm làm việc</span>
            <select value={form.workplaceId} onChange={set("workplaceId")}>
              <option value="">— Chưa gán —</option>
              {workplaces.map((workplace) => (
                <option key={workplace.id} value={workplace.id}>
                  {workplace.name}
                </option>
              ))}
            </select>
            {workplaces.length === 0 ? (
              <small>
                Chưa có địa điểm nào. Thêm ở{" "}
                <a href="/admin/settings/workplaces" target="_blank" rel="noreferrer">
                  Cài đặt › Địa điểm làm việc
                </a>
                .
              </small>
            ) : null}
          </label>
          <label className="account-dialog-field">
            <span>Mã cửa hàng</span>
            <input maxLength={64} placeholder="Không bắt buộc" value={form.storeCode} onChange={set("storeCode")} />
          </label>
        </div>
        <label className="account-dialog-field">
          <span>Ghi chú</span>
          <textarea maxLength={500} rows={2} value={form.note} onChange={set("note")} />
        </label>
        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
        <DialogActions busy={isSaving} busyLabel="ĐANG LƯU..." disabled={!device && !validId} label={device ? "LƯU" : "THÊM MÁY"} onCancel={onClose} onSubmit={submit} />
      </div>
    </ModalDialog>
  );
}

function DeleteDeviceDialog({ device, onClose, onDone }: { device: AttendanceDeviceRecord; onClose: () => void; onDone: () => void }) {
  const ref = useModal();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const submit = async () => {
    setError(null);
    setIsSaving(true);
    const result = await deleteDeviceAction(device.id);
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
    onClose();
  };
  return (
    <ModalDialog className="shift-dialog" ref={ref} title="Xoá máy chấm công" onCancel={onClose} onCloseRequest={onClose}>
      <div className="account-dialog-form">
        <p className="timesheet-period-text">
          Xoá máy <strong>{device.deviceName || device.deviceId}</strong> ({device.deviceId})? Máy chưa có log chấm công nên xoá không mất dữ liệu. Nếu máy gửi dữ liệu lại, hệ thống sẽ tự đăng ký lại mã này.
        </p>
        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
        <DialogActions busy={isSaving} busyLabel="ĐANG XOÁ..." label="XOÁ MÁY" tone="danger" onCancel={onClose} onSubmit={submit} />
      </div>
    </ModalDialog>
  );
}

// AT-20: give an unknown code to the right person; every refused punch with that code is imported.
function AssignDialog({ error: syncError, onClose, onDone }: { error: SyncErrorRecord; onClose: () => void; onDone: (message: string) => void }) {
  const ref = useModal();
  const [term, setTerm] = useState("");
  const [candidates, setCandidates] = useState<SyncErrorCandidate[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const result = await searchSyncErrorCandidatesAction(term);
      if (id !== requestId.current) return;
      if (result.ok) setCandidates(result.data);
      else setError(result.error);
    }, term ? 250 : 0);
    return () => clearTimeout(timer);
  }, [term]);

  const submit = async () => {
    if (!selected) return;
    setError(null);
    setIsSaving(true);
    const result = await resolveSyncErrorAction(syncError.id, { action: "assign", employeeId: selected });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const person = candidates?.find((item) => item.id === selected);
    onDone(`Đã gán mã ${syncError.employeeCode} cho ${person?.fullName ?? "nhân sự"}: nhập ${result.data.imported} lượt chấm, xử lý ${result.data.resolved} lỗi và tính lại công.`);
    onClose();
  };

  return (
    <ModalDialog className="shift-dialog device-assign-dialog" ref={ref} title={`Gán mã chấm công ${syncError.employeeCode}`} onCancel={onClose} onCloseRequest={onClose}>
      <div className="account-dialog-form">
        <p className="timesheet-period-text">
          Máy <strong>{syncError.device.deviceName || syncError.device.deviceId}</strong> gửi mã <strong>{syncError.employeeCode}</strong> nhưng chưa nhân sự nào có mã này.
          Chọn người dùng mã này: mã được lưu vào hồ sơ, <strong>{syncError.sameCodeOpen}</strong> lượt chấm bị từ chối với mã này được nhập lại và công được tính lại.
        </p>
        <label className="account-dialog-field">
          <span>Tìm nhân sự</span>
          <input autoFocus placeholder="Tên, mã nhân viên hoặc mã chấm công" value={term} onChange={(event) => setTerm(event.target.value)} />
        </label>
        <div className="device-candidates" role="radiogroup" aria-label="Nhân sự">
          {candidates === null ? <p className="device-muted">Đang tìm...</p> : null}
          {candidates?.length === 0 ? <p className="device-muted">Không có nhân sự phù hợp trong phạm vi của bạn.</p> : null}
          {candidates?.map((person) => {
            const hasOther = Boolean(person.attendanceCode && person.attendanceCode.toLowerCase() !== syncError.employeeCode?.toLowerCase());
            return (
              <label key={person.id} className={["device-candidate", selected === person.id ? "is-selected" : "", hasOther ? "is-disabled" : ""].filter(Boolean).join(" ")}>
                <input checked={selected === person.id} disabled={hasOther} name="candidate" type="radio" onChange={() => setSelected(person.id)} />
                <span>
                  <strong>{person.fullName}</strong>
                  <small>
                    {person.code} · {person.department}
                    {person.attendanceCode ? ` · mã chấm công ${person.attendanceCode}` : ""}
                  </small>
                </span>
              </label>
            );
          })}
        </div>
        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
        <DialogActions busy={isSaving} busyLabel="ĐANG GÁN..." disabled={!selected} label="GÁN VÀ NHẬP LOG" onCancel={onClose} onSubmit={submit} />
      </div>
    </ModalDialog>
  );
}

function DismissDialog({ error: syncError, onClose, onDone }: { error: SyncErrorRecord; onClose: () => void; onDone: (message: string) => void }) {
  const ref = useModal();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const submit = async () => {
    setError(null);
    setIsSaving(true);
    const result = await resolveSyncErrorAction(syncError.id, { action: "dismiss", note });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone("Đã bỏ qua lỗi.");
    onClose();
  };
  return (
    <ModalDialog className="shift-dialog" ref={ref} title="Bỏ qua lỗi đồng bộ" onCancel={onClose} onCloseRequest={onClose}>
      <div className="account-dialog-form">
        <p className="timesheet-period-text">
          Lượt chấm {syncError.employeeCode ? <>mã <strong>{syncError.employeeCode}</strong> </> : null}lúc {vnDateTime(syncError.punchTime, true)} sẽ không được tính công. Lỗi chuyển sang mục đã xử lý.
        </p>
        <label className="account-dialog-field">
          <span>Lý do (không bắt buộc)</span>
          <textarea autoFocus maxLength={500} placeholder="VD: Mã thử máy, nhân sự đã nghỉ việc" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
        <DialogActions busy={isSaving} busyLabel="ĐANG XỬ LÝ..." label="BỎ QUA" onCancel={onClose} onSubmit={submit} />
      </div>
    </ModalDialog>
  );
}

function Pager<T>({ data, unit, busy, onPage }: { data: Paged<T>; unit: string; busy: boolean; onPage: (page: number) => void }) {
  const first = data.total ? (data.page - 1) * data.limit + 1 : 0;
  const last = Math.min(data.total, data.page * data.limit);
  return (
    <footer className="timesheet-footer device-footer">
      <span />
      <div className="timesheet-pages">
        <span>{data.total ? `${first}–${last} / ${data.total} ${unit}` : `0 ${unit}`}</span>
        <button disabled={data.page <= 1 || busy} type="button" onClick={() => onPage(data.page - 1)}>
          ‹ Trước
        </button>
        <button disabled={data.page >= data.pageCount || busy} type="button" onClick={() => onPage(data.page + 1)}>
          Sau ›
        </button>
      </div>
    </footer>
  );
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td className="device-empty" colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}

type Props = {
  data: DeviceBoardData;
  access: { devices: boolean; errors: boolean; logs: boolean };
  filters: { from: string; to: string; deviceId: string; q: string; status: string };
};

// "Công → Máy chấm công" (AT-19/20/21), like 1Office: machines, punches the sync refused and the
// raw punch log.
export function AttendanceDevicesBoard({ data, access, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(filters.q);
  const [editing, setEditing] = useState<AttendanceDeviceRecord | "new" | null>(null);
  const [deleting, setDeleting] = useState<AttendanceDeviceRecord | null>(null);
  const [assigning, setAssigning] = useState<SyncErrorRecord | null>(null);
  const [dismissing, setDismissing] = useState<SyncErrorRecord | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();

  const navigate = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(changes).forEach(([key, value]) => (value ? params.set(key, value) : params.delete(key)));
      if (!("page" in changes)) params.delete("page");
      startNavigation(() => router.push(`${pathname}?${params.toString()}` as Route, { scroll: false }));
    },
    [pathname, router, searchParams]
  );
  const done = useCallback(
    (text: string) => {
      setNotice({ tone: "success", text });
      router.refresh();
    },
    [router]
  );

  const views: Array<{ key: DeviceView; label: string; badge?: number | null }> = [
    ...(access.devices ? [{ key: "devices" as const, label: "Danh sách máy" }] : []),
    ...(access.errors ? [{ key: "errors" as const, label: "Lỗi đồng bộ", badge: data.source === "api" ? data.openErrors : null }] : []),
    ...(access.logs ? [{ key: "logs" as const, label: "Dữ liệu chấm công" }] : [])
  ];
  const switchView = (view: DeviceView) => navigate({ view, q: null, deviceId: null, status: null, from: null, to: null });

  const toggleStatus = async (device: AttendanceDeviceRecord) => {
    setNotice(null);
    setTogglingId(device.id);
    const result = await setDeviceStatusAction(device.id, device.status === "active" ? "inactive" : "active");
    setTogglingId(null);
    if (!result.ok) setNotice({ tone: "error", text: result.error });
    else done(device.status === "active" ? `Đã tắt máy ${device.deviceId}: dữ liệu máy gửi lên sẽ bị từ chối.` : `Đã bật lại máy ${device.deviceId}.`);
  };

  const deviceFilter =
    data.source === "api" && data.devices.length > 0 ? (
      <select aria-label="Máy" value={filters.deviceId} onChange={(event) => navigate({ deviceId: event.target.value || null })}>
        <option value="">Tất cả máy</option>
        {data.devices.map((device) => (
          <option key={device.id} value={device.deviceId}>
            {device.deviceName ? `${device.deviceName} (${device.deviceId})` : device.deviceId}
          </option>
        ))}
      </select>
    ) : null;
  const searchBox = (placeholder: string) => (
    <form
      className="timesheet-search"
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ q: search.trim() || null });
      }}
    >
      <input aria-label={placeholder} placeholder={placeholder} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
    </form>
  );

  return (
    <section className="timesheet device-board" aria-labelledby="device-board-title">
      <header className="timesheet-toolbar">
        <h1 id="device-board-title">Máy chấm công</h1>
        {views.length > 1 ? (
          <div className="timesheet-display device-views" role="tablist" aria-label="Mục">
            {views.map((item) => (
              <button key={item.key} aria-selected={data.view === item.key} className={data.view === item.key ? "is-active" : undefined} role="tab" type="button" onClick={() => switchView(item.key)}>
                {item.label}
                {item.badge ? <span className="device-badge">{item.badge}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {data.source === "unavailable" ? (
        <StateBlock tone="error" title="Chưa tải được dữ liệu">
          {data.error}
        </StateBlock>
      ) : (
        <>
          <div className="timesheet-toolbar device-filters">
            {data.view === "devices" ? (
              <>
                <p className="device-hint">
                  Máy gửi dữ liệu về Helios kèm <strong>mã máy</strong>. Máy lạ được tự thêm ở lần đồng bộ đầu; tắt máy để từ chối dữ liệu mà vẫn giữ lịch sử.
                </p>
                <button className="primary-button device-add" type="button" onClick={() => setEditing("new")}>
                  <Plus size={16} weight="bold" aria-hidden="true" /> Thêm máy
                </button>
              </>
            ) : null}
            {data.view === "errors" ? (
              <>
                <select aria-label="Trạng thái" value={filters.status || "open"} onChange={(event) => navigate({ status: event.target.value === "open" ? null : event.target.value })}>
                  <option value="open">Chưa xử lý</option>
                  <option value="resolved">Đã xử lý</option>
                  <option value="all">Tất cả</option>
                </select>
                {deviceFilter}
                {searchBox("Tìm theo mã chấm công")}
              </>
            ) : null}
            {data.view === "logs" && data.logs ? (
              <>
                <div className="device-range" role="group" aria-label="Khoảng ngày">
                  <input aria-label="Từ ngày" max={data.logs.to} type="date" value={data.logs.from} onChange={(event) => event.target.value && navigate({ from: event.target.value })} />
                  <span aria-hidden="true">→</span>
                  <input aria-label="Đến ngày" min={data.logs.from} type="date" value={data.logs.to} onChange={(event) => event.target.value && navigate({ to: event.target.value })} />
                </div>
                {deviceFilter}
                {searchBox("Tìm theo tên hoặc mã nhân viên")}
              </>
            ) : null}
          </div>

          {notice ? (
            <p className={notice.tone === "error" ? "account-dialog-error" : "device-notice"} role={notice.tone === "error" ? "alert" : "status"}>
              {notice.text}
            </p>
          ) : null}

          {data.view === "devices" ? (
            <div className={isNavigating ? "timesheet-table-shell device-table-shell is-loading" : "timesheet-table-shell device-table-shell"}>
              <table className="device-table">
                <thead>
                  <tr>
                    <th scope="col">Mã máy</th>
                    <th scope="col">Tên máy</th>
                    <th scope="col">Địa điểm</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Đồng bộ gần nhất</th>
                    <th className="is-number" scope="col">Lượt chấm</th>
                    <th className="is-number" scope="col">Lỗi</th>
                    <th scope="col">Ghi chú</th>
                    <th scope="col">
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.devices.map((device) => (
                    <tr key={device.id} className={device.status === "inactive" ? "is-inactive" : undefined}>
                      <td className="device-code">{device.deviceId}</td>
                      <th scope="row">
                        {device.deviceName || <span className="device-muted">Chưa đặt tên</span>}
                        {device.storeCode ? <small>Cửa hàng {device.storeCode}</small> : null}
                      </th>
                      <td>{device.workplace?.name ?? <span className="device-muted">—</span>}</td>
                      <td>
                        <button
                          aria-checked={device.status === "active"}
                          className="device-switch"
                          disabled={togglingId === device.id}
                          role="switch"
                          title={device.status === "active" ? "Tắt máy" : "Bật máy"}
                          type="button"
                          onClick={() => toggleStatus(device)}
                        >
                          <span aria-hidden="true" />
                          {device.status === "active" ? "Đang hoạt động" : "Đã tắt"}
                        </button>
                      </td>
                      <td title={vnDateTime(device.lastSyncAt, true)}>{sinceLabel(device.lastSyncAt)}</td>
                      <td className="is-number">
                        {device.logCount > 0 && access.logs ? (
                          <button className="device-link" type="button" onClick={() => navigate({ view: "logs", deviceId: device.deviceId, q: null, status: null })}>
                            {device.logCount.toLocaleString("vi-VN")}
                          </button>
                        ) : (
                          device.logCount
                        )}
                      </td>
                      <td className="is-number">
                        {device.errorCount > 0 && access.errors ? (
                          <button className="device-link is-danger" type="button" onClick={() => navigate({ view: "errors", deviceId: device.deviceId, status: "all", q: null })}>
                            {device.errorCount}
                          </button>
                        ) : (
                          <span className="device-muted">0</span>
                        )}
                      </td>
                      <td className="device-note">{device.note ?? ""}</td>
                      <td className="device-actions">
                        <button aria-label={`Sửa máy ${device.deviceId}`} title="Sửa" type="button" onClick={() => setEditing(device)}>
                          <PencilSimple size={16} aria-hidden="true" />
                        </button>
                        <button
                          aria-label={`Xoá máy ${device.deviceId}`}
                          disabled={device.logCount + device.errorCount > 0}
                          title={device.logCount + device.errorCount > 0 ? "Máy đã có log, chỉ tắt được" : "Xoá"}
                          type="button"
                          onClick={() => setDeleting(device)}
                        >
                          <Trash size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data.devices.length === 0 ? <EmptyRow colSpan={9}>Chưa có máy chấm công nào. Thêm máy hoặc cho máy đồng bộ lần đầu.</EmptyRow> : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {data.view === "errors" && data.errors ? (
            <>
              <div className={isNavigating ? "timesheet-table-shell device-table-shell is-loading" : "timesheet-table-shell device-table-shell"}>
                <table className="device-table">
                  <thead>
                    <tr>
                      <th scope="col">Giờ chấm</th>
                      <th scope="col">Máy</th>
                      <th scope="col">Mã chấm công</th>
                      <th scope="col">Lỗi</th>
                      <th scope="col">Nhận lúc</th>
                      <th scope="col">Xử lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.errors.items.map((item) => (
                      <tr key={item.id}>
                        <td className="device-time">{vnDateTime(item.punchTime, true)}</td>
                        <td>{item.device.deviceName || item.device.deviceId}</td>
                        <td className="device-code">
                          {item.employeeCode ?? "—"}
                          {!item.resolvedAt && item.sameCodeOpen > 1 ? <small>{item.sameCodeOpen} lượt cùng mã</small> : null}
                        </td>
                        <td>
                          <span className="device-error-label">
                            <WarningCircle size={14} aria-hidden="true" /> {item.errorLabel}
                          </span>
                        </td>
                        <td className="device-time">{vnDateTime(item.createdAt)}</td>
                        <td className="device-resolve">
                          {item.resolvedAt ? (
                            <span className={item.resolution === "assigned" ? "device-resolved is-assigned" : "device-resolved"} title={vnDateTime(item.resolvedAt)}>
                              {item.resolution === "assigned" ? "Đã gán" : "Đã bỏ qua"}
                              {item.resolutionNote ? <small>{item.resolutionNote}</small> : null}
                            </span>
                          ) : (
                            <>
                              {item.errorType === "EMPLOYEE_NOT_FOUND" && item.employeeCode ? (
                                <button className="primary-button" type="button" onClick={() => setAssigning(item)}>
                                  Gán nhân sự
                                </button>
                              ) : null}
                              <button className="secondary-button" type="button" onClick={() => setDismissing(item)}>
                                Bỏ qua
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                    {data.errors.items.length === 0 ? (
                      <EmptyRow colSpan={6}>{(filters.status || "open") === "open" ? "Không còn lỗi đồng bộ nào cần xử lý." : "Không có lỗi nào phù hợp."}</EmptyRow>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <Pager busy={isNavigating} data={data.errors} unit="lỗi" onPage={(page) => navigate({ page: String(page) })} />
            </>
          ) : null}

          {data.view === "logs" && data.logs ? (
            <>
              <div className={isNavigating ? "timesheet-table-shell device-table-shell is-loading" : "timesheet-table-shell device-table-shell"}>
                <table className="device-table">
                  <thead>
                    <tr>
                      <th scope="col">Giờ chấm</th>
                      <th scope="col">Mã NV</th>
                      <th scope="col">Họ và tên</th>
                      <th scope="col">Phòng ban</th>
                      <th scope="col">Mã chấm công</th>
                      <th scope="col">Máy</th>
                      <th scope="col">Hình thức</th>
                      <th scope="col">Đồng bộ lúc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.items.map((log) => (
                      <tr key={log.id}>
                        <td className="device-time">{vnDateTime(log.punchTime, true)}</td>
                        <td className="device-code">{log.employee.code}</td>
                        <th scope="row">{log.employee.fullName}</th>
                        <td>{log.employee.department}</td>
                        <td className="device-code">{log.employeeCode}</td>
                        <td>
                          {log.source === "machine" ? log.device.deviceName || log.device.deviceId : `${log.source === "app" ? "App" : "Web"}${log.device.deviceName ? ` · ${log.device.deviceName}` : ""}`}
                          {log.locationName ? <small>{log.locationName}</small> : null}
                        </td>
                        <td>{log.verifyType ? VERIFY_LABELS[log.verifyType.toLowerCase()] ?? log.verifyType : <span className="device-muted">—</span>}</td>
                        <td className="device-time">{vnDateTime(log.syncedAt)}</td>
                      </tr>
                    ))}
                    {data.logs.items.length === 0 ? <EmptyRow colSpan={8}>Không có lượt chấm nào trong khoảng ngày này.</EmptyRow> : null}
                  </tbody>
                </table>
              </div>
              <Pager busy={isNavigating} data={data.logs} unit="lượt chấm" onPage={(page) => navigate({ page: String(page) })} />
            </>
          ) : null}

          {editing ? <DeviceDialog device={editing === "new" ? null : editing} workplaces={data.workplaces} onClose={() => setEditing(null)} onDone={() => done(editing === "new" ? "Đã thêm máy." : "Đã lưu máy.")} /> : null}
          {deleting ? <DeleteDeviceDialog device={deleting} onClose={() => setDeleting(null)} onDone={() => done("Đã xoá máy.")} /> : null}
          {assigning ? <AssignDialog error={assigning} onClose={() => setAssigning(null)} onDone={done} /> : null}
          {dismissing ? <DismissDialog error={dismissing} onClose={() => setDismissing(null)} onDone={done} /> : null}
        </>
      )}
    </section>
  );
}
