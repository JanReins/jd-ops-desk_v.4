import type { Obligation, ObligationStatus, Workstream } from "./types.ts";
import { getMelbourneCurrentPeriod, getMelbourneToday } from "./dates.ts";

/** Soft cap for open items on today's stack — Excel daily planner length. */
export const TODAY_SOFT_CAP = 10;
/** Default sitting capacity used for the open-minutes header. */
export const DAY_CAPACITY_MINUTES = 360;
/** Per-client load bar scale (one sitting-day of that client). */
export const CLIENT_LOAD_MINUTES = 480;

export function isOpenStatus(status: Obligation["status"]): boolean {
  return status !== "Done" && status !== "Not applicable";
}

export type Court = "mine" | "theirs" | "done";

/** Work I can do now vs work I am watching. */
export function getCourt(status: ObligationStatus): Court {
  if (status === "Done" || status === "Not applicable") return "done";
  if (status === "Waiting on client" || status === "Blocked") {
    return "theirs";
  }
  return "mine";
}

/**
 * Today's plan is curated — matching the Excel Daily Priority Planner.
 * Only items explicitly pinned (`onTodayPlan`) or carried over appear here.
 */
export function isTodayObligation(ob: Obligation): boolean {
  if (ob.status === "Not applicable") return false;
  return Boolean(ob.onTodayPlan) || Boolean(ob.carryOver);
}

export function getTodaySet(obligations: Obligation[], _melbourneToday?: string): Obligation[] {
  return obligations.filter(isTodayObligation);
}

export function sortTodayStack(items: Obligation[]): Obligation[] {
  return items.slice().sort((a, b) => {
    const openA = isOpenStatus(a.status) ? 0 : 1;
    const openB = isOpenStatus(b.status) ? 0 : 1;
    if (openA !== openB) return openA - openB;
    const courtRank = (o: Obligation) => (getCourt(o.status) === "mine" ? 0 : getCourt(o.status) === "theirs" ? 1 : 2);
    if (courtRank(a) !== courtRank(b)) return courtRank(a) - courtRank(b);
    const ordA = a.todayOrder ?? a.order ?? 0;
    const ordB = b.todayOrder ?? b.order ?? 0;
    if (ordA !== ordB) return ordA - ordB;
    return (a.dueDate || "").localeCompare(b.dueDate || "");
  });
}

/** Open work due today that is not on the plan — candidates to pin, not auto-added. */
export function getDueNotOnPlan(obligations: Obligation[], melbourneToday?: string): Obligation[] {
  const today = melbourneToday || getMelbourneToday();
  return obligations
    .filter(
      (o) =>
        isOpenStatus(o.status) &&
        o.dueDate === today &&
        !isTodayObligation(o) &&
        o.workstream !== "metka_bas",
    )
    .sort(sortBacklog);
}

export const BACKLOG_PREVIEW = 8;

export type BacklogBucket = {
  overdueMine: Obligation[];
  overdueTheirs: Obligation[];
  leftoverMine: Obligation[];
  leftoverTheirs: Obligation[];
  all: Obligation[];
  mineCount: number;
  theirsCount: number;
  overdueCount: number;
  leftoverCount: number;
};

function priorityRank(p: Obligation["priority"]): number {
  if (p === "P1") return 0;
  if (p === "P2") return 1;
  return 2;
}

function courtSortRank(o: Obligation): number {
  const court = getCourt(o.status);
  if (court === "mine") return 0;
  if (court === "theirs") return 1;
  return 2;
}

/** P1 first, then oldest due date, then my court. */
export function sortBacklog(a: Obligation, b: Obligation): number {
  const pr = priorityRank(a.priority) - priorityRank(b.priority);
  if (pr !== 0) return pr;
  const da = a.dueDate || "9999-99-99";
  const db = b.dueDate || "9999-99-99";
  if (da !== db) return da.localeCompare(db);
  return courtSortRank(a) - courtSortRank(b);
}

/**
 * Off-plan leftover: overdue (due before today) or still open from a prior
 * month. Does not include due-today (that tray is separate) and never auto-pins.
 */
