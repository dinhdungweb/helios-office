// Calendar dates and wall-clock minutes in the company time zone, converted to and from instants
// with Intl only, so results never depend on the server's own time zone (design §3).

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    formatters.set(timeZone, format);
  }
  return format;
}

// Wall-clock parts of an instant in a time zone.
function wallClock(instantMs: number, timeZone: string) {
  const parts = Object.fromEntries(formatter(timeZone).formatToParts(new Date(instantMs)).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

function offsetMs(instantMs: number, timeZone: string) {
  const wall = wallClock(instantMs, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

function parseDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

// The instant at `minute` minutes after midnight of `date` (YYYY-MM-DD) in `timeZone`. Minutes may
// exceed a day (1440 + 360 = 06:00 the next day) to follow a shift past midnight.
export function zonedInstant(date: string, minute: number, timeZone: string) {
  const { year, month, day } = parseDate(date);
  const guess = Date.UTC(year, month - 1, day) + minute * MINUTE_MS;
  const first = guess - offsetMs(guess, timeZone);
  // A second pass settles instants near a daylight-saving change.
  return first - (offsetMs(first, timeZone) - offsetMs(guess, timeZone));
}

export function localDate(instantMs: number, timeZone: string) {
  const wall = wallClock(instantMs, timeZone);
  return `${wall.year}-${String(wall.month).padStart(2, "0")}-${String(wall.day).padStart(2, "0")}`;
}

export function addDays(date: string, days: number) {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

// ISO weekday of a calendar date: 1 = Monday … 7 = Sunday.
export function isoWeekday(date: string) {
  const { year, month, day } = parseDate(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export const MINUTE = MINUTE_MS;
