import type { Client, Obligation, Workstream } from "./types";
import {
  clampDate,
  getLastFridayOfMonth,
  getMelbourneToday,
  getNextMonthPeriod,
  getMelbourneCurrentPeriod,
  getWeeksForPeriod,
  weekContainingDate,
  type MonthWeek,
} from "./dates";
import { isOpenStatus } from "./todaySet";
import { METKA_CLIENT_ID, METKA_ENTITIES, isMetkaClient } from "./metka";
import { formatPeriod } from "./types";

export interface CandidateObligation {
  clientId: string;
  clientShortName: string;
  workstream: Workstream;
  periodStart: string;
  dueDate: string;
  status: "Not started";
  owner: string;
  reviewer: string;
  priority: "P2";
  recurring: boolean;
  nextAction: string;
  blocker: string;
  waitingOn: string;
  notes: string;
  order: number;
  taskLabel?: string;
  weekCode?: string;
  sourceSheet?: string;
  entityName?: string;
  estimatedMinutes?: number;
}

function alreadyExists(
  existing: Obligation[],
  clientId: string,
  workstream: Workstream,
  periodStart: string,
  taskLabel: string,
  weekCode?: string,
  entityName?: string,
): boolean {
  return existing.some((o) => {
    if (o.clientId !== clientId || o.workstream !== workstream) return false;
    if (entityName) return o.periodStart === periodStart && o.entityName === entityName;
    if (weekCode) return o.periodStart === periodStart && o.weekCode === weekCode;
    return o.periodStart === periodStart && (o.taskLabel === taskLabel || o.nextAction === taskLabel);
  });
}

