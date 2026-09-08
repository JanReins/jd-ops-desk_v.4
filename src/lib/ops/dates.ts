export function getMelbourneToday(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Melbourne",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }
}

export function getMelbourneCurrentPeriod(): string {
  const today = getMelbourneToday();
  const [year, month] = today.split("-");
  return `${year}-${month}-01`;
}

export function formatMelbourneMonthYear(periodStartOrDate?: string): string {
  try {
    const target = periodStartOrDate || getMelbourneToday();
    const [year, month] = target.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  } catch {
    return "Current Period";
  }
}

export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function getNextMonthPeriod(periodStr: string): string {
  return addMonths(periodStr, 1);
}

export function addMonths(periodOrDate: string, delta: number): string {
  const [year, month] = periodOrDate.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function periodStartFromDate(dateStr: string): string {
  if (!dateStr) return "";
  return `${dateStr.slice(0, 7)}-01`;
}

export function listMonthPeriods(centerPeriod: string, back: number, forward: number): string[] {
  const out: string[] = [];
  for (let i = -back; i <= forward; i++) {
    out.push(addMonths(centerPeriod, i));
  }
  return out;
}

export function getMonthLastDay(year: number, month1Indexed: number): number {
  return new Date(year, month1Indexed, 0).getDate();
}

export function getLastFridayOfMonth(year: number, month1Indexed: number): string {
  const lastDay = getMonthLastDay(year, month1Indexed);
  for (let d = lastDay; d >= 1; d--) {
    const date = new Date(year, month1Indexed - 1, d);
    if (date.getDay() === 5) {
      return `${year}-${String(month1Indexed).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }
  return `${year}-${String(month1Indexed).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function clampDate(year: number, month1Indexed: number, desiredDay: number): string {
  const maxDay = getMonthLastDay(year, month1Indexed);
  const day = Math.min(Math.max(desiredDay, 1), maxDay);
  return `${year}-${String(month1Indexed).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export interface MonthWeek {
  weekIndex: number;
  weekCode: string;
  weekStart: string;
  dueDate: string;
  periodStart: string;
}

const MONTH_CODES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthShortCode(year: number, month1Indexed: number): string {
  return `${MONTH_CODES[month1Indexed - 1]}${String(year).slice(2)}`;
}

/** Mondays that fall in the month — matches the Excel bookkeeping grid (Sep26 W1 = first Monday). */
export function getMondaysInMonth(year: number, month1Indexed: number): MonthWeek[] {
  const last = getMonthLastDay(year, month1Indexed);
  const prefix = monthShortCode(year, month1Indexed);
  const periodStart = `${year}-${String(month1Indexed).padStart(2, "0")}-01`;
  const weeks: MonthWeek[] = [];
  let idx = 1;
  for (let d = 1; d <= last; d++) {
    const date = new Date(year, month1Indexed - 1, d);
    if (date.getDay() === 1) {
      const monday = `${year}-${String(month1Indexed).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      weeks.push({
        weekIndex: idx,
        weekCode: `${prefix} W${idx}`,
        weekStart: monday,
        dueDate: monday,
        periodStart,
      });
      idx += 1;
    }
  }
  return weeks;
}

export function getWeeksForPeriod(periodStart: string): MonthWeek[] {
  const [year, month] = periodStart.split("-").map(Number);
  return getMondaysInMonth(year, month);
}

/** Bookkeeping week that contains this date — keyed off the Monday, which may sit in the prior month. */
export function weekContainingDate(dateStr: string): MonthWeek | null {
  if (!dateStr) return null;
  const monday = startOfWeekMonday(dateStr);
  const period = periodStartFromDate(monday);
  return getWeeksForPeriod(period).find((w) => w.weekStart === monday) ?? null;
}

export function formatAuDay(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

export function formatAuShort(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function weekdayIndexMelbourne(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function startOfWeekMonday(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const dayIdx = d.getDay();
  const offset = dayIdx === 0 ? -6 : 1 - dayIdx;
  return addDays(dateStr, offset);
}

export function diffDays(fromDate: string, toDate: string): number {
  if (!fromDate || !toDate) return 0;
  const [y1, m1, d1] = fromDate.split("-").map(Number);
  const [y2, m2, d2] = toDate.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

export function daysOverdue(dueDate: string, today: string): number {
  if (!dueDate || dueDate >= today) return 0;
  return diffDays(dueDate, today);
}
