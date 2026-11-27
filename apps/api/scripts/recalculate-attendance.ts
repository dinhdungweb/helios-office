import { PrismaService } from "../src/common/prisma/prisma.service";
import { AttendanceCalculationService } from "../src/modules/attendance/attendance-calculation.service";
import { addDays, localDate } from "../src/modules/attendance/engine/zoned-time";

// Recomputes AttendanceDay from the raw punches (plan Phase 2 task 8), e.g. after moving to the
// engine or changing the company time zone. The API endpoint for this comes with AT-12.
// usage: npm run attendance:recalculate -- [--from YYYY-MM-DD] [--to YYYY-MM-DD]
// Defaults: from the first raw punch to today, in the company time zone.

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`--${name} must be YYYY-MM-DD`);
  return value;
}

async function main() {
  const prisma = new PrismaService();
  const calculation = new AttendanceCalculationService(prisma);
  try {
    const timeZone = await calculation.timezone();
    const first = await prisma.attendanceRawLog.findFirst({ orderBy: { punchTime: "asc" }, select: { punchTime: true } });
    const today = localDate(Date.now(), timeZone);
    const from = argument("from") ?? (first ? localDate(first.punchTime.getTime(), timeZone) : today);
    const to = argument("to") ?? today;

    let totals = { days: 0, changed: 0, removed: 0 };
    // A month at a time keeps each read small.
    for (let start = from; start <= to; ) {
      const monthEnd = addDays(`${start.slice(0, 7)}-01`, 40).slice(0, 7) + "-01";
      const end = addDays(monthEnd, -1) < to ? addDays(monthEnd, -1) : to;
      const result = await calculation.recalculate({ from: start, to: end, source: "recalculation" });
      console.log(`${start} → ${end}: ${result.days} days, ${result.changed} changed, ${result.removed} removed`);
      totals = { days: totals.days + result.days, changed: totals.changed + result.changed, removed: totals.removed + result.removed };
      start = addDays(end, 1);
    }
    console.log(`Total: ${totals.days} days, ${totals.changed} changed, ${totals.removed} removed`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
