// AT-25: standard work units of a month ("công chuẩn"), like 1Office's per-group setting on the
// timesheet. A rule covers departments × positions (an empty list means all) from a month on:
// - schedule: the units of the shifts scheduled in the month (the default without a rule);
// - auto: days in the month minus Sundays, plus an adjustment (1Office's TOTAL_DAY-TOTAL_SUNDAY-1);
// - fixed: a set number.
// The most specific rule wins (department and position, then department, then position, then
// everyone); among equally specific rules, the one with the latest start month.

export type StandardMode = "schedule" | "auto" | "fixed";

export type StandardRule = {
  id: string;
  name: string;
  departmentIds: string[];
  positionIds: string[];
  mode: StandardMode;
  fixedUnits: number | null;
  adjustUnits: number;
  effectiveFrom: string;
};

export type StandardTarget = { departmentId: string; positionId: string | null };

export type StandardResult = { units: number; hours: number; mode: StandardMode; ruleId: string | null; ruleName: string | null };

export function specificity(rule: Pick<StandardRule, "departmentIds" | "positionIds">) {
  return (rule.departmentIds.length > 0 ? 2 : 0) + (rule.positionIds.length > 0 ? 1 : 0);
}

function matches(rule: StandardRule, target: StandardTarget) {
  const department = rule.departmentIds.length === 0 || rule.departmentIds.includes(target.departmentId);
  const position = rule.positionIds.length === 0 || (target.positionId !== null && rule.positionIds.includes(target.positionId));
  return department && position;
}

export function pickRule(rules: StandardRule[], target: StandardTarget, month: string) {
  let best: StandardRule | null = null;
  for (const rule of rules) {
    if (rule.effectiveFrom > month || !matches(rule, target)) continue;
    if (!best) {
      best = rule;
      continue;
    }
    const difference = specificity(rule) - specificity(best);
    if (difference > 0 || (difference === 0 && rule.effectiveFrom > best.effectiveFrom)) best = rule;
  }
  return best;
}

// Days in the month minus its Sundays.
export function daysWithoutSundays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  let sundays = 0;
  for (let day = 1; day <= days; day += 1) if (new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay() === 0) sundays += 1;
  return days - sundays;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

// `schedule` carries what the shift schedule gives, used for the schedule mode; other modes turn
// units into hours with `hoursPerUnit` (the default shift's hours per unit).
export function standardFor(rule: StandardRule | null, month: string, schedule: { units: number; minutes: number }, hoursPerUnit: number): StandardResult {
  if (!rule || rule.mode === "schedule") {
    return { units: round2(schedule.units), hours: round2(schedule.minutes / 60), mode: "schedule", ruleId: rule?.id ?? null, ruleName: rule?.name ?? null };
  }
  const units = Math.max(0, rule.mode === "fixed" ? (rule.fixedUnits ?? 0) : daysWithoutSundays(month) + rule.adjustUnits);
  return { units: round2(units), hours: round2(units * hoursPerUnit), mode: rule.mode, ruleId: rule.id, ruleName: rule.name };
}

// Two rules clash when they are equally specific, start the same month and share a group.
export function overlaps(a: Pick<StandardRule, "departmentIds" | "positionIds" | "effectiveFrom">, b: Pick<StandardRule, "departmentIds" | "positionIds" | "effectiveFrom">) {
  if (a.effectiveFrom !== b.effectiveFrom || specificity(a) !== specificity(b)) return false;
  const share = (x: string[], y: string[]) => (x.length === 0 && y.length === 0) || x.some((item) => y.includes(item));
  return share(a.departmentIds, b.departmentIds) && share(a.positionIds, b.positionIds);
}
