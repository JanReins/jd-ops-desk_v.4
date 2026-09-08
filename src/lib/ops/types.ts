export type Workstream =
  | "bas_ias"
  | "metka_bas"
  | "management_reports"
  | "bookkeeping"
  | "supplier_payments"
  | "payroll_tax"
  | "stp_payroll"
  | "admin";

export type ObligationStatus =
  | "Not started"
  | "In progress"
  | "For review"
  | "Waiting on client"
  | "Blocked"
  | "Ready to lodge"
  | "Done"
  | "Not applicable";

export type Priority = "P1" | "P2" | "P3";

export type PersonalTaskStatus = "Not started" | "In progress" | "Done";

export interface ClientServices {
  monthlyBAS: boolean;
  twoMonthlyIAS: boolean;
  quarterlyBAS: boolean;
  weeklyBooks: boolean;
  monthlyBooks: boolean;
  paymentRun: boolean;
  managementReports: boolean;
  payrollTax: boolean;
  stp: boolean;
}

export interface Client {
  id: string;
  name: string;
  shortName: string;
  software: string;
  junior: string;
  senior: string;
  manager: string;
  services: ClientServices;
  maDueDay: number;
  notes: string;
  folderStatus?: string;
  inactive?: boolean;
  group?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Obligation {
  id: string;
  clientId: string;
  workstream: Workstream;
  periodStart: string;
  dueDate: string;
  status: ObligationStatus;
  owner: string;
  reviewer: string;
  priority: Priority;
  nextAction: string;
  blocker: string;
  waitingOn: string;
  recurring: boolean;
  estimatedMinutes?: number;
  order: number;
  todayOrder?: number;
  carryOver?: boolean;
  notes?: string;
  taskLabel?: string;
  onTodayPlan?: boolean;
  sourceSheet?: string;
  entityName?: string;
  weekCode?: string;
  templateId?: string;
  userId?: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonalTask {
  id: string;
  category: string;
  task: string;
  dueDate: string;
  status: PersonalTaskStatus;
  notes: string;
  order: number;
}

export interface RecurringTemplate {
  id: string;
  clientId: string;
  workstream: Workstream;
  cadence: "weekly" | "monthly" | "fortnightly";
  dueRule: "today" | "monday" | "21_next" | "eom";
  taskLabel: string;
  nextAction: string;
  estimatedMinutes: number;
  pinOnSpawn: boolean;
}

export const WORKSTREAM_LABELS: Record<Workstream, string> = {
  bas_ias: "BAS / IAS",
  metka_bas: "Metka BAS",
  management_reports: "Management Reports",
  bookkeeping: "Bookkeeping",
  supplier_payments: "Supplier Payments",
  payroll_tax: "Payroll Tax",
  stp_payroll: "STP Payroll",
  admin: "Admin",
};

export const WORKSTREAM_CADENCE: Record<Workstream, string> = {
  bas_ias: "21st of following month",
  metka_bas: "21st — group lodgement",
  management_reports: "1st / 6th / 10th / 16th",
  bookkeeping: "Weekly / month-end W4",
  supplier_payments: "15th and 30th",
  payroll_tax: "7th of following month",
  stp_payroll: "Fortnightly / monthly",
  admin: "As needed",
};

export const SERVICE_LABELS: Record<keyof ClientServices, string> = {
  monthlyBAS: "Monthly BAS",
  twoMonthlyIAS: "2-Monthly IAS",
  quarterlyBAS: "Quarterly BAS",
  weeklyBooks: "Weekly Bookkeeping",
  monthlyBooks: "Monthly Bookkeeping",
  paymentRun: "Payment Run",
  managementReports: "Management Reports",
  payrollTax: "Payroll Tax",
  stp: "STP Lodgement",
};

export const ALL_STATUSES: ObligationStatus[] = [
  "Not started",
  "In progress",
  "For review",
  "Waiting on client",
  "Blocked",
  "Ready to lodge",
  "Done",
  "Not applicable",
];

export const EMPTY_SERVICES: ClientServices = {
  monthlyBAS: false,
  twoMonthlyIAS: false,
  quarterlyBAS: false,
  weeklyBooks: false,
  monthlyBooks: false,
  paymentRun: false,
  managementReports: false,
  payrollTax: false,
  stp: false,
};

export function normalizeServices(s?: Partial<ClientServices> | null): ClientServices {
  return { ...EMPTY_SERVICES, ...(s || {}) };
}


export const LOCAL_PRACTITIONER_ID = "local-practitioner";

export function formatPeriod(periodStart: string): string {
  if (!periodStart) return "";
  try {
    const [year, month] = periodStart.split("-");
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
  } catch {
    return periodStart;
  }
}

export function getTaskTitle(obligation: Obligation, client?: Client): string {
  const clientName = client?.shortName || client?.name || "";
  if (obligation.entityName) {
    return obligation.entityName;
  }
  if (obligation.taskLabel) {
    return clientName ? `${obligation.taskLabel} — ${clientName}` : obligation.taskLabel;
  }
  const wsLabel = WORKSTREAM_LABELS[obligation.workstream] || obligation.workstream;
  const period = formatPeriod(obligation.periodStart);
  if (clientName && period) return `${wsLabel} — ${clientName} — ${period}`;
  if (clientName) return `${wsLabel} — ${clientName}`;
  return wsLabel;
}
