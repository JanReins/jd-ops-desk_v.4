import type { Obligation, RecurringTemplate } from "./types";
import {
  addDays,
  addMonths,
  clampDate,
  getMelbourneCurrentPeriod,
  getMelbourneToday,
  getMonthLastDay,
  startOfWeekMonday,
  weekdayIndexMelbourne,
} from "./dates";
import { isOpenStatus } from "./todaySet";

export const DEMO_TEMPLATES: RecurringTemplate[] = [];

export function nextDueForTemplate(template: RecurringTemplate, today = getMelbourneToday()): string {
  if (template.dueRule === "today") {
    const dow = weekdayIndexMelbourne(today);
    if (dow === 0 || dow === 6) return addDays(startOfWeekMonday(today), 7);
    return today;
  }
  if (template.dueRule === "monday") {
    const monday = startOfWeekMonday(today);
    return monday < today ? addDays(monday, 7) : monday;
  }
  if (template.dueRule === "21_next") {
    const next = addMonths(getMelbourneCurrentPeriod(), 1);
    const [y, m] = next.split("-").map(Number);
    return clampDate(y, m, 21);
  }
  const [y, m] = today.split("-").map(Number);
  const last = getMonthLastDay(y, m);
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export function templateAlreadyOpen(
  template: RecurringTemplate,
  obligations: Obligation[],
  dueDate: string,
): boolean {
  return obligations.some((o) => {
    if (!isOpenStatus(o.status)) return false;
    if (o.templateId === template.id) return true;
    if (o.clientId !== template.clientId) return false;
    if ((o.taskLabel || "") !== template.taskLabel) return false;
    if (template.cadence === "weekly") {
      return o.dueDate.slice(0, 7) === dueDate.slice(0, 7);
    }
    return o.periodStart === `${dueDate.slice(0, 7)}-01` || o.dueDate.slice(0, 7) === dueDate.slice(0, 7);
  });
}
