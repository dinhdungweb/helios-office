"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// AU-19: signs the user out after `idleMinutes` without activity, warning `warningSeconds`
// before. Activity in any tab counts (shared through localStorage). Keycloak's SSO idle timeout,
// set from the same policy, is the server-side backstop for tabs where this never runs.

const STORAGE_KEY = "helios:last-activity";
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
const WRITE_THROTTLE_MS = 15_000;

function readLastActivity() {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeLastActivity(time: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(time));
  } catch {
    // Private mode or blocked storage: this tab still tracks its own activity.
  }
}

export function IdleLogoutWatcher({ idleMinutes, warningSeconds }: { idleMinutes: number; warningSeconds: number }) {
  const lastActivity = useRef(0);
  const lastWrite = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const markActive = useCallback((force = false) => {
    const now = Date.now();
    lastActivity.current = now;
    if (force || now - lastWrite.current > WRITE_THROTTLE_MS) {
      lastWrite.current = now;
      writeLastActivity(now);
    }
  }, []);

  useEffect(() => {
    markActive(true);
    const onActivity = () => {
      // While the warning is open, only its button counts as "still here".
      if (secondsLeft === null) markActive();
    };
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, onActivity, { passive: true });

    const timer = window.setInterval(() => {
      const last = Math.max(lastActivity.current, readLastActivity() ?? 0);
      lastActivity.current = last;
      const remaining = Math.ceil((last + idleMinutes * 60_000 - Date.now()) / 1000);

      if (remaining <= 0) {
        window.location.assign("/api/auth/logout?reason=idle");
      } else if (remaining <= warningSeconds) {
        setSecondsLeft(remaining);
      } else {
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity);
      window.clearInterval(timer);
    };
  }, [idleMinutes, markActive, secondsLeft, warningSeconds]);

  const stayActive = () => {
    markActive(true);
    setSecondsLeft(null);
    // Touches the server session (refreshing the token if needed), so Keycloak's idle clock resets too.
    void fetch("/api/auth/session", { cache: "no-store" }).catch(() => undefined);
  };

  if (secondsLeft === null) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="idle-logout-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="idle-logout-title">
      <div className="idle-logout-dialog">
        <h2 id="idle-logout-title">Bạn vẫn đang làm việc chứ?</h2>
        <p>
          Không có thao tác nào trong một lúc. Hệ thống sẽ tự đăng xuất sau <strong>{minutes}:{seconds}</strong>.
        </p>
        <div className="idle-logout-actions">
          <a className="secondary-button" href="/api/auth/logout">Đăng xuất</a>
          <button className="primary-button" type="button" onClick={stayActive} autoFocus>Tiếp tục làm việc</button>
        </div>
      </div>
    </div>
  );
}
