"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckInCamera } from "@/components/attendance/check-in-camera";
import { checkInAction, type CheckInPosition } from "@/lib/my-device-actions";
import type { CheckInRules, MyPunch } from "@/lib/my-device";
import { Clock } from "@/lib/icons";

const TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const SHORT = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });

function punchLabel(punch: MyPunch) {
  const kind = punch.direction === "in" ? "Vào" : punch.direction === "out" ? "Ra" : "Chấm";
  const where = punch.source === "machine" ? `Máy ${punch.device ?? ""}`.trim() : [punch.place, punch.source === "app" ? "app" : "web"].filter(Boolean).join(" · ");
  return { kind, time: SHORT.format(new Date(punch.punchTime)), where };
}

// The browser's position, or null when it is refused or too slow (the office network may still do).
function currentPosition(): Promise<{ position: CheckInPosition; problem: string | null }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve({ position: null, problem: "Trình duyệt không hỗ trợ định vị." });
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (result) => resolve({ position: { latitude: result.coords.latitude, longitude: result.coords.longitude, accuracy: result.coords.accuracy }, problem: null }),
      (error) =>
        resolve({
          position: null,
          problem: error.code === error.PERMISSION_DENIED ? "Bạn đã chặn quyền vị trí. Bật lại quyền vị trí cho trang này trong cài đặt trình duyệt." : "Không lấy được vị trí, hãy thử lại ở nơi thoáng hơn."
        }),
      // A fresh fix: a cached one may be from before the employee walked in.
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    )
  );
}

// AT-13: check in and out from this browser, under the device card on the personal timesheet.
export function CheckInPanel({ rules, punches: initial }: { rules: CheckInRules; punches: MyPunch[] }) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [punches, setPunches] = useState(initial);
  const [busy, setBusy] = useState<"in" | "out" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string; hint?: string } | null>(null);
  // AT-14: with photos required, a tap opens the camera first.
  const [camera, setCamera] = useState<"in" | "out" | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const last = punches.at(-1);
  const suggestOut = last?.direction === "in" || (last !== undefined && last.direction === null && punches.length % 2 === 1);

  const start = (direction: "in" | "out") => {
    if (rules.requirePhoto) setCamera(direction);
    else void punch(direction);
  };

  const punch = async (direction: "in" | "out", photo?: string) => {
    setBusy(direction);
    setMessage(rules.requireGps ? { tone: "info", text: "Đang lấy vị trí..." } : null);
    const located = rules.requireGps ? await currentPosition() : { position: null, problem: null };
    setMessage(null);
    if (photo) setMessage({ tone: "info", text: "Đang gửi ảnh..." });
    const result = await checkInAction(direction, located.position, photo);
    setMessage(null);
    setBusy(null);
    if (!result.ok) {
      // GPS and Wifi have their own photo rule: the server says when this punch's method needs one.
      if (result.reason === "photo_required" && !photo) {
        setMessage({ tone: "info", text: "Cách chấm công này cần ảnh, hãy chụp ảnh để tiếp tục." });
        setCamera(direction);
        return;
      }
      setMessage({ tone: "error", text: result.error, hint: result.reason === "no_position" || result.reason === "outside_places" ? located.problem ?? undefined : undefined });
      return;
    }
    setPunches(result.punches);
    const label = punchLabel(result.punch);
    setMessage({
      tone: "success",
      text: result.duplicate ? `Bạn vừa chấm lúc ${label.time}, lần bấm này không tính thêm.` : `Đã chấm công ${direction === "in" ? "vào" : "ra"} lúc ${label.time}${result.punch.place ? ` tại ${result.punch.place}` : ""}.`
    });
    router.refresh();
  };

  return (
    <div className="check-in-panel">
      <div className="check-in-clock">
        <Clock size={18} weight="duotone" aria-hidden="true" />
        <strong suppressHydrationWarning>{now ? TIME.format(now) : "--:--:--"}</strong>
      </div>
      <div className="check-in-today">
        <span>Hôm nay</span>
        {punches.length === 0 ? (
          <em>Chưa chấm công</em>
        ) : (
          <ol>
            {punches.map((item) => {
              const label = punchLabel(item);
              return (
                <li key={item.id} className={item.direction === "out" ? "is-out" : "is-in"} title={label.where}>
                  {label.kind} <strong>{label.time}</strong>
                  {label.where ? <small>{label.where}</small> : null}
                  {item.photoFileId ? (
                    <a className="check-in-photo-link" href={`/api/files/${item.photoFileId}`} rel="noreferrer" target="_blank">
                      Ảnh
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <div className="check-in-buttons">
        <button className={suggestOut ? "secondary-button" : "primary-button"} disabled={busy !== null} type="button" onClick={() => start("in")}>
          {busy === "in" ? "Đang chấm..." : "Chấm công vào"}
        </button>
        <button className={suggestOut ? "primary-button" : "secondary-button"} disabled={busy !== null} type="button" onClick={() => start("out")}>
          {busy === "out" ? "Đang chấm..." : "Chấm công ra"}
        </button>
      </div>
      {message ? (
        <p className={`check-in-message is-${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
          {message.text}
          {message.hint ? <small>{message.hint}</small> : null}
        </p>
      ) : null}
      {camera ? (
        <CheckInCamera
          title={camera === "in" ? "Chụp ảnh chấm công vào" : "Chụp ảnh chấm công ra"}
          onClose={() => setCamera(null)}
          onConfirm={(photo) => {
            const direction = camera;
            setCamera(null);
            void punch(direction, photo);
          }}
        />
      ) : null}
      <p className="check-in-rules">
        {[
          rules.requireApprovedDevice ? "thiết bị đã duyệt" : rules.deviceMayBeRequired ? "thiết bị đã duyệt (với một số cách chấm)" : null,
          rules.requirePhoto ? "chụp ảnh" : rules.photoMayBeRequired ? "chụp ảnh (với một số cách chấm)" : null,
          rules.requireGps && rules.requireOfficeNetwork ? "trong phạm vi GPS hoặc mạng văn phòng" : rules.requireGps ? "trong phạm vi GPS" : rules.requireOfficeNetwork ? "trong mạng văn phòng" : null
        ]
          .filter(Boolean)
          .join(", ")
          .replace(/^./, (first) => `Điều kiện: ${first}`) || "Chấm công ở bất kỳ đâu."}
      </p>
    </div>
  );
}
