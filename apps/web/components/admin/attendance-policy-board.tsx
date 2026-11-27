"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FormSwitch } from "@/components/ui/form-controls";
import { StateBlock } from "@/components/ui/primitives";
import { updateCheckInPolicyAction } from "@/lib/device-auth-actions";
import type { CheckInPolicy } from "@/lib/device-auth-api";
import { runMissingPunchReminderAction, updateAttendancePolicyAction } from "@/lib/shift-actions";
import type { AttendancePolicy, ReminderRun, ShiftSettingsData } from "@/lib/shift-format";

const WEEKDAYS = [
  { value: 1, label: "T2" },
  { value: 2, label: "T3" },
  { value: 3, label: "T4" },
  { value: 4, label: "T5" },
  { value: 5, label: "T6" },
  { value: 6, label: "T7" },
  { value: 7, label: "CN" }
];

function Row({ children, hint, label }: { children: ReactNode; hint?: string; label: string }) {
  return (
    <div className="system-settings-row">
      <div>
        <span className="system-settings-label">{label}</span>
        {hint ? <p>{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

// 1Office's "Chấm công GPS" / "Chấm công Wifi" blocks: each method is turned on and ruled on its own.
const METHOD = {
  gps: {
    title: "Chấm công GPS",
    on: "requireGpsForAttendance",
    hint: "Chấm trên web / app khi ở trong phạm vi một điểm GPS (Cài đặt chung → Chấm công GPS/Wifi).",
    place: "vị trí được phép"
  },
  wifi: {
    title: "Chấm công Wifi",
    on: "requireWifiForOffice",
    hint: "Chấm khi ở trong mạng văn phòng: wifi trên app, dải IP trên trình duyệt. Bật cả GPS và Wifi thì đạt một trong hai là được.",
    place: "địa chỉ wifi được phép"
  }
} as const;

function CheckInMethodCard({ method, onChange, rules }: { method: "gps" | "wifi"; onChange: (rules: CheckInPolicy) => void; rules: CheckInPolicy }) {
  const info = METHOD[method];
  const on = rules[info.on];
  const option = (key: "AllowWithoutShift" | "RequireApprovedDevice" | "RequirePhoto" | "CheckEntities", label: string, hint?: string) => {
    const field = `${method}${key}` as const;
    return (
      <Row label={label} hint={hint}>
        <FormSwitch
          checked={rules[field]}
          className="system-settings-switch"
          disabled={!on}
          label={<span className="sr-only">{`${info.title}: ${label}`}</span>}
          onChange={(event) => onChange({ ...rules, [field]: event.target.checked })}
        />
      </Row>
    );
  };
  return (
    <section className="system-settings-card" aria-labelledby={`policy-check-in-${method}`}>
      <header><h2 id={`policy-check-in-${method}`}>{info.title}</h2></header>
      <Row label={`Sử dụng ${info.title.toLowerCase()}`} hint={info.hint}>
        <FormSwitch checked={on} className="system-settings-switch" label={<span className="sr-only">{info.title}</span>} onChange={(event) => onChange({ ...rules, [info.on]: event.target.checked })} />
      </Row>
      {option("AllowWithoutShift", `Cho phép chấm công tại ${info.place} khi không có ca / làm thêm`, "Tắt thì hôm chưa được xếp ca (và không nhận diện được ca) sẽ không chấm được.")}
      {option("RequireApprovedDevice", "Không cho chấm công trên thiết bị chưa xác thực", "Nhân viên phải đăng ký thiết bị và được duyệt ở Xác thực thiết bị.")}
      {option("RequirePhoto", "Bắt buộc chụp ảnh khi chấm công")}
      {option("CheckEntities", "Kiểm tra theo đối tượng áp dụng", `Chỉ nhận ${info.place} gắn với ca của người đó trong ngày, và ca phải áp dụng cho phòng ban / vị trí của họ.`)}
    </section>
  );
}

function Choice<T extends string | number>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  value: T;
}) {
  return (
    <div className="system-settings-select-wrap">
      <select aria-label={label} value={String(value)} onChange={(event) => onChange(options.find((option) => String(option.value) === event.target.value)!.value)}>
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

// Empty means "no limit" (null).
function OptionalDays({ label, max, onChange, value }: { label: string; max: number; onChange: (value: number | null) => void; value: number | null }) {
  return (
    <span className="policy-optional-days">
      <input
        aria-label={label}
        className="system-settings-number-input"
        max={max}
        min={0}
        placeholder="Không giới hạn"
        type="number"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Math.min(max, Math.max(0, Math.round(Number(event.target.value) || 0))))}
      />
      <span>ngày</span>
    </span>
  );
}

function NumberInput({ label, max, min, onChange, value }: { label: string; max: number; min: number; onChange: (value: number) => void; value: number }) {
  return (
    <input
      aria-label={label}
      className="system-settings-number-input"
      max={max}
      min={min}
      type="number"
      value={value}
      onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || 0)))}
    />
  );
}

