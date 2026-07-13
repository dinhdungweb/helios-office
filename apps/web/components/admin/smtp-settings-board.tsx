"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FormSelect, FormSwitch, type FormSelectOption } from "@/components/ui/form-controls";
import { Button, FormField, FormInput, FormTextarea, ModalDialog } from "@/components/ui/primitives";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  CheckCircle,
  Clock,
  EnvelopeSimple,
  FileClock,
  Key,
  Lock,
  PaperPlaneTilt,
  PencilSimple,
  ShieldCheck,
  WarningCircle,
  X
} from "@/lib/icons";
import {
  testSmtpSettingsAction,
  updateSmtpSettingsAction,
  type SmtpFormState
} from "@/lib/smtp-settings-actions";
import type {
  SmtpSecurity,
  SmtpSettings,
  SmtpSettingsData,
  SmtpSettingStatus,
  SmtpSyncStatus,
  SmtpTestStatus
} from "@/lib/smtp-settings-api";

type SmtpConfigStatus = "active" | "review" | "error" | "disabled";
type SmtpConfigItem = {
  detail: string;
  label: string;
  status: SmtpConfigStatus;
  value: string;
};

const initialState: SmtpFormState = {
  ok: false
};

const securityOptions: Array<FormSelectOption & { value: SmtpSecurity }> = [
  { value: "starttls", label: "STARTTLS", description: "Port 587, khuyến nghị cho Microsoft 365/Gmail" },
  { value: "ssl", label: "SSL/TLS", description: "Port 465" },
  { value: "none", label: "Không mã hóa", description: "Chỉ dùng trong môi trường nội bộ/dev" }
];

const settingStatusLabels: Record<SmtpSettingStatus, string> = {
  configured: "Đã cấu hình",
  needs_review: "Cần kiểm tra",
  planned: "Đang tắt"
};

const configStatusLabels: Record<SmtpConfigStatus, string> = {
  active: "Đang hoạt động",
  review: "Cần kiểm tra",
  error: "Có lỗi",
  disabled: "Đang tắt"
};

const settingStatusTones: Record<SmtpSettingStatus, BadgeTone> = {
  configured: "success",
  needs_review: "warning",
  planned: "neutral"
};

const configStatusTones: Record<SmtpConfigStatus, BadgeTone> = {
  active: "success",
  disabled: "neutral",
  error: "danger",
  review: "warning"
};

const testLabels: Record<SmtpTestStatus, string> = {
  sent: "Thành công",
  failed: "Thất bại",
  not_tested: "Chưa thử"
};

const syncLabels: Record<SmtpSyncStatus, string> = {
  synced: "Đã đồng bộ Keycloak",
  failed: "Lỗi đồng bộ",
  not_synced: "Chưa đồng bộ"
};

const fallbackSettings: SmtpSettings = {
  enabled: false,
  provider: "Microsoft 365",
  host: "smtp.office365.com",
  port: 587,
  security: "starttls",
  username: "",
  passwordSet: false,
  fromEmail: "no-reply@helios.vn",
  fromName: "Helios Office",
  dailyLimit: 1500,
  testRecipient: "admin@helios.vn",
  status: "needs_review",
  missingFields: [],
  lastTestStatus: "not_tested",
  keycloakSyncStatus: "not_synced"
};

