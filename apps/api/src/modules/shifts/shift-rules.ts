import type {
  AttendancePolicy,
  LateCountMode,
  MissingPunchMode,
  Shift,
  ShiftType
} from "@prisma/client";

// Pure helpers for shift times and the rules a shift runs under (docs/design/attendance-engine.md
// §4–5). Times are minutes after midnight in the company time zone; an end at or before the start
// means the shift ends the next day.

export const MINUTES_PER_DAY = 1440;

export type ShiftTimes = {
  type: ShiftType;
  startMinute: number;
  endMinute: number;
  breakStartMinute?: number | null;
  breakEndMinute?: number | null;
  requiredMinutes?: number | null;
};

export function isOvernight(startMinute: number, endMinute: number) {
  return endMinute <= startMinute;
}

export function shiftLengthMinutes(startMinute: number, endMinute: number) {
  return isOvernight(startMinute, endMinute) ? endMinute + MINUTES_PER_DAY - startMinute : endMinute - startMinute;
}

// Minutes from the shift start to a time of day, following the shift past midnight.
export function offsetFromStart(startMinute: number, minute: number) {
  return (minute - startMinute + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function breakLengthMinutes(shift: ShiftTimes) {
  if (shift.breakStartMinute == null || shift.breakEndMinute == null) return 0;
  return offsetFromStart(shift.startMinute, shift.breakEndMinute) - offsetFromStart(shift.startMinute, shift.breakStartMinute);
}

// Minutes that make a full shift: the span minus the break for fixed shifts, the configured
// amount for flexible ones.
export function requiredMinutesFor(shift: ShiftTimes) {
  if (shift.type === "flexible") return shift.requiredMinutes ?? 0;
  return shiftLengthMinutes(shift.startMinute, shift.endMinute) - breakLengthMinutes(shift);
}

export function formatMinute(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

const isMinute = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) < MINUTES_PER_DAY;

// Problems with a shift's times, in the words shown to HR; empty when the shift is valid.
export function validateShiftTimes(shift: ShiftTimes) {
  const errors: string[] = [];

  if (!isMinute(shift.startMinute) || !isMinute(shift.endMinute)) {
    return ["Giờ vào và giờ ra phải nằm trong 00:00–23:59."];
  }
  if (shift.startMinute === shift.endMinute) {
    errors.push("Giờ vào và giờ ra không được trùng nhau.");
  }

  const length = shiftLengthMinutes(shift.startMinute, shift.endMinute);
  const hasBreakStart = shift.breakStartMinute != null;
  const hasBreakEnd = shift.breakEndMinute != null;

  if (hasBreakStart !== hasBreakEnd) {
    errors.push("Nghỉ giữa ca cần cả giờ bắt đầu và giờ kết thúc.");
  } else if (hasBreakStart && hasBreakEnd) {
    if (!isMinute(shift.breakStartMinute) || !isMinute(shift.breakEndMinute)) {
      errors.push("Giờ nghỉ giữa ca phải nằm trong 00:00–23:59.");
    } else {
      const breakStart = offsetFromStart(shift.startMinute, shift.breakStartMinute);
      const breakEnd = offsetFromStart(shift.startMinute, shift.breakEndMinute);
      if (!(breakStart > 0 && breakEnd > breakStart && breakEnd < length)) {
        errors.push(`Nghỉ giữa ca phải nằm trong ca (${formatMinute(shift.startMinute)}–${formatMinute(shift.endMinute)}).`);
      }
    }
  }

  if (shift.type === "flexible") {
    const available = length - breakLengthMinutes(shift);
    if (!Number.isInteger(shift.requiredMinutes) || (shift.requiredMinutes as number) < 1 || (shift.requiredMinutes as number) > available) {
      errors.push(`Ca linh hoạt cần số phút làm từ 1 đến ${available} (độ dài khung trừ nghỉ).`);
    }
  }

  return errors;
}

// The rules a shift runs under: its own overrides where set, the company policy otherwise.
export type ShiftRules = {
  lateGraceMinutes: number;
  earlyGraceMinutes: number;
  lateCountMode: LateCountMode;
  missingPunchMode: MissingPunchMode;
  punchWindowBeforeMinutes: number;
  punchWindowAfterMinutes: number;
};

type RuleOverrides = Pick<
  Shift,
  "lateGraceMinutes" | "earlyGraceMinutes" | "lateCountMode" | "missingPunchMode" | "punchWindowBeforeMinutes" | "punchWindowAfterMinutes"
>;

export function resolveShiftRules(policy: Pick<AttendancePolicy, keyof ShiftRules>, shift: Partial<RuleOverrides>): ShiftRules {
  return {
    lateGraceMinutes: shift.lateGraceMinutes ?? policy.lateGraceMinutes,
    earlyGraceMinutes: shift.earlyGraceMinutes ?? policy.earlyGraceMinutes,
    lateCountMode: shift.lateCountMode ?? policy.lateCountMode,
    missingPunchMode: shift.missingPunchMode ?? policy.missingPunchMode,
    punchWindowBeforeMinutes: shift.punchWindowBeforeMinutes ?? policy.punchWindowBeforeMinutes,
    punchWindowAfterMinutes: shift.punchWindowAfterMinutes ?? policy.punchWindowAfterMinutes
  };
}