export function generateNextMonthCandidates(
  clients: Client[],
  existingObligations: Obligation[],
  targetPeriodStart: string,
  filterClientId?: string,
): CandidateObligation[] {
  const [targetYear, targetMonthNum] = targetPeriodStart.split("-").map(Number);
  const followingYear = targetMonthNum === 12 ? targetYear + 1 : targetYear;
  const followingMonthNum = targetMonthNum === 12 ? 1 : targetMonthNum + 1;

  const targetClients = filterClientId
    ? clients.filter((c) => c.id === filterClientId)
    : clients.filter((c) => !c.inactive);

  const candidates: CandidateObligation[] = [];
  let orderSeed = 10;

  targetClients.forEach((client) => {
    const s = client.services;
    if (!s) return;

    const addIfNotExist = (
      workstream: Workstream,
      dueDate: string,
      nextAction: string,
      taskLabel: string,
      extra?: { weekCode?: string; sourceSheet?: string },
    ) => {
      if (
        alreadyExists(
          existingObligations.concat(
            candidates.map((c) => ({
              ...c,
              id: `pending-${c.clientId}-${c.periodStart}-${c.weekCode || c.taskLabel}`,
            })) as Obligation[],
          ),
          client.id,
          workstream,
          targetPeriodStart,
          taskLabel,
          extra?.weekCode,
        )
      ) {
        return;
      }
      candidates.push({
        clientId: client.id,
        clientShortName: client.shortName || client.name,
        workstream,
        periodStart: targetPeriodStart,
        dueDate,
        status: "Not started",
        owner: client.junior || "Jan",
        reviewer: client.senior || "",
        priority: "P2",
        recurring: true,
        nextAction,
        blocker: "",
        waitingOn: "",
        notes: "",
        order: orderSeed++,
        taskLabel,
        weekCode: extra?.weekCode,
        sourceSheet: extra?.sourceSheet,
      });
    };

    if (!isMetkaClient(client.id)) {
      if (s.monthlyBAS) {
        addIfNotExist(
          "bas_ias",
          clampDate(followingYear, followingMonthNum, 21),
          "Lodge monthly BAS",
          "Monthly BAS",
          { sourceSheet: "BAS-IAS Tracker" },
        );
      }

      if (s.twoMonthlyIAS && targetMonthNum % 2 === 0) {
        addIfNotExist(
          "bas_ias",
          clampDate(followingYear, followingMonthNum, 21),
          "Lodge 2-monthly IAS",
          "2-monthly IAS",
          { sourceSheet: "BAS-IAS Tracker" },
        );
      }

      if (s.quarterlyBAS && [3, 6, 9, 12].includes(targetMonthNum)) {
        addIfNotExist(
          "bas_ias",
          clampDate(followingYear, followingMonthNum, 21),
          "Lodge quarterly BAS",
          "QTR BAS",
          { sourceSheet: "BAS-IAS Tracker" },
        );
      }
    }

    if (s.weeklyBooks) {
      for (const week of getWeeksForPeriod(targetPeriodStart)) {
        addIfNotExist(
          "bookkeeping",
          week.dueDate,
          "Weekly bank reconciliation & ledger balance",
          "Weekly bookkeeping",
          { weekCode: week.weekCode, sourceSheet: "Bookkeeping" },
        );
      }
    } else if (s.monthlyBooks) {
      const weeks = getWeeksForPeriod(targetPeriodStart);
      const last = weeks[weeks.length - 1];
      addIfNotExist(
        "bookkeeping",
        last ? last.dueDate : getLastFridayOfMonth(targetYear, targetMonthNum),
        "Monthly bank reconciliation & month-end accounts",
        "Monthly bookkeeping",
        { weekCode: last?.weekCode || `${targetPeriodStart.slice(0, 7)} W4`, sourceSheet: "Bookkeeping" },
      );
    }

    if (s.paymentRun) {
      addIfNotExist(
        "supplier_payments",
        clampDate(targetYear, targetMonthNum, 15),
        "Mid-month payment run",
        "Mid-month payment run",
        { weekCode: "Mid", sourceSheet: "Supplier Payment Run" },
      );
      addIfNotExist(
        "supplier_payments",
        clampDate(targetYear, targetMonthNum, 31),
        "EOM payment run",
        "Month-end payment run",
        { weekCode: "EOM", sourceSheet: "Supplier Payment Run" },
      );
    }

    if (s.managementReports) {
      const maDay = client.maDueDay || 15;
      addIfNotExist(
        "management_reports",
        clampDate(followingYear, followingMonthNum, maDay),
        "Prepare management reporting pack",
        "Prepare management accounts",
        { sourceSheet: "Management Reports" },
      );
    }

    if (s.payrollTax) {
      addIfNotExist(
        "payroll_tax",
        clampDate(followingYear, followingMonthNum, 7),
        "State payroll tax lodgement",
        "Payroll tax",
      );
    }

    if (s.stp) {
      addIfNotExist(
        "stp_payroll",
        clampDate(targetYear, targetMonthNum, 15),
        "STP payroll lodgement",
        "STP lodgement",
      );
    }
  });

  const metkaClient = targetClients.find((c) => c.id === METKA_CLIENT_ID);
  if (metkaClient) {
    const monthLabel = formatPeriod(targetPeriodStart);
    for (const entity of METKA_ENTITIES) {
      if (
        alreadyExists(
          existingObligations.concat(
            candidates.map((c) => ({
              ...c,
              id: `pending-${c.clientId}-${c.periodStart}-${c.entityName || c.weekCode || c.taskLabel}`,
            })) as Obligation[],
          ),
          METKA_CLIENT_ID,
          "metka_bas",
          targetPeriodStart,
          `${monthLabel} BAS — ${entity.shortName}`,
          undefined,
          entity.name,
        )
      ) {
        continue;
      }
      candidates.push({
        clientId: METKA_CLIENT_ID,
        clientShortName: entity.shortName,
        workstream: "metka_bas",
        periodStart: targetPeriodStart,
        dueDate: clampDate(followingYear, followingMonthNum, 21),
        status: "Not started",
        owner: entity.owner,
        reviewer: metkaClient.senior || "JCh",
        priority: "P2",
        recurring: true,
        nextAction: `Prepare ${entity.shortName} monthly BAS`,
        blocker: "",
        waitingOn: "",
        notes: entity.tax,
        order: orderSeed++,
        taskLabel: `${monthLabel} BAS — ${entity.shortName}`,
        sourceSheet: "Metka BAS – Non-Group",
        entityName: entity.name,
        estimatedMinutes: 20,
      });
    }
  }

  return candidates;
}

