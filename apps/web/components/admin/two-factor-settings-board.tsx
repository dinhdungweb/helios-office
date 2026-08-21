"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FormSwitch } from "@/components/ui/form-controls";
import { X } from "@/lib/icons";

type TwoFactorSettings = {
  enforced: boolean;
  verificationSessionMinutes: string;
  payrollRequired: boolean;
  otpLength: string;
  otpLifetimeSeconds: string;
};

const preferenceScope = "admin.two-factor-settings";
const defaultSettings: TwoFactorSettings = {
  enforced: false,
  verificationSessionMinutes: "20",
  payrollRequired: false,
  otpLength: "6",
  otpLifetimeSeconds: "30"
};

function readTwoFactorSettings(value: unknown): TwoFactorSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const candidate = value as Partial<TwoFactorSettings>;

  return {
    enforced: Boolean(candidate.enforced),
    verificationSessionMinutes: typeof candidate.verificationSessionMinutes === "string" ? candidate.verificationSessionMinutes : "20",
    payrollRequired: Boolean(candidate.payrollRequired),
    otpLength: typeof candidate.otpLength === "string" ? candidate.otpLength : "6",
    otpLifetimeSeconds: typeof candidate.otpLifetimeSeconds === "string" ? candidate.otpLifetimeSeconds : "30"
  };
}

function SettingsSelect({
  ariaLabel,
  children,
  onClear,
  onChange,
  value
}: {
  ariaLabel: string;
  children: React.ReactNode;
  onClear: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="system-settings-select-wrap">
      <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
      {value ? (
        <button type="button" aria-label={`Xóa ${ariaLabel.toLowerCase()}`} onClick={onClear}>
          <X size={15} weight="duotone" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export function TwoFactorSettingsBoard() {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);

  useEffect(() => {
    let isActive = true;

    fetch(`/api/user-preferences/${encodeURIComponent(preferenceScope)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Preference read returned ${response.status}`);
        return response.json() as Promise<{ value?: unknown }>;
      })
      .then((preference) => {
        if (isActive) setSettings(readTwoFactorSettings(preference.value));
      })
      .catch(() => {
        if (isActive) setFeedback({ message: "Chưa tải được cài đặt đã lưu.", error: true });
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => { isActive = false; };
  }, []);

  const updateSetting = <Key extends keyof TwoFactorSettings,>(key: Key, value: TwoFactorSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/user-preferences/${encodeURIComponent(preferenceScope)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: settings })
      });

      if (!response.ok) throw new Error(`Preference update returned ${response.status}`);
      setFeedback({ message: "Đã cập nhật cài đặt bảo mật 2 lớp.", error: false });
    } catch {
      setFeedback({ message: "Chưa cập nhật được cài đặt. Vui lòng thử lại.", error: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="system-settings-form is-short" aria-busy={isLoading || isSaving} onSubmit={saveSettings}>
      <div className="system-settings-content">
        <section className="system-settings-card" aria-labelledby="two-factor-policy-title">
          <header><h2 id="two-factor-policy-title">Chính sách bắt buộc</h2></header>
          <div className="system-settings-row">
            <div>
              <span className="system-settings-label">Bắt buộc bảo mật 2 lớp</span>
              <p>Khi bật, mọi user đăng nhập bằng tên/mật khẩu phải xác thực OTP qua email/SĐT/SmartOTP. User chưa có email/SĐT sẽ bị chặn login cho đến khi admin bổ sung. Lưu ý: Đăng nhập qua SSO (OAuth/SAML) dựa vào MFA của nhà cung cấp, không bị ép bởi setting này.</p>
            </div>
            <FormSwitch
              checked={settings.enforced}
              className="system-settings-switch"
              label={<span className="sr-only">Bắt buộc bảo mật 2 lớp</span>}
              onChange={(event) => updateSetting("enforced", event.target.checked)}
            />
          </div>
          <div className="system-settings-row">
            <div>
              <span className="system-settings-label">Thời gian hiệu lực phiên xác thực</span>
              <p>Sau khi xác thực OTP thành công, các tính năng yêu cầu bảo mật 2 lớp sẽ không hỏi lại mã trong khoảng thời gian này.</p>
            </div>
            <SettingsSelect
              ariaLabel="Thời gian hiệu lực phiên xác thực"
              value={settings.verificationSessionMinutes}
              onChange={(value) => updateSetting("verificationSessionMinutes", value)}
              onClear={() => updateSetting("verificationSessionMinutes", "")}
            >
              <option value="" disabled>Chọn thời gian</option>
              <option value="10">10 phút</option>
              <option value="20">20 phút</option>
              <option value="30">30 phút</option>
              <option value="60">60 phút</option>
            </SettingsSelect>
          </div>
        </section>

        <section className="system-settings-card" aria-labelledby="two-factor-features-title">
          <header><h2 id="two-factor-features-title">Tính năng yêu cầu sử dụng bảo mật 2 lớp</h2></header>
          <div className="system-settings-row is-compact">
            <span className="system-settings-label">Xem bảng lương công ty</span>
            <FormSwitch
              checked={settings.payrollRequired}
              className="system-settings-switch"
              label={<span className="sr-only">Yêu cầu bảo mật 2 lớp khi xem bảng lương công ty</span>}
              onChange={(event) => updateSetting("payrollRequired", event.target.checked)}
            />
          </div>
        </section>

        <section className="system-settings-card" aria-labelledby="otp-settings-title">
          <header><h2 id="otp-settings-title">Mã OTP tự sinh</h2></header>
          <div className="system-settings-row">
            <span className="system-settings-label">Số ký tự mã OTP tự sinh</span>
            <SettingsSelect
              ariaLabel="Số ký tự mã OTP tự sinh"
              value={settings.otpLength}
              onChange={(value) => updateSetting("otpLength", value)}
              onClear={() => updateSetting("otpLength", "")}
            >
              <option value="" disabled>Chọn số ký tự</option>
              <option value="4">4 kí tự</option>
              <option value="6">6 kí tự</option>
              <option value="8">8 kí tự</option>
            </SettingsSelect>
          </div>
          <div className="system-settings-row">
            <div>
              <span className="system-settings-label">Thời gian hiệu lực mã OTP tự sinh</span>
              <p>Thời gian thực tự sinh mã OTP. Ví dụ: cứ sau 45 giây, hệ thống sẽ tự sinh mã OTP</p>
            </div>
            <SettingsSelect
              ariaLabel="Thời gian hiệu lực mã OTP tự sinh"
              value={settings.otpLifetimeSeconds}
              onChange={(value) => updateSetting("otpLifetimeSeconds", value)}
              onClear={() => updateSetting("otpLifetimeSeconds", "")}
            >
              <option value="" disabled>Chọn thời gian</option>
              <option value="30">30 giây</option>
              <option value="45">45 giây</option>
              <option value="60">60 giây</option>
            </SettingsSelect>
          </div>
        </section>
      </div>

      <footer className="system-settings-submit-bar">
        <button className="system-settings-submit" disabled={isLoading || isSaving} type="submit">
          {isSaving ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT"}
        </button>
        <span className={feedback?.error ? "system-settings-feedback is-error" : "system-settings-feedback"} role="status" aria-live="polite">
          {feedback?.message}
        </span>
      </footer>
    </form>
  );
}