function vnDateTime(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")} ${get("day")}/${get("month")}`;
}

// AT-23: the last reminder passes and a button to send yesterday's reminders now.
function ReminderStatus({ runs }: { runs: ReminderRun[] }) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const last = runs[0];

  const sendNow = async () => {
    setMessage(null);
    setIsSending(true);
    const result = await runMissingPunchReminderAction();
    setIsSending(false);
    if (!result.ok) {
      setMessage({ text: result.error, error: true });
      return;
    }
    const day = result.data.workDate.split("-").reverse().slice(0, 2).join("/");
    setMessage({
      text: result.data.skipped === "locked" ? `Kỳ công của ngày ${day} đã chốt, không gửi nhắc.` : result.data.notified ? `Đã nhắc ${result.data.notified} người quên chấm ngày ${day}.` : `Ngày ${day} không ai quên chấm.`,
      error: false
    });
    router.refresh();
  };

  return (
    <div className="system-settings-row reminder-status">
      <div>
        <span className="system-settings-label">Lần nhắc gần nhất</span>
        <p>
          {last
            ? last.error
              ? `Ngày ${last.workDate.split("-").reverse().slice(0, 2).join("/")}: ${last.error}`
              : `Ngày ${last.workDate.split("-").reverse().slice(0, 2).join("/")} — ${last.finishedAt ? `nhắc ${last.notified} người` : "đang gửi"} (${last.trigger === "auto" ? "tự động" : "gửi tay"} lúc ${vnDateTime(last.startedAt)})`
            : "Chưa gửi lần nào."}
        </p>
        {message ? <p className={message.error ? "reminder-status-message is-error" : "reminder-status-message"} role="status">{message.text}</p> : null}
      </div>
      <button className="secondary-button" disabled={isSending} type="button" onClick={sendNow}>
        {isSending ? "Đang gửi..." : "Gửi nhắc cho hôm qua"}
      </button>
    </div>
  );
}

