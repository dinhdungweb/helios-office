"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FormSwitch } from "@/components/ui/form-controls";
import { StateBlock } from "@/components/ui/primitives";
import { updateAttendancePolicyAction } from "@/lib/shift-actions";
import type { AttendancePolicy, ShiftSettingsData } from "@/lib/shift-format";

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

// AT-06: every rule the engine uses is set here; shifts may override some of them. Defaults follow
// common Vietnamese practice and the 2019 Labour Code (docs/design/attendance-engine.md §4, §10).
export function AttendancePolicyBoard({ data }: { data: ShiftSettingsData }) {
  const router = useRouter();
  const [policy, setPolicy] = useState<AttendancePolicy | null>(data.source === "api" ? data.policy : null);
  const [isSaving, startSaving] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);

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
      const result = await updateAttendancePolicyAction(policy);
      setFeedback(result.ok ? { message: "Đã lưu. Công từ đầu tháng trước đến hôm nay đang được tính lại theo chính sách mới (theo dõi ở mục Tính lại công).", error: false } : { message: result.error, error: true });
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
