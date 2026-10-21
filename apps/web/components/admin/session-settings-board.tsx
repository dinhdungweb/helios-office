"use client";

import { useState, useTransition, type FormEvent } from "react";
import { FormSwitch } from "@/components/ui/form-controls";
import { updateSessionPolicyAction, type SessionPolicy } from "@/lib/security-policy-actions";

const defaultPolicy: SessionPolicy = {
  autoLogoutEnabled: false,
  idleMinutes: 30,
  warningSeconds: 60,
  maxConcurrentSessions: 0
};

// AU-19: company-wide session policy, enforced by the page frame (idle warning), by Keycloak's SSO
// idle timeout and at sign-in (concurrent sessions).
export function SessionSettingsBoard({ initialPolicy, loadError }: { initialPolicy: SessionPolicy | null; loadError: string | null }) {
  const [settings, setSettings] = useState(initialPolicy ?? defaultPolicy);
  const [isSaving, startSaving] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(
    loadError ? { message: `Chưa tải được cài đặt đã lưu: ${loadError}`, error: true } : null
  );

  const updateSetting = <Key extends keyof SessionPolicy,>(key: Key, value: SessionPolicy[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  };

  const saveSettings = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (settings.warningSeconds > settings.idleMinutes * 60 - 60) {
      setFeedback({ message: "Cảnh báo phải sớm hơn thời điểm đăng xuất ít nhất 60 giây.", error: true });
      return;
    }

    startSaving(async () => {
      const result = await updateSessionPolicyAction(settings);
      if (result.ok) {
        setSettings(result.data);
        setFeedback({ message: "Đã cập nhật cài đặt phiên làm việc. Áp dụng từ lần tải trang tiếp theo của mỗi người.", error: false });
      } else {
        setFeedback({ message: result.error, error: true });
      }
    });
  };

  return (
    <form className="system-settings-form is-short" aria-busy={isSaving} onSubmit={saveSettings}>
      <div className="system-settings-content">
        <section className="system-settings-card" aria-labelledby="session-auto-logout-title">
          <header><h2 id="session-auto-logout-title">Cài đặt tự động đăng xuất</h2></header>
          <div className="system-settings-row">
            <div>
              <span className="system-settings-label">Bật tự động đăng xuất</span>
              <p>Áp dụng cho tất cả user</p>
            </div>
            <FormSwitch
              checked={settings.autoLogoutEnabled}
              className="system-settings-switch"
              label={<span className="sr-only">Bật tự động đăng xuất</span>}
              onChange={(event) => updateSetting("autoLogoutEnabled", event.target.checked)}
            />
          </div>
          <div className="system-settings-row">
            <div>
              <label htmlFor="idle-minutes">Thời gian không hoạt động (phút)</label>
              <p>Tối thiểu 10 phút. User idle quá thời gian này sẽ bị đăng xuất.</p>
            </div>
            <input
              className="system-settings-number-input"
              id="idle-minutes"
              max="1440"
              min="10"
              type="number"
              value={settings.idleMinutes}
              onChange={(event) => updateSetting("idleMinutes", Math.max(10, Number(event.target.value) || 10))}
            />
          </div>
          <div className="system-settings-row">
            <div>
              <label htmlFor="logout-warning-seconds">Cảnh báo trước khi đăng xuất (giây)</label>
              <p>Hiện dialog cảnh báo, cho phép user gia hạn phiên. Phải nhỏ hơn timeout ít nhất 60 giây.</p>
            </div>
            <input
              className="system-settings-number-input"
              id="logout-warning-seconds"
              min="60"
              type="number"
              value={settings.warningSeconds}
              onChange={(event) => updateSetting("warningSeconds", Math.max(60, Number(event.target.value) || 60))}
            />
          </div>
        </section>

        <section className="system-settings-card" aria-labelledby="session-concurrent-title">
          <header><h2 id="session-concurrent-title">Phiên đăng nhập đồng thời</h2></header>
          <div className="system-settings-row">
            <div>
              <label htmlFor="max-concurrent-sessions">Số phiên đăng nhập cùng lúc tối đa</label>
              <p>0 = không giới hạn. Khi đăng nhập vượt giới hạn, các phiên lâu không dùng nhất bị đăng xuất.</p>
            </div>
            <input
              className="system-settings-number-input"
              id="max-concurrent-sessions"
              max="20"
              min="0"
              type="number"
              value={settings.maxConcurrentSessions}
              onChange={(event) => updateSetting("maxConcurrentSessions", Math.min(20, Math.max(0, Number(event.target.value) || 0)))}
            />
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
