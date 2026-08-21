"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FormSwitch } from "@/components/ui/form-controls";

type SessionSettings = {
  autoLogoutEnabled: boolean;
  idleMinutes: number;
  warningSeconds: number;
};

const preferenceScope = "admin.session-settings";
const defaultSettings: SessionSettings = {
  autoLogoutEnabled: false,
  idleMinutes: 30,
  warningSeconds: 60
};

function readSessionSettings(value: unknown): SessionSettings {
  if (!value || typeof value !== "object") {
    return defaultSettings;
  }

  const candidate = value as Partial<SessionSettings>;

  return {
    autoLogoutEnabled: Boolean(candidate.autoLogoutEnabled),
    idleMinutes: typeof candidate.idleMinutes === "number" ? Math.max(10, candidate.idleMinutes) : 30,
    warningSeconds: typeof candidate.warningSeconds === "number" ? Math.max(60, candidate.warningSeconds) : 60
  };
}

export function SessionSettingsBoard() {
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
        if (isActive) setSettings(readSessionSettings(preference.value));
      })
      .catch(() => {
        if (isActive) setFeedback({ message: "Chưa tải được cài đặt đã lưu.", error: true });
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => { isActive = false; };
  }, []);

  const updateSetting = <Key extends keyof SessionSettings,>(key: Key, value: SessionSettings[Key]) => {
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
      setFeedback({ message: "Đã cập nhật cài đặt phiên làm việc.", error: false });
    } catch {
      setFeedback({ message: "Chưa cập nhật được cài đặt. Vui lòng thử lại.", error: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="system-settings-form is-short" aria-busy={isLoading || isSaving} onSubmit={saveSettings}>
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
              min="10"
              type="number"
              value={settings.idleMinutes}
              onChange={(event) => updateSetting("idleMinutes", Number(event.target.value) || 10)}
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
              onChange={(event) => updateSetting("warningSeconds", Number(event.target.value) || 60)}
            />
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