function formatDateTime(value?: string) {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getConfigStatus(settings: SmtpSettings, field: string): SmtpConfigStatus {
  if (!settings.enabled) {
    return "disabled";
  }

  if (settings.missingFields.includes(field)) {
    return "review";
  }

  if (settings.keycloakSyncStatus === "failed" || settings.lastTestStatus === "failed") {
    return "error";
  }

  return "active";
}

function SmtpStatusBadge({ status }: { status: SmtpSettingStatus }) {
  const Icon = status === "configured" ? CheckCircle : status === "needs_review" ? WarningCircle : Clock;

  return (
    <Badge
      className={`smtp-status smtp-status--${status === "configured" ? "active" : status === "planned" ? "disabled" : "review"}`}
      icon={<Icon size={14} weight="duotone" aria-hidden="true" />}
      tone={settingStatusTones[status]}
    >
      {settingStatusLabels[status]}
    </Badge>
  );
}

function ConfigStatusBadge({ status }: { status: SmtpConfigStatus }) {
  const Icon = status === "active" ? CheckCircle : status === "disabled" ? Clock : status === "error" ? X : WarningCircle;

  return (
    <Badge
      className={`smtp-status smtp-status--${status}`}
      icon={<Icon size={14} weight="duotone" aria-hidden="true" />}
      tone={configStatusTones[status]}
    >
      {configStatusLabels[status]}
    </Badge>
  );
}

function SmtpSummary({ settings }: { settings: SmtpSettings }) {
  const summaryItems = [
    { label: "Trạng thái SMTP", value: settings.enabled ? "ON" : "OFF", icon: EnvelopeSimple },
    { label: "Giới hạn/ngày", value: settings.dailyLimit.toLocaleString("vi-VN"), icon: PaperPlaneTilt },
    { label: "Thiếu cấu hình", value: settings.missingFields.length, icon: WarningCircle },
    { label: "Test gần nhất", value: testLabels[settings.lastTestStatus], icon: FileClock }
  ];

  return (
    <section className="account-summary-grid" aria-label="Tổng quan SMTP">
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

function SaveStateMessage({ state }: { state: SmtpFormState }) {
  if (state.ok && state.message) {
    return <p className="employee-create-success" role="status">{state.message}</p>;
  }

  if (state.error) {
    return <p className="employee-create-error" role="alert">{state.error}</p>;
  }

  return null;
}

function SmtpConfigList({ items, icon: RowIcon }: { items: SmtpConfigItem[]; icon: typeof EnvelopeSimple }) {
  return (
    <div className="smtp-config-list">
      {items.map((item) => (
        <article key={item.label}>
          <span>
            <RowIcon size={17} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <header>
              <div>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </div>
              <ConfigStatusBadge status={item.status} />
            </header>
            <strong>{item.value}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

function ServerPanel({ settings }: { settings: SmtpSettings }) {
  const items: SmtpConfigItem[] = [
    {
      label: "Nhà cung cấp",
      detail: "Tên dịch vụ SMTP đang dùng",
      value: settings.provider || "Chưa cấu hình",
      status: settings.enabled ? "active" : "disabled"
    },
    {
      label: "Host",
      detail: "Máy chủ SMTP",
      value: settings.host || "Chưa cấu hình",
      status: getConfigStatus(settings, "host")
    },
    {
      label: "Port",
      detail: "Cổng kết nối SMTP",
      value: String(settings.port || "Chưa cấu hình"),
      status: getConfigStatus(settings, "port")
    },
    {
      label: "Bảo mật",
      detail: "Giao thức mã hóa",
      value: settings.security.toUpperCase(),
      status: settings.enabled ? "active" : "disabled"
    }
  ];

  return (
    <section className="account-panel" aria-labelledby="smtp-server-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-server-title">Thông tin máy chủ</h2>
          <p>Host, port và giao thức bảo mật do nhà cung cấp email cấp.</p>
        </div>
      </header>
      <SmtpConfigList icon={EnvelopeSimple} items={items} />
    </section>
  );
}

function AuthPanel({ settings }: { settings: SmtpSettings }) {
  const items: SmtpConfigItem[] = [
    {
      label: "Username",
      detail: "Tài khoản SMTP dùng để gửi mail",
      value: settings.username || "Không dùng xác thực",
      status: settings.username ? "active" : settings.enabled ? "review" : "disabled"
    },
    {
      label: "App password",
      detail: "Secret xác thực SMTP",
      value: settings.passwordSet ? "Đã lưu" : "Chưa có",
      status: settings.username ? getConfigStatus(settings, "password") : settings.enabled ? "active" : "disabled"
    }
  ];

  return (
    <section className="account-panel" aria-labelledby="smtp-auth-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-auth-title">Tài khoản gửi</h2>
          <p>Email đăng nhập và app password dùng để xác thực SMTP.</p>
        </div>
      </header>
      <SmtpConfigList icon={Key} items={items} />
    </section>
  );
}

function SenderPanel({ settings }: { settings: SmtpSettings }) {
  const items: SmtpConfigItem[] = [
    {
      label: "Email gửi đi",
      detail: "Địa chỉ xuất hiện trong From",
      value: settings.fromEmail || "Chưa cấu hình",
      status: getConfigStatus(settings, "fromEmail")
    },
    {
      label: "Tên hiển thị",
      detail: "Tên người gửi trong hộp thư",
      value: settings.fromName || "Chưa cấu hình",
      status: getConfigStatus(settings, "fromName")
    },
    {
      label: "Reply-to",
      detail: "Email nhận phản hồi",
      value: settings.replyTo || "Theo email gửi đi",
      status: settings.enabled ? "active" : "disabled"
    }
  ];

  return (
    <section className="account-panel" aria-labelledby="smtp-sender-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-sender-title">Thông tin hiển thị</h2>
          <p>Cách người nhận nhìn thấy email trong hộp thư.</p>
        </div>
      </header>
      <SmtpConfigList icon={PaperPlaneTilt} items={items} />
    </section>
  );
}

function DeliveryPanel({ settings }: { settings: SmtpSettings }) {
  const items: SmtpConfigItem[] = [
    {
      label: "Trạng thái gửi",
      detail: "Bật để invite/reset password gửi qua Keycloak",
      value: settings.enabled ? "Bật" : "Tắt",
      status: settings.enabled ? "active" : "disabled"
    },
    {
      label: "Giới hạn/ngày",
      detail: "Ngưỡng kiểm soát gửi thư",
      value: settings.dailyLimit.toLocaleString("vi-VN"),
      status: settings.enabled ? "active" : "disabled"
    },
    {
      label: "Email nhận thử",
      detail: "Địa chỉ mặc định khi test SMTP",
      value: settings.testRecipient,
      status: settings.enabled ? "active" : "disabled"
    }
  ];

  return (
    <section className="account-panel" aria-labelledby="smtp-delivery-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-delivery-title">Kiểm soát gửi thư</h2>
          <p>Trạng thái sử dụng, giới hạn gửi và email nhận thử.</p>
        </div>
      </header>
      <SmtpConfigList icon={ShieldCheck} items={items} />
    </section>
  );
}

function SettingsForm({
  onClose,
  settings
}: {
  onClose: () => void;
  settings: SmtpSettings;
}) {
  const router = useRouter();
  const handledSuccessRef = useRef(false);
  const [state, formAction, isPending] = useActionState(updateSmtpSettingsAction, initialState);

  useEffect(() => {
    if (isPending) {
      handledSuccessRef.current = false;
    }
  }, [isPending]);

  useEffect(() => {
    if (!state.ok || handledSuccessRef.current) {
      return;
    }

    handledSuccessRef.current = true;
    router.refresh();
    onClose();
  }, [onClose, router, state.ok]);

  return (
    <form className="account-dialog-form smtp-settings-modal-form" action={formAction}>
      <div className="account-dialog-grid">
        <FormField label="Nhà cung cấp">
          <FormInput name="provider" type="text" defaultValue={settings.provider} />
        </FormField>
        <FormField label="SMTP host">
          <FormInput name="host" type="text" required defaultValue={settings.host} />
        </FormField>
        <FormField label="Port">
          <FormInput name="port" type="number" min={1} max={65535} required defaultValue={settings.port} />
        </FormField>
        <FormField label="Bảo mật">
          <FormSelect
            ariaLabel="Chọn bảo mật SMTP"
            defaultValue={settings.security}
            menuLabel="Bảo mật SMTP"
            name="security"
            options={securityOptions}
            placeholder="Chọn bảo mật"
          />
        </FormField>
        <FormField label="Username">
          <FormInput name="username" type="text" autoComplete="username" defaultValue={settings.username} />
        </FormField>
        <FormField label="App password">
          <FormInput name="password" type="password" autoComplete="new-password" placeholder={settings.passwordSet ? "Đã lưu" : undefined} />
        </FormField>
        <FormField label="Email gửi đi">
          <FormInput name="fromEmail" type="email" required defaultValue={settings.fromEmail} />
        </FormField>
        <FormField label="Tên hiển thị">
          <FormInput name="fromName" type="text" required defaultValue={settings.fromName} />
        </FormField>
        <FormField label="Reply-to">
          <FormInput name="replyTo" type="email" defaultValue={settings.replyTo ?? ""} />
        </FormField>
        <FormField label="Email nhận thử">
          <FormInput name="testRecipient" type="email" defaultValue={settings.testRecipient} />
        </FormField>
        <FormField label="Giới hạn/ngày">
          <FormInput name="dailyLimit" type="number" min={1} defaultValue={settings.dailyLimit} />
        </FormField>
        <FormSwitch className="account-dialog-check" name="enabled" defaultChecked={settings.enabled} label="Bật SMTP" />
      </div>

      <fieldset className="account-dialog-permissions">
        <legend>Đồng bộ Keycloak</legend>
        <FormTextarea
          readOnly
          rows={3}
          value={`${syncLabels[settings.keycloakSyncStatus]} · ${settings.keycloakSyncMessage ?? "Chưa có ghi chú"}\nĐồng bộ gần nhất: ${formatDateTime(settings.syncedToKeycloakAt)}`}
        />
      </fieldset>

      <SaveStateMessage state={state} />

      <div className="account-dialog-actions">
        <Button variant="secondary" icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" type="submit" disabled={isPending} icon={<CheckCircle size={16} weight="duotone" aria-hidden="true" />}>
          {isPending ? "Đang lưu" : "Lưu SMTP"}
        </Button>
      </div>
    </form>
  );
}

function SmtpEditDialog({ settings }: { settings: SmtpSettings }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <Button variant="primary" icon={<PencilSimple size={16} weight="duotone" aria-hidden="true" />} onClick={() => dialogRef.current?.showModal()}>
        Sửa cấu hình
      </Button>
      {isMounted
        ? createPortal(
            <ModalDialog ref={dialogRef} title="Sửa cấu hình SMTP" onCloseRequest={closeDialog}>
              <SettingsForm settings={settings} onClose={closeDialog} />
            </ModalDialog>,
            document.body
          )
        : null}
    </>
  );
}

function TestEmailForm({
  onClose,
  settings
}: {
  onClose: () => void;
  settings: SmtpSettings;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(testSmtpSettingsAction, initialState);

  useEffect(() => {
    if (state.message) {
      router.refresh();
    }
  }, [router, state.message]);

  return (
    <form className="account-dialog-form" action={formAction}>
      <div className="account-dialog-grid">
        <FormField label="Email nhận thử" wide>
          <FormInput name="recipient" type="email" defaultValue={settings.testRecipient} />
        </FormField>
      </div>
      {state.error ? <p className="employee-create-error" role="alert">{state.error}</p> : null}
      {state.ok && state.message ? <p className="employee-create-success" role="status">{state.message}</p> : null}
      <div className="account-dialog-actions">
        <Button variant="secondary" icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={onClose}>
          Đóng
        </Button>
        <Button variant="primary" type="submit" disabled={isPending} icon={<PaperPlaneTilt size={16} weight="duotone" aria-hidden="true" />}>
          {isPending ? "Đang gửi" : "Gửi thử"}
        </Button>
      </div>
    </form>
  );
}

function SmtpTestDialog({ settings }: { settings: SmtpSettings }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <Button variant="primary" icon={<PaperPlaneTilt size={16} weight="duotone" aria-hidden="true" />} onClick={() => dialogRef.current?.showModal()}>
        Gửi thử
      </Button>
      {isMounted
        ? createPortal(
            <ModalDialog ref={dialogRef} title="Gửi thử email SMTP" onCloseRequest={closeDialog}>
              <TestEmailForm settings={settings} onClose={closeDialog} />
            </ModalDialog>,
            document.body
          )
        : null}
    </>
  );
}

function TestConnectionPanel({ settings }: { settings: SmtpSettings }) {
  return (
    <section className="account-panel" aria-labelledby="smtp-test-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-test-title">Gửi thử email</h2>
          <p>Gửi một email thật qua thông số SMTP đã lưu.</p>
        </div>
        <SmtpTestDialog settings={settings} />
      </header>

      <div className={`smtp-log-row smtp-log-row--${settings.lastTestStatus === "sent" ? "sent" : settings.lastTestStatus === "failed" ? "failed" : "queued"}`}>
        <span>
          <FileClock size={16} weight="duotone" aria-hidden="true" />
        </span>
        <div>
          <h3>{testLabels[settings.lastTestStatus]}</h3>
          <p>{settings.testRecipient}</p>
          <small>{settings.lastTestMessage ?? "Chưa có lần gửi thử."}</small>
        </div>
        <div>
          <strong>{testLabels[settings.lastTestStatus]}</strong>
          <time>{formatDateTime(settings.lastTestAt)}</time>
        </div>
      </div>
    </section>
  );
}

function AdminNotesPanel() {
  const notes = [
    {
      title: "Dùng App Password",
      body: "Không dùng mật khẩu đăng nhập thông thường. Gmail và Outlook thường yêu cầu app password hoặc SMTP AUTH.",
      icon: Lock
    },
    {
      title: "Đồng bộ Keycloak",
      body: "Khi SMTP bật và đủ thông tin, hệ thống sẽ đồng bộ cấu hình sang realm Keycloak để gửi invite/reset password.",
      icon: ShieldCheck
    },
    {
      title: "Theo dõi SPF/DKIM",
      body: "Cấu hình DNS SPF/DKIM để email không rơi vào Spam hoặc bị đánh dấu giả mạo tên miền.",
      icon: WarningCircle
    }
  ];

  return (
    <section className="account-panel" aria-labelledby="smtp-note-title">
      <header className="account-panel-header">
        <div>
          <h2 id="smtp-note-title">Lưu ý cho Admin</h2>
          <p>Các điểm quan trọng trước khi bật SMTP chính thức.</p>
        </div>
      </header>

      <div className="smtp-note-list">
        {notes.map((note) => (
          <article key={note.title}>
            <span>
              <note.icon size={17} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{note.title}</h3>
              <p>{note.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SmtpSettingsBoard({ data }: { data: SmtpSettingsData }) {
  const settings = data.settings ?? fallbackSettings;

  return (
    <main className="account-access-page smtp-settings-page" aria-label="Cấu hình SMTP">
      {data.source === "unavailable" ? (
        <section className="account-api-banner" role="status">
          <strong>Chưa kết nối được SMTP API</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      <section className="org-page-heading" aria-labelledby="smtp-page-title">
        <div>
          <span>Cài đặt hệ thống</span>
          <h1 id="smtp-page-title">Cấu hình SMTP</h1>
          <p>Thiết lập máy chủ gửi thư để hệ thống gửi invite, reset password, phiếu lương, thông báo duyệt đơn và email tự động.</p>
        </div>
        <div className="account-panel-actions">
          <a className="secondary-button" href="/admin/settings">
            Quay lại cài đặt
          </a>
          <SmtpEditDialog settings={settings} />
        </div>
      </section>

      <SmtpSummary settings={settings} />

      <section className="account-access-layout" aria-label="Thiết lập SMTP">
        <div className="account-access-main">
          <ServerPanel settings={settings} />
          <AuthPanel settings={settings} />
          <SenderPanel settings={settings} />
          <DeliveryPanel settings={settings} />
        </div>

        <aside className="account-access-side" aria-label="Kiểm tra và quản lý SMTP">
          <TestConnectionPanel settings={settings} />
          <AdminNotesPanel />
          <section className="account-panel" aria-labelledby="smtp-sync-title">
            <header className="account-panel-header">
              <div>
                <h2 id="smtp-sync-title">Trạng thái Keycloak</h2>
                <p>{syncLabels[settings.keycloakSyncStatus]}</p>
              </div>
              {settings.keycloakSyncStatus === "synced" ? (
                <CheckCircle size={18} weight="duotone" aria-hidden="true" />
              ) : (
                <WarningCircle size={18} weight="duotone" aria-hidden="true" />
              )}
            </header>
            <div className="smtp-test-box">
              <span>
                <Key size={18} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <strong>{formatDateTime(settings.syncedToKeycloakAt)}</strong>
                <p>{settings.keycloakSyncMessage ?? "Chưa đồng bộ realm SMTP."}</p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
