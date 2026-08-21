"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FormSwitch } from "@/components/ui/form-controls";
import { X } from "@/lib/icons";

type SystemSettings = {
  commentEditLimitHours: number;
  oneDriveClientId: string;
  useSelfLink: boolean;
  pdfViewer: string;
  usePdfViewerForOfficeFiles: boolean;
  showNotificationPopup: boolean;
  requirePasswordChange: boolean;
  requireDeviceVerification: boolean;
  watermarkPdfDownloads: boolean;
  addQrCodeToPdfForms: boolean;
};

const preferenceScope = "admin.system-settings";

const defaultSettings: SystemSettings = {
  commentEditLimitHours: 0,
  oneDriveClientId: "",
  useSelfLink: false,
  pdfViewer: "default",
  usePdfViewerForOfficeFiles: false,
  showNotificationPopup: false,
  requirePasswordChange: false,
  requireDeviceVerification: false,
  watermarkPdfDownloads: false,
  addQrCodeToPdfForms: false
};

function readSystemSettings(value: unknown): SystemSettings {
  if (!value || typeof value !== "object") {
    return defaultSettings;
  }

  const candidate = value as Partial<SystemSettings>;

  return {
    commentEditLimitHours: typeof candidate.commentEditLimitHours === "number"
      ? Math.max(0, candidate.commentEditLimitHours)
      : defaultSettings.commentEditLimitHours,
    oneDriveClientId: typeof candidate.oneDriveClientId === "string"
      ? candidate.oneDriveClientId
      : defaultSettings.oneDriveClientId,
    useSelfLink: Boolean(candidate.useSelfLink),
    pdfViewer: typeof candidate.pdfViewer === "string" ? candidate.pdfViewer : defaultSettings.pdfViewer,
    usePdfViewerForOfficeFiles: Boolean(candidate.usePdfViewerForOfficeFiles),
    showNotificationPopup: Boolean(candidate.showNotificationPopup),
    requirePasswordChange: Boolean(candidate.requirePasswordChange),
    requireDeviceVerification: Boolean(candidate.requireDeviceVerification),
    watermarkPdfDownloads: Boolean(candidate.watermarkPdfDownloads),
    addQrCodeToPdfForms: Boolean(candidate.addQrCodeToPdfForms)
  };
}