// AT-06: every rule the engine uses is set here; shifts may override some of them. Defaults follow
// common Vietnamese practice and the 2019 Labour Code (docs/design/attendance-engine.md §4, §10).
export function AttendancePolicyBoard({ data, reminderRuns = [], checkIn = null }: { data: ShiftSettingsData; reminderRuns?: ReminderRun[]; checkIn?: CheckInPolicy | null }) {
  const router = useRouter();
  const [policy, setPolicy] = useState<AttendancePolicy | null>(data.source === "api" ? data.policy : null);
  const [isSaving, startSaving] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  // GPS / Wifi check-in rules (DV-06, AT-14) live in the device policy; 1Office shows them here.
  const [rules, setRules] = useState<CheckInPolicy | null>(checkIn);

  if (data.source === "unavailable" || !policy) {
    return (
      <StateBlock tone="error" title="Chưa kết nối được API chấm công">
        {data.source === "unavailable" ? data.error : "Không có dữ liệu chính sách."}
      </StateBlock>
    );
  }

  const set = <Key extends keyof AttendancePolicy,>(key: Key, value: AttendancePolicy[Key]) => {
    setPolicy((current) => (current ? { ...current, [key]: value } : current));
    setFeedback(null);
  };

  const toggleWeekday = (day: number) => {
    const next = policy.workWeekdays.includes(day) ? policy.workWeekdays.filter((item) => item !== day) : [...policy.workWeekdays, day];
    if (next.length > 0) set("workWeekdays", next.sort((a, b) => a - b));
  };

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startSaving(async () => {
      if (rules && checkIn && JSON.stringify(rules) !== JSON.stringify(checkIn)) {
        const saved = await updateCheckInPolicyAction(rules);
        if (!saved.ok) {
          setFeedback({ message: saved.error, error: true });
          return;
        }
      }
      const result = await updateAttendancePolicyAction(policy);
      setFeedback(result.ok ? { message: "Đã lưu. Nếu quy tắc tính công thay đổi, công từ đầu tháng trước đến hôm nay được tính lại (theo dõi ở Bảng chấm công → Lịch sử).", error: false } : { message: result.error, error: true });
      if (result.ok) router.refresh();
    });
  };

  const activeShifts = data.shifts.filter((shift) => shift.status === "active");

  return (
    <form className="system-settings-form attendance-policy-form" aria-busy={isSaving} onSubmit={save}>
      <div className="system-settings-content">
        <section className="system-settings-card" aria-labelledby="policy-general">
          <header><h2 id="policy-general">Lịch làm việc</h2></header>
          <Row label="Ngày làm việc trong tuần" hint="Người chưa được xếp ca làm ca mặc định vào các ngày này, các ngày còn lại là ngày nghỉ.">
            <div className="attendance-weekdays" role="group" aria-label="Ngày làm việc trong tuần">
              {WEEKDAYS.map((day) => (
                <button
                  aria-pressed={policy.workWeekdays.includes(day.value)}
                  className={policy.workWeekdays.includes(day.value) ? "is-selected" : undefined}
                  key={day.value}
                  type="button"
                  onClick={() => toggleWeekday(day.value)}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Ca mặc định của công ty" hint="Dùng khi một người chưa được xếp ca và phòng ban cũng chưa có ca mặc định.">
            <Choice
              label="Ca mặc định"
              value={policy.defaultShiftId ?? ""}
              options={[{ value: "", label: "Không có (chỉ tính ngày được xếp ca)" }, ...activeShifts.map((shift) => ({ value: shift.id, label: `${shift.code} — ${shift.name}` }))]}
              onChange={(value) => set("defaultShiftId", value || null)}
            />
          </Row>
          <Row label="Múi giờ công ty" hint="Mọi ngày công và giờ chấm tính theo múi giờ này.">
            <Choice
              label="Múi giờ"
              value={policy.timezone}
              options={[...new Set([policy.timezone, "Asia/Ho_Chi_Minh", "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo"])].map((zone) => ({ value: zone, label: zone }))}
              onChange={(value) => set("timezone", value)}
            />
          </Row>
        </section>

        <section className="system-settings-card" aria-labelledby="policy-late">
          <header><h2 id="policy-late">Đi muộn, về sớm</h2></header>
          <Row label="Cho phép đi muộn (phút)" hint="Muộn trong khoảng này không bị tính là đi muộn.">
            <NumberInput label="Cho phép đi muộn" max={120} min={0} value={policy.lateGraceMinutes} onChange={(value) => set("lateGraceMinutes", value)} />
          </Row>
          <Row label="Cho phép về sớm (phút)">
            <NumberInput label="Cho phép về sớm" max={120} min={0} value={policy.earlyGraceMinutes} onChange={(value) => set("earlyGraceMinutes", value)} />
          </Row>
          <Row label="Muộn/sớm vượt ngưỡng thì tính" hint="Ví dụ ngưỡng 5 phút, vào muộn 12 phút: tính 12 phút hay 7 phút.">
            <Choice
              label="Cách tính muộn"
              value={policy.lateCountMode}
              options={[{ value: "full", label: "Toàn bộ số phút muộn" }, { value: "excess", label: "Chỉ phần vượt ngưỡng" }]}
              onChange={(value) => set("lateCountMode", value)}
            />
          </Row>
        </section>

        <section className="system-settings-card" aria-labelledby="policy-punches">
          <header><h2 id="policy-punches">Ghi nhận giờ chấm</h2></header>
          <Row label="Nhiều lần chấm trong ngày" hint="Lần đầu + lần cuối hợp với văn phòng; ghép cặp vào–ra trừ được thời gian ra ngoài giữa ca.">
            <Choice
              label="Ghép lần chấm"
              value={policy.punchPairing}
              options={[{ value: "first_last", label: "Lần đầu là vào, lần cuối là ra" }, { value: "pairs", label: "Ghép từng cặp vào–ra" }]}
              onChange={(value) => set("punchPairing", value)}
            />
          </Row>
          <Row label="Làm tròn giờ vào/ra">
            <Choice
              label="Làm tròn giờ"
              value={policy.roundingMinutes}
              options={[{ value: 0, label: "Không làm tròn" }, { value: 5, label: "5 phút" }, { value: 15, label: "15 phút" }, { value: 30, label: "30 phút" }]}
              onChange={(value) => set("roundingMinutes", value)}
            />
          </Row>
          <Row label="Nhận log trước giờ vào / sau giờ ra (giờ)" hint="Lần chấm ngoài khoảng này không được tính cho ca.">
            <div className="attendance-pair-inputs">
              <NumberInput label="Trước giờ vào (giờ)" max={12} min={0} value={policy.punchWindowBeforeMinutes / 60} onChange={(value) => set("punchWindowBeforeMinutes", Math.round(value * 60))} />
              <NumberInput label="Sau giờ ra (giờ)" max={12} min={0} value={policy.punchWindowAfterMinutes / 60} onChange={(value) => set("punchWindowAfterMinutes", Math.round(value * 60))} />
            </div>
          </Row>
          <Row label="Ca qua đêm tính công cho">
            <Choice
              label="Ca qua đêm"
              value={policy.overnightAttribution}
              options={[{ value: "shift_start", label: "Ngày bắt đầu ca" }, { value: "shift_end", label: "Ngày kết thúc ca" }]}
              onChange={(value) => set("overnightAttribution", value)}
            />
          </Row>
        </section>

        <section className="system-settings-card" aria-labelledby="policy-units">
          <header><h2 id="policy-units">Tính công</h2></header>
          <Row label="Cách tính số công" hint="Theo giờ thực tế: vào muộn 4 phút được 0,99 công. Đủ công nếu có mặt: có đủ vào và ra là đủ công.">
            <Choice
              label="Cách tính công"
              value={policy.workUnitMode}
              options={[{ value: "actual", label: "Theo giờ làm thực tế" }, { value: "presence", label: "Đủ công nếu có đủ vào và ra" }]}
              onChange={(value) => set("workUnitMode", value)}
            />
          </Row>
          <Row label="Làm tròn số công">
            <Choice
              label="Làm tròn công"
              value={policy.workUnitRoundingHundredths}
              options={[{ value: 1, label: "0,01 công" }, { value: 25, label: "0,25 công" }, { value: 50, label: "0,5 công" }]}
              onChange={(value) => set("workUnitRoundingHundredths", value)}
            />
          </Row>
          <Row label="Quên chấm vào hoặc ra">
            <Choice
              label="Quên chấm"
              value={policy.missingPunchMode}
              options={[
                { value: "pending", label: "0 công, chờ giải trình / HR sửa" },
                { value: "half", label: "Tính nửa công" },
                { value: "scheduled", label: "Lấy giờ chuẩn của ca" }
              ]}
              onChange={(value) => set("missingPunchMode", value)}
            />
          </Row>
          <Row label="Giờ làm ngoài ca" hint="Chỉ thành OT khi có đơn OT được duyệt.">
            <Choice
              label="Giờ ngoài ca"
              value={policy.outsideShiftMode}
              options={[{ value: "record", label: "Ghi nhận để tham khảo" }, { value: "ignore", label: "Bỏ qua" }]}
              onChange={(value) => set("outsideShiftMode", value)}
            />
          </Row>
        </section>

        <section className="system-settings-card" aria-labelledby="policy-ot">
          <header><h2 id="policy-ot">Làm thêm giờ, ngày lễ</h2></header>
          <Row label="Hệ số OT ngày thường / ngày nghỉ tuần / ngày lễ (%)" hint="Mặc định theo Bộ luật Lao động 2019, Điều 98.">
            <div className="attendance-pair-inputs">
              <NumberInput label="OT ngày thường" max={1000} min={100} value={policy.overtimeWeekdayPercent} onChange={(value) => set("overtimeWeekdayPercent", value)} />
              <NumberInput label="OT ngày nghỉ tuần" max={1000} min={100} value={policy.overtimeRestDayPercent} onChange={(value) => set("overtimeRestDayPercent", value)} />
              <NumberInput label="OT ngày lễ" max={1000} min={100} value={policy.overtimeHolidayPercent} onChange={(value) => set("overtimeHolidayPercent", value)} />
            </div>
          </Row>
          <Row label="Phụ cấp làm đêm 22:00–06:00 (%)">
            <NumberInput label="Phụ cấp làm đêm" max={200} min={0} value={policy.nightAllowancePercent} onChange={(value) => set("nightAllowancePercent", value)} />
          </Row>
          <Row label="Ngày lễ không đi làm vẫn hưởng công">
            <FormSwitch
              checked={policy.holidayPaid}
              className="system-settings-switch"
              label={<span className="sr-only">Ngày lễ hưởng công</span>}
              onChange={(event) => set("holidayPaid", event.target.checked)}
            />
          </Row>
          <Row label="Bắt buộc nhân viên xác nhận công trước khi chốt">
            <FormSwitch
              checked={policy.requireTimesheetConfirmation}
              className="system-settings-switch"
              label={<span className="sr-only">Bắt buộc xác nhận công</span>}
              onChange={(event) => set("requireTimesheetConfirmation", event.target.checked)}
            />
          </Row>
        </section>

        {rules ? (
          <>
            <CheckInMethodCard method="gps" rules={rules} onChange={setRules} />
            <CheckInMethodCard method="wifi" rules={rules} onChange={setRules} />
          </>
        ) : null}

        <section className="system-settings-card" aria-labelledby="policy-general-1office">
          <header><h2 id="policy-general-1office">Cài đặt chung</h2></header>
          <Row label="Tính đi muộn, về sớm" hint="Theo phút: bỏ qua giây, vào 08:00:59 vẫn đúng giờ. Theo giây: muộn 1 giây cũng tính muộn 1 phút.">
            <Choice
              label="Tính đi muộn, về sớm"
              value={policy.lateEarlyUnit}
              options={[{ value: "minute", label: "Theo phút" }, { value: "second", label: "Theo giây" }]}
              onChange={(value) => set("lateEarlyUnit", value)}
            />
          </Row>
          <Row label="Tách giờ làm việc qua ngày" hint="Với ca qua đêm: chia giờ và công tại 0h cho ngày hôm sau. 'Tính đủ giờ ca' chia theo giờ của ca, nên đủ ca thì mỗi ngày luôn được đủ phần của mình.">
            <Choice
              label="Tách giờ làm việc qua ngày"
              value={policy.overnightSplit}
              options={[
                { value: "none", label: "Không tách" },
                { value: "split", label: "Tách giờ qua ngày" },
                { value: "split_full", label: "Tách giờ qua ngày (tính đủ giờ ca)" }
              ]}
              onChange={(value) => set("overnightSplit", value)}
            />
          </Row>
          <Row label="Số ngày liên tiếp không cần check-in / out" hint="Ca trực nhiều ngày: chấm vào ngày đầu và chấm ra ngày cuối thì cả chuỗi (tối đa số ngày này) được đủ công. Mặc định 2, tối đa 30; 1 là ngày nào cũng phải chấm vào / ra.">
            <NumberInput label="Số ngày liên tiếp không cần check-in / out" max={30} min={1} value={policy.continuousShiftMaxDays} onChange={(value) => set("continuousShiftMaxDays", value)} />
          </Row>
          <Row label="Thời gian được sửa phân ca (kể từ lúc tạo)" hint="Quá số ngày này thì ô phân ca không đổi, không xoá được nữa. Để trống là không giới hạn.">
            <OptionalDays label="Thời gian được sửa phân ca" max={365} value={policy.shiftEditWindowDays} onChange={(value) => set("shiftEditWindowDays", value)} />
          </Row>
          <Row label="Số ngày tối đa được xếp ca trước" hint="Tính từ ngày sớm nhất trong phân ca: đặt 5, phân ca từ 07/04 thì xếp được đến hết 12/04. Để trống là không giới hạn.">
            <OptionalDays label="Số ngày tối đa được xếp ca trước" max={366} value={policy.shiftCreateAheadDays} onChange={(value) => set("shiftCreateAheadDays", value)} />
          </Row>
        </section>

        <section className="system-settings-card" aria-labelledby="policy-reminder">
          <header><h2 id="policy-reminder">Nhắc quên chấm công</h2></header>
          <Row label="Nhắc người quên chấm" hint="Mỗi sáng gửi thông báo cho người ngày hôm trước thiếu giờ vào hoặc giờ ra. Không nhắc ngày nghỉ, ngày lễ và tháng đã chốt.">
            <FormSwitch
              checked={policy.missingPunchReminder}
              className="system-settings-switch"
              label={<span className="sr-only">Nhắc quên chấm công</span>}
              onChange={(event) => set("missingPunchReminder", event.target.checked)}
            />
          </Row>
          <Row label="Giờ gửi" hint="Theo múi giờ công ty, cho dữ liệu của ngày hôm trước.">
            <input
              aria-label="Giờ gửi nhắc"
              className="system-settings-number-input reminder-time-input"
              disabled={!policy.missingPunchReminder}
              required
              type="time"
              value={policy.missingPunchReminderTime}
              onChange={(event) => event.target.value && set("missingPunchReminderTime", event.target.value)}
            />
          </Row>
          <ReminderStatus runs={reminderRuns} />
        </section>
      </div>

      <footer className="system-settings-submit-bar">
        <button className="system-settings-submit" disabled={isSaving} type="submit">{isSaving ? "ĐANG LƯU..." : "LƯU"}</button>
        <span className={feedback?.error ? "system-settings-feedback is-error" : "system-settings-feedback"} role="status" aria-live="polite">
          {feedback?.message}
        </span>
      </footer>
    </form>
  );
}