/** Current Melbourne month + the next `monthsForward` months. Idempotent against existing rows. */
export function generateRollingHorizon(
  clients: Client[],
  existingObligations: Obligation[],
  monthsForward = 2,
): CandidateObligation[] {
  const start = getMelbourneCurrentPeriod();
  const all: CandidateObligation[] = [];
  const virtual: Obligation[] = [...existingObligations];

  let period = start;
  for (let i = 0; i <= monthsForward; i++) {
    const batch = generateNextMonthCandidates(clients, virtual, period);
    all.push(...batch);
    for (const c of batch) {
      virtual.push({
        id: `virt-${c.clientId}-${c.periodStart}-${c.weekCode || c.taskLabel}`,
        clientId: c.clientId,
        workstream: c.workstream,
        periodStart: c.periodStart,
        dueDate: c.dueDate,
        status: c.status,
        owner: c.owner,
        reviewer: c.reviewer,
        priority: c.priority,
        recurring: true,
        nextAction: c.nextAction,
        blocker: "",
        waitingOn: "",
        notes: "",
        order: 0,
        taskLabel: c.taskLabel,
        weekCode: c.weekCode,
        entityName: c.entityName,
      });
    }
    period = getNextMonthPeriod(period);
  }

  return all;
}

export function generateCellCandidates(
  client: Client,
  existing: Obligation[],
  workstream: Workstream,
  periodStart: string,
  weekCode?: string,
  entityName?: string,
): CandidateObligation[] {
  return generateNextMonthCandidates([client], existing, periodStart, client.id).filter((c) => {
    if (c.workstream !== workstream) return false;
    if (entityName) return c.entityName === entityName;
    if (weekCode) return c.weekCode === weekCode;
    return true;
  });
}

export function defaultWorkstream(client: Client): Workstream {
  if (isMetkaClient(client.id)) return "metka_bas";
  const s = client.services;
  if (s.weeklyBooks || s.monthlyBooks) return "bookkeeping";
  if (s.monthlyBAS || s.twoMonthlyIAS || s.quarterlyBAS) return "bas_ias";
  if (s.paymentRun) return "supplier_payments";
  if (s.managementReports) return "management_reports";
  if (s.payrollTax) return "payroll_tax";
  if (s.stp) return "stp_payroll";
  return "admin";
}

export interface WeekBookRow {
  client: Client;
  week: MonthWeek;
  existing?: Obligation;
  candidate?: CandidateObligation;
  monthlyOnly: boolean;
}

export function thisWeekBookWork(
  clients: Client[],
  obligations: Obligation[],
  today = getMelbourneToday(),
): { week: MonthWeek; rows: WeekBookRow[] } | null {
  const week = weekContainingDate(today);
  if (!week) return null;
  const weeks = getWeeksForPeriod(week.periodStart);
  const lastCode = weeks[weeks.length - 1]?.weekCode;
  const isLastWeek = lastCode === week.weekCode;
  const rows: WeekBookRow[] = [];

  for (const client of clients) {
    if (client.inactive) continue;
    const weekly = Boolean(client.services.weeklyBooks);
    const monthlyOnly = Boolean(client.services.monthlyBooks) && !weekly;
    if (!weekly && !(monthlyOnly && isLastWeek)) continue;

    const existing =
      obligations.find(
        (o) =>
          o.clientId === client.id &&
          o.workstream === "bookkeeping" &&
          o.weekCode === week.weekCode &&
          isOpenStatus(o.status),
      ) ||
      obligations.find(
        (o) =>
          o.clientId === client.id && o.workstream === "bookkeeping" && o.weekCode === week.weekCode,
      );

    const candidate = existing
      ? undefined
      : generateCellCandidates(client, obligations, "bookkeeping", week.periodStart, week.weekCode)[0];

    rows.push({ client, week, existing, candidate, monthlyOnly });
  }

  return { week, rows };
}

export function findWeekBookCell(
  obligations: Obligation[],
  clientId: string,
  weekCode: string,
): Obligation | undefined {
  const rows = obligations.filter(
    (o) => o.clientId === clientId && o.workstream === "bookkeeping" && o.weekCode === weekCode,
  );
  return rows.find((o) => isOpenStatus(o.status)) || rows[0];
}