function SettingsSwitch({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <FormSwitch
      checked={checked}
      className="system-settings-switch"
      label={<span className="sr-only">{label}</span>}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

export function SystemSettingsBoard() {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    fetch(`/api/user-preferences/${encodeURIComponent(preferenceScope)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Preference read returned ${response.status}`);
        }

        return response.json() as Promise<{ value?: unknown }>;
      })
      .then((preference) => {
        if (isActive) {
          setSettings(readSystemSettings(preference.value));
        }
      })
      .catch(() => {
        if (isActive) {
          setError("Chưa tải được cài đặt đã lưu. Bạn vẫn có thể cập nhật lại.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const updateSetting = <Key extends keyof SystemSettings,>(key: Key, value: SystemSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setError(null);
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/user-preferences/${encodeURIComponent(preferenceScope)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: settings })
      });

      if (!response.ok) {
        throw new Error(`Preference update returned ${response.status}`);
      }

      setMessage("Đã cập nhật cài đặt hệ thống.");
    } catch {
      setError("Chưa cập nhật được cài đặt. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="system-settings-form" aria-busy={isLoading || isSaving} onSubmit={saveSettings}>
      <div className="system-settings-content">
        <section className="system-settings-card" aria-labelledby="settings-comments-title">
          <header><h2 id="settings-comments-title">Comments</h2></header>
          <div className="system-settings-row">
            <div>
              <label htmlFor="comment-limit-hours">Thời gian cấm sửa/xóa comment (giờ)</label>
              <p>Nếu bạn cài đặt 2h, thì sau khi user comment 2h sẽ không thể sửa xóa comment đó</p>
            </div>
            <input
              className="system-settings-number-input"
              id="comment-limit-hours"
              min="0"
              type="number"
              value={settings.commentEditLimitHours}
              onChange={(event) => updateSetting("commentEditLimitHours", Number(event.target.value) || 0)}
            />
          </div>
        </section>

        <section className="system-settings-card" aria-labelledby="settings-picker-title">
          <header><h2 id="settings-picker-title">Picker</h2></header>
          <div className="system-settings-subsection">
            <h3>OneDrive</h3>
            <div className="system-settings-row is-indented">
              <div>
                <label htmlFor="onedrive-client-id">Client ID</label>
                <p>Client ID sử dụng để tích hợp OneDrive picker</p>
              </div>
              <input
                id="onedrive-client-id"
                placeholder="Nhập Client ID"
                type="text"
                value={settings.oneDriveClientId}
                onChange={(event) => updateSetting("oneDriveClientId", event.target.value)}
              />
            </div>
            <div className="system-settings-row is-indented">
              <div>
                <span className="system-settings-label">Self link</span>
                <p>Sử dụng tên miền hiện tại để mở picker</p>
              </div>
              <SettingsSwitch
                checked={settings.useSelfLink}
                label="Sử dụng tên miền hiện tại để mở picker"
                onChange={(checked) => updateSetting("useSelfLink", checked)}
              />
            </div>
          </div>
        </section>

        <section className="system-settings-card" aria-labelledby="settings-viewer-title">
          <header><h2 id="settings-viewer-title">Trình xem tài liệu</h2></header>
          <div className="system-settings-subsection">
            <h3>PDF</h3>
            <div className="system-settings-row is-indented">
              <div>
                <label htmlFor="pdf-viewer">Trình xem tài liệu PDF</label>
                <p>Công cụ hỗ trợ xem tài liệu định dạng PDF</p>
              </div>
              <div className="system-settings-select-wrap">
                <select
                  id="pdf-viewer"
                  value={settings.pdfViewer}
                  onChange={(event) => updateSetting("pdfViewer", event.target.value)}
                >
                  <option value="" disabled>Chọn trình xem PDF</option>
                  <option value="default">PDF mặc định</option>
                  <option value="browser">Trình xem của trình duyệt</option>
                </select>
                {settings.pdfViewer !== "" ? (
                  <button type="button" aria-label="Xóa lựa chọn trình xem PDF" onClick={() => updateSetting("pdfViewer", "")}>
                    <X size={15} weight="duotone" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="system-settings-subsection is-separated">
            <h3>Excel &amp; Docs</h3>
            <div className="system-settings-row is-indented">
              <div>
                <span className="system-settings-label">Dùng trình xem PDF để đọc file Excel &amp; Docs</span>
                <p>Sử dụng trình xem mặc định của 1Office thay vì gọi đến máy chủ bên ngoài (Microsoft, Google)</p>
              </div>
              <SettingsSwitch
                checked={settings.usePdfViewerForOfficeFiles}
                label="Dùng trình xem PDF để đọc file Excel và Docs"
                onChange={(checked) => updateSetting("usePdfViewerForOfficeFiles", checked)}
              />
            </div>
          </div>
        </section>

        <section className="system-settings-card" aria-labelledby="settings-notification-title">
          <header><h2 id="settings-notification-title">Thông báo</h2></header>
          <div className="system-settings-row">
            <div>
              <span className="system-settings-label">Mặc định hiển thị popup khi click vào thông báo</span>
              <p>Áp dụng cho tài khoản chưa có cài đặt này tại cài đặt cá nhân</p>
            </div>
            <SettingsSwitch
              checked={settings.showNotificationPopup}
              label="Mặc định hiển thị popup khi click vào thông báo"
              onChange={(checked) => updateSetting("showNotificationPopup", checked)}
            />
          </div>
        </section>

        <section className="system-settings-card" aria-labelledby="settings-security-title">
          <header><h2 id="settings-security-title">Bảo mật</h2></header>
          <div className="system-settings-row is-compact">
            <span className="system-settings-label">Bắt buộc thay đổi mật khẩu ở lần đăng nhập đầu tiên</span>
            <SettingsSwitch
              checked={settings.requirePasswordChange}
              label="Bắt buộc thay đổi mật khẩu ở lần đăng nhập đầu tiên"
              onChange={(checked) => updateSetting("requirePasswordChange", checked)}
            />
          </div>
          <div className="system-settings-row is-compact">
            <span className="system-settings-label">Bắt buộc xác thực thiết bị trước khi sử dụng phần mềm</span>
            <SettingsSwitch
              checked={settings.requireDeviceVerification}
              label="Bắt buộc xác thực thiết bị trước khi sử dụng phần mềm"
              onChange={(checked) => updateSetting("requireDeviceVerification", checked)}
            />
          </div>
        </section>

        <section className="system-settings-card" aria-labelledby="settings-other-title">
          <header><h2 id="settings-other-title">Khác</h2></header>
          <div className="system-settings-row is-compact">
            <span className="system-settings-label">Gắn watermark lên file PDF khi thực hiện tải xuống</span>
            <SettingsSwitch
              checked={settings.watermarkPdfDownloads}
              label="Gắn watermark lên file PDF khi tải xuống"
              onChange={(checked) => updateSetting("watermarkPdfDownloads", checked)}
            />
          </div>
          <div className="system-settings-row is-compact">
            <span className="system-settings-label">Gắn mã QR khi xuất biểu mẫu PDF</span>
            <SettingsSwitch
              checked={settings.addQrCodeToPdfForms}
              label="Gắn mã QR khi xuất biểu mẫu PDF"
              onChange={(checked) => updateSetting("addQrCodeToPdfForms", checked)}
            />
          </div>
        </section>
      </div>

      <footer className="system-settings-submit-bar">
        <button className="system-settings-submit" disabled={isLoading || isSaving} type="submit">
          {isSaving ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT"}
        </button>
        <span className={error ? "system-settings-feedback is-error" : "system-settings-feedback"} role="status" aria-live="polite">
          {error ?? message}
        </span>
      </footer>
    </form>
  );
}
