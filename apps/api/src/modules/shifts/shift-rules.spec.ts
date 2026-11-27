import {
  formatMinute,
  requiredMinutesFor,
  resolveShiftRules,
  shiftLengthMinutes,
  validateShiftTimes,
  type ShiftTimes
} from "./shift-rules";

const at = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const office: ShiftTimes = { type: "fixed", startMinute: at("08:00"), endMinute: at("17:00"), breakStartMinute: at("12:00"), breakEndMinute: at("13:00") };
const night: ShiftTimes = { type: "fixed", startMinute: at("22:00"), endMinute: at("06:00") };

describe("shift rules (AT-05, AT-06)", () => {
  it("measures day and overnight shifts", () => {
    expect(shiftLengthMinutes(office.startMinute, office.endMinute)).toBe(540);
    expect(shiftLengthMinutes(night.startMinute, night.endMinute)).toBe(480);
    expect(requiredMinutesFor(office)).toBe(480);
    expect(requiredMinutesFor(night)).toBe(480);
    expect(requiredMinutesFor({ type: "flexible", startMinute: at("07:00"), endMinute: at("19:00"), requiredMinutes: 480 })).toBe(480);
  });

  it("accepts valid shifts, including a break after midnight in a night shift", () => {
    expect(validateShiftTimes(office)).toEqual([]);
    expect(validateShiftTimes(night)).toEqual([]);
    expect(validateShiftTimes({ ...night, breakStartMinute: at("01:00"), breakEndMinute: at("01:30") })).toEqual([]);
    expect(requiredMinutesFor({ ...night, breakStartMinute: at("01:00"), breakEndMinute: at("01:30") })).toBe(450);
  });

  it.each([
    ["same start and end", { ...office, endMinute: office.startMinute }],
    ["break outside the shift", { ...office, breakStartMinute: at("18:00"), breakEndMinute: at("18:30") }],
    ["break touching the start", { ...office, breakStartMinute: at("08:00"), breakEndMinute: at("09:00") }],
    ["break ending before it starts", { ...office, breakStartMinute: at("13:00"), breakEndMinute: at("12:00") }],
    ["half a break", { ...office, breakEndMinute: null }],
    ["out of range time", { ...office, endMinute: 1440 }],
    ["flexible shift asking more than its window", { type: "flexible", startMinute: at("08:00"), endMinute: at("12:00"), requiredMinutes: 300 }],
    ["flexible shift without required minutes", { type: "flexible", startMinute: at("08:00"), endMinute: at("17:00") }]
  ] as Array<[string, ShiftTimes]>)("rejects %s", (_label, shift) => {
    expect(validateShiftTimes(shift).length).toBeGreaterThan(0);
  });

  it("formats minutes as HH:MM", () => {
    expect([formatMinute(0), formatMinute(480), formatMinute(1439)]).toEqual(["00:00", "08:00", "23:59"]);
  });

  it("uses a shift's own rules where set and the company policy elsewhere", () => {
    const policy = {
      lateGraceMinutes: 5,
      earlyGraceMinutes: 5,
      lateCountMode: "full" as const,
      missingPunchMode: "pending" as const,
      punchWindowBeforeMinutes: 240,
      punchWindowAfterMinutes: 240
    };

    expect(resolveShiftRules(policy, { lateGraceMinutes: 15, lateCountMode: "excess", earlyGraceMinutes: null })).toEqual({
      ...policy,
      lateGraceMinutes: 15,
      lateCountMode: "excess"
    });
  });
});
