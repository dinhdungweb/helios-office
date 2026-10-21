"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { FormSwitch } from "@/components/ui/form-controls";
import { updateTwoFactorPolicyAction, type TwoFactorPolicy } from "@/lib/security-policy-actions";

const defaultPolicy: TwoFactorPolicy = {
  enforced: false,
  verificationMinutes: 20,
  payrollRequired: false,
  otpDigits: 6,
  otpPeriodSeconds: 30
};

function SettingsSelect({
  ariaLabel,
  children,
  onChange,
  value
}: {
  ariaLabel: string;
  children: ReactNode;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <div className="system-settings-select-wrap">
      <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {children}
      </select>
    </div>
  );
}

// AU-18: company-wide two-factor policy. The API refuses sessions that have not passed 2FA while
// it is enforced, and asks payroll to verify again after verificationMinutes.
export function TwoFactorSettingsBoard({ initialPolicy, loadError }: { initialPolicy: TwoFactorPolicy | null; loadError: string | null }) {
  const [settings, setSettings] = useState(initialPolicy ?? defaultPolicy);
  const [isSaving, startSaving] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(
    loadError ? { message: `Chưa tải được cài đặt đã lưu: ${loadError}`, error: true } : null
  );

  const updateSetting = <Key extends keyof TwoFactorPolicy,>(key: Key, value: TwoFactorPolicy[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  };

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    startSaving(async () => {
      const result = await updateTwoFactorPolicyAction(settings);
      if (result.ok) {
        setSettings(result.data);
        setFeedback({ message: "Đã cập nhật cài đặt bảo mật 2 lớp.", error: false });
      } else {
        setFeedback({ message: result.error, error: true });
      }
    });
  };

  return (
    <form className="system-settings-form is-short" aria-busy={isSaving} onSubmit={saveSettings}>
      <div className="system-settings-content">
        <section className="system-settings-card" aria-labelledby="two-factor-policy-title">
          <header><h2 id="two-factor-policy-title">Chính sách bắt buộc</h2></header>
          <div className="system-settings-row">
            <div>
              <span className="system-settings-label">Bắt buộc bảo mật 2 lớp</span>
              <p>
                Khi bật, mọi user đăng nhập bằng tên/mật khẩu phải nhập thêm mã OTP từ app xác thực (Google/Microsoft Authenticator) hoặc
                mã gửi qua email (cần bật SMTP). User chưa thiết lập app sẽ được hướng dẫn thiết lập ngay ở lần đăng nhập tới. Trước khi bật,
                hãy tự thiết lập app ở trang Phiên & lịch sử đăng nhập để không tự khoá mình.
              </p>
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
              value={settings.verificationMinutes}
              onChange={(value) => updateSetting("verificationMinutes", value)}
            >
              <option value={10}>10 phút</option>
              <option value={20}>20 phút</option>
              <option value={30}>30 phút</option>
              <option value={60}>60 phút</option>
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
            <div>
              <span className="system-settings-label">Số ký tự mã OTP tự sinh</span>
              <p>Áp dụng cho app thiết lập sau khi đổi và cho mã gửi qua email. Một số app chỉ hỗ trợ 6 ký tự.</p>
            </div>
            <SettingsSelect ariaLabel="Số ký tự mã OTP tự sinh" value={settings.otpDigits} onChange={(value) => updateSetting("otpDigits", value)}>
              <option value={4}>4 kí tự</option>
              <option value={6}>6 kí tự</option>
              <option value={8}>8 kí tự</option>
            </SettingsSelect>
          </div>
          <div className="system-settings-row">
            <div>
              <span className="system-settings-label">Thời gian hiệu lực mã OTP tự sinh</span>
              <p>Thời gian thực tự sinh mã OTP. Ví dụ: cứ sau 45 giây, hệ thống sẽ tự sinh mã OTP. App đã thiết lập giữ chu kỳ cũ.</p>
            </div>
            <SettingsSelect
              ariaLabel="Thời gian hiệu lực mã OTP tự sinh"
              value={settings.otpPeriodSeconds}
              onChange={(value) => updateSetting("otpPeriodSeconds", value)}
            >
              <option value={30}>30 giây</option>
              <option value={45}>45 giây</option>
              <option value={60}>60 giây</option>
            </SettingsSelect>
          </div>
        </section>
      </div>

      <footer className="system-settings-submit-bar">
        <button className="system-settings-submit" disabled={isSaving} type="submit">
          {isSaving ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT"}
        </button>
        <span className={feedback?.error ? "system-settings-feedback is-error" : "system-settings-feedback"} role="status" aria-live="polite">
          {feedback?.message}
        </span>
      </footer>
    </form>
  );
}
