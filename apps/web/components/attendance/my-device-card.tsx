"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckInPanel } from "@/components/attendance/check-in-panel";
import { ModalDialog } from "@/components/ui/primitives";
import { registerThisDeviceAction, withdrawDeviceAction } from "@/lib/my-device-actions";
import type { MyDevice, MyDeviceData, MyDeviceStatus } from "@/lib/my-device";

const STATUS: Record<MyDeviceStatus, { label: string; tone: string }> = {
  pending: { label: "Chờ HR duyệt", tone: "is-pending" },
  approved: { label: "Đã duyệt", tone: "is-approved" },
  rejected: { label: "Bị từ chối", tone: "is-rejected" },
  locked: { label: "Đã khoá", tone: "is-locked" }
};

function vnDateTime(value: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", hour12: false })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value])
  );
  return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year}`;
}

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

function RegisterDialog({ suggestedName, resend, onClose }: { suggestedName: string; resend: boolean; onClose: () => void }) {
  const router = useRouter();
  const ref = useModal();
  const [name, setName] = useState(suggestedName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const submit = () =>
    startTransition(async () => {
      setError(null);
      const result = await registerThisDeviceAction(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  return (
    <ModalDialog className="shift-dialog my-device-dialog" ref={ref} title={resend ? "Gửi lại yêu cầu thiết bị" : "Đăng ký thiết bị chấm công"} onCancel={onClose} onCloseRequest={onClose}>
      <div className="account-dialog-form">
        <p className="timesheet-period-text">Trình duyệt này sẽ được gửi cho HR duyệt. Sau khi duyệt, bạn chấm công vào / ra ngay trên trình duyệt này.</p>
        <label className="account-dialog-field">
          <span>Tên thiết bị</span>
          <input autoFocus maxLength={80} placeholder="VD: Laptop công ty" value={name} onChange={(event) => setName(event.target.value)} />
          <small className="my-device-hint">Đặt tên dễ nhận ra để HR biết đây là máy nào.</small>
        </label>
        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
        <div className="account-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            HỦY BỎ
          </button>
          <button className="primary-button" disabled={isPending || !name.trim()} type="button" onClick={submit}>
            {isPending ? "ĐANG GỬI..." : "GỬI YÊU CẦU"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

function DevicesDialog({ devices, maxDevices, onClose }: { devices: MyDevice[]; maxDevices: number; onClose: () => void }) {
  const router = useRouter();
  const ref = useModal();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const active = devices.filter((device) => device.status === "pending" || device.status === "approved").length;
  const withdraw = (device: MyDevice) =>
    startTransition(async () => {
      setError(null);
      const result = await withdrawDeviceAction(device.id);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  return (
    <ModalDialog className="shift-dialog my-device-dialog" ref={ref} title="Thiết bị chấm công của tôi" onCancel={onClose} onCloseRequest={onClose}>
      <div className="account-dialog-form">
        <p className="timesheet-period-text">
          Đang dùng {active}/{maxDevices} thiết bị cho phép. Thiết bị đã duyệt muốn gỡ thì nhờ HR.
        </p>
        <ul className="my-device-list">
          {devices.map((device) => (
            <li key={device.id}>
              <div>
                <strong>
                  {device.deviceName}
                  {device.current ? <span className="my-device-current">Trình duyệt này</span> : null}
                </strong>
                <small>
                  Gửi lúc {vnDateTime(device.submittedAt)}
                  {device.lastUsedAt ? ` · dùng lần cuối ${vnDateTime(device.lastUsedAt)}` : ""}
                  {device.status === "rejected" && device.note ? ` · ${device.note}` : ""}
                </small>
              </div>
              <span className={`my-device-status ${STATUS[device.status].tone}`}>{STATUS[device.status].label}</span>
              {device.status === "pending" || device.status === "rejected" ? (
                <button className="secondary-button" disabled={isPending} type="button" onClick={() => withdraw(device)}>
                  {device.status === "pending" ? "Rút yêu cầu" : "Xoá"}
                </button>
              ) : (
                <span />
              )}
            </li>
          ))}
          {devices.length === 0 ? <li className="my-device-empty">Bạn chưa đăng ký thiết bị nào.</li> : null}
        </ul>
        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
        <div className="account-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            ĐÓNG
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

// DV-05 and AT-13: this browser's approval for check-in and the check-in buttons, on the personal
// timesheet. Check-in shows once the device is approved, or always when the policy needs no device.
export function MyDeviceCard({ data }: { data: MyDeviceData }) {
  const [dialog, setDialog] = useState<"register" | "list" | null>(null);
  if (data.source === "unavailable") return null;
  const current = data.current;
  const canCheckIn = current?.status === "approved" || !data.rules.requireApprovedDevice;

  let message: ReactNode;
  let action: ReactNode = null;
  if (!current && !data.rules.requireApprovedDevice) {
    message = "Công ty không yêu cầu duyệt thiết bị, bạn chấm công được ngay trên trình duyệt này.";
  } else if (!current) {
    message = "Trình duyệt này chưa được đăng ký chấm công. Gửi yêu cầu để HR duyệt.";
    action = (
      <button className="primary-button" type="button" onClick={() => setDialog("register")}>
        Đăng ký thiết bị này
      </button>
    );
  } else if (current.status === "pending") {
    message = `Đã gửi lúc ${vnDateTime(current.submittedAt)}, đang chờ HR duyệt.`;
  } else if (current.status === "approved") {
    message = "Bạn có thể chấm công vào / ra trên trình duyệt này.";
  } else if (current.status === "rejected") {
    message = `HR đã từ chối${current.note ? `: ${current.note}` : "."}`;
    action = (
      <button className="primary-button" type="button" onClick={() => setDialog("register")}>
        Gửi lại
      </button>
    );
  } else {
    message = "Thiết bị đã bị khoá quyền chấm công. Liên hệ HR.";
  }

  return (
    <section className="my-device-card" aria-label="Thiết bị chấm công">
      <div className="my-device-main">
        <div className="my-device-title">
          <span>Thiết bị này</span>
          <strong>{current?.deviceName ?? data.suggestedName}</strong>
          {current ? <span className={`my-device-status ${STATUS[current.status].tone}`}>{STATUS[current.status].label}</span> : <span className="my-device-status is-none">Chưa đăng ký</span>}
        </div>
        <p>{message}</p>
      </div>
      <div className="my-device-actions">
        {action}
        <button className="my-device-link" type="button" onClick={() => setDialog("list")}>
          Thiết bị của tôi ({data.devices.length})
        </button>
      </div>
      {canCheckIn ? <CheckInPanel punches={data.punches} rules={data.rules} /> : null}
      {dialog === "register" ? <RegisterDialog resend={Boolean(current)} suggestedName={current?.deviceName ?? data.suggestedName} onClose={() => setDialog(null)} /> : null}
      {dialog === "list" ? <DevicesDialog devices={data.devices} maxDevices={data.maxDevices} onClose={() => setDialog(null)} /> : null}
    </section>
  );
}