export function getBacklog(
  obligations: Obligation[],
  melbourneToday?: string,
  currentPeriod?: string,
): BacklogBucket {
  const today = melbourneToday || getMelbourneToday();
  const period = currentPeriod || getMelbourneCurrentPeriod();
  const overdueMine: Obligation[] = [];
  const overdueTheirs: Obligation[] = [];
  const leftoverMine: Obligation[] = [];
  const leftoverTheirs: Obligation[] = [];

  for (const o of obligations) {
    if (!isOpenStatus(o.status) || isTodayObligation(o)) continue;
    if (o.workstream === "metka_bas") continue;
    const overdue = Boolean(o.dueDate && o.dueDate < today);
    const leftover =
      Boolean(o.periodStart && o.periodStart < period) && !overdue && o.dueDate !== today;
    if (!overdue && !leftover) continue;
    const mine = getCourt(o.status) === "mine";
    if (overdue) {
      (mine ? overdueMine : overdueTheirs).push(o);
    } else {
      (mine ? leftoverMine : leftoverTheirs).push(o);
    }
  }

  overdueMine.sort(sortBacklog);
  overdueTheirs.sort(sortBacklog);
  leftoverMine.sort(sortBacklog);
  leftoverTheirs.sort(sortBacklog);
  const all = [...overdueMine, ...overdueTheirs, ...leftoverMine, ...leftoverTheirs].sort(sortBacklog);
  return {
    overdueMine,
    overdueTheirs,
    leftoverMine,
    leftoverTheirs,
    all,
    mineCount: overdueMine.length + leftoverMine.length,
    theirsCount: overdueTheirs.length + leftoverTheirs.length,
    overdueCount: overdueMine.length + overdueTheirs.length,
    leftoverCount: leftoverMine.length + leftoverTheirs.length,
  };
}

export function groupBacklogByPeriod(items: Obligation[]): { period: string; items: Obligation[] }[] {
  const map = new Map<string, Obligation[]>();
  for (const o of items) {
    const key = o.periodStart || "";
    const list = map.get(key) || [];
    list.push(o);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, rows]) => ({ period, items: rows.sort(sortBacklog) }));
}

/** Open ledger rows whose period is before this Melbourne month — includes pinned. */
export function priorPeriodOpen(
  obligations: Obligation[],
  currentPeriod?: string,
): Obligation[] {
  const period = currentPeriod || getMelbourneCurrentPeriod();
  return obligations.filter(
    (o) =>
      isOpenStatus(o.status) &&
      Boolean(o.periodStart) &&
      o.periodStart < period &&
      o.workstream !== "metka_bas",
  );
}

export function isOverdueOpen(o: Obligation, melbourneToday?: string): boolean {
  const today = melbourneToday || getMelbourneToday();
  return isOpenStatus(o.status) && Boolean(o.dueDate) && o.dueDate < today;
}


export function openMinutes(items: Obligation[]): {
  minutes: number;
  estimatedCount: number;
  unestimated: number;
} {
  const open = items.filter((o) => isOpenStatus(o.status));
  const estimated = open.filter((o) => (o.estimatedMinutes || 0) > 0);
  return {
    minutes: estimated.reduce((sum, o) => sum + (o.estimatedMinutes || 0), 0),
    estimatedCount: estimated.length,
    unestimated: open.length - estimated.length,
  };
}

export function typicalMinutes(o: Obligation): number {
  if (o.estimatedMinutes && o.estimatedMinutes > 0) return o.estimatedMinutes;
  const ws: Workstream = o.workstream;
  if (ws === "bookkeeping") return 60;
  if (ws === "management_reports") return 90;
  if (ws === "bas_ias") return 45;
  if (ws === "metka_bas") return 20;
  if (ws === "supplier_payments") return 30;
  if (ws === "payroll_tax") return 40;
  if (ws === "stp_payroll") return 25;
  return 30;
}

const JAN_ALIASES = new Set(["jan", "jd", "naja"]);

/** Practitioner sit — JD / Jan. Empty owner counts as you on this desk. */
export function isJanOwned(o: { owner?: string }): boolean {
  const raw = (o.owner || "jan").trim().toLowerCase();
  return JAN_ALIASES.has(raw);
}

export function clientMonthLoad(
  clientId: string,
  obligations: Obligation[],
  period = getMelbourneCurrentPeriod(),
  today = getMelbourneToday(),
): {
  open: number;
  minutes: number;
  overdue: number;
  teamOpen: number;
  teamMinutes: number;
  packCells: number;
} {
  const open = obligations.filter(
    (o) =>
      o.clientId === clientId &&
      isOpenStatus(o.status) &&
      o.periodStart === period &&
      o.workstream !== "metka_bas",
  );
  const pack = obligations.filter(
    (o) =>
      o.clientId === clientId &&
      o.workstream === "metka_bas" &&
      o.periodStart === period &&
      isOpenStatus(o.status),
  );
  const mine = open.filter(isJanOwned);
  const team = open.filter((o) => !isJanOwned(o));
  const packMine = pack.filter(isJanOwned);
  const packTeam = pack.filter((o) => !isJanOwned(o));
  const packSittingMinutes = packMine.length > 0 ? typicalMinutes(packMine[0]) : 0;
  return {
    open: mine.length + (packMine.length > 0 ? 1 : 0),
    minutes: mine.reduce((sum, o) => sum + typicalMinutes(o), 0) + packSittingMinutes,
    overdue: mine.filter((o) => o.dueDate && o.dueDate < today).length,
    teamOpen: team.length + (packTeam.length > 0 ? 1 : 0),
    teamMinutes: team.reduce((sum, o) => sum + typicalMinutes(o), 0),
    packCells: pack.length,
  };
}
