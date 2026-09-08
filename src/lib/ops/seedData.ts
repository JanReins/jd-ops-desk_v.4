import {
  EMPTY_SERVICES,
  type Client,
  type ClientServices,
  type Obligation,
  type ObligationStatus,
  type PersonalTask,
  type Priority,
  type Workstream,
} from "./types";
import { METKA_ENTITIES } from "./metka";

export const SEED_VERSION = 5;

function svc(flags: Partial<ClientServices>): ClientServices {
  return { ...EMPTY_SERVICES, ...flags };
}

type ClientSeed = Omit<Client, "userId">;
type ObSeed = Omit<Obligation, "userId">;

function c(row: ClientSeed): ClientSeed {
  return row;
}

export const DEMO_CLIENTS: ClientSeed[] = [
  c({
    id: "client-practice",
    name: "JD Practice",
    shortName: "Practice",
    software: "—",
    junior: "Jan",
    senior: "JCh",
    manager: "JD",
    services: svc({}),
    maDueDay: 0,
    notes: "Internal admin — timesheets, leave, catch-all BAS review.",
    folderStatus: "Done",
  }),
  c({
    id: "client-zund",
    name: "Zund Australia Pty Ltd",
    shortName: "Zund",
    software: "Xero / XPM",
    junior: "Jan",
    senior: "RB",
    manager: "MG",
    services: svc({
      twoMonthlyIAS: true,
      quarterlyBAS: true,
      weeklyBooks: true,
      paymentRun: true,
      managementReports: true,
    }),
    maDueDay: 16,
    notes: "Include Mazars bill every 15th; Jet Couriers on mid or EOM. Form 384 sent — follow up.",
    folderStatus: "Done",
  }),
  c({
    id: "client-moscot",
    name: "Moscot South Yarra Pty Ltd",
    shortName: "Moscot",
    software: "Xero / XPM",
    junior: "Jan",
    senior: "PG",
    manager: "MG",
    services: svc({
      twoMonthlyIAS: true,
      quarterlyBAS: true,
      weeklyBooks: true,
      paymentRun: true,
      managementReports: true,
    }),
    maDueDay: 12,
    notes: "Look for invoices in F-drive & BAS/IAS if applicable. March BAS still out to sign.",
    folderStatus: "Done",
  }),
  c({
    id: "client-otk",
    name: "Outokumpu Stainless Pty Ltd",
    shortName: "OTK",
    software: "Xero / XPM",
    junior: "Jan",
    senior: "SH",
    manager: "TC",
    services: svc({
      monthlyBAS: true,
      weeklyBooks: true,
      paymentRun: true,
      managementReports: true,
    }),
    maDueDay: 1,
    notes:
      "Review draft bills each 15th; include usual bills missing in email. Include BAS payment slip & employee bank details for payroll.",
    folderStatus: "Done",
  }),
  c({
    id: "client-doit",
    name: "Doit International Aus Pty Ltd",
    shortName: "Doit",
    software: "APS",
    junior: "Jan",
    senior: "JCh",
    manager: "TC",
    services: svc({ monthlyBAS: true, payrollTax: true }),
    maDueDay: 0,
    notes: "Monthly BAS + PAYGI. Data available on the 16th. Form 384 lodged.",
    folderStatus: "Done",
  }),
  c({
    id: "client-spiliotis",
    name: "Spiliotis Legal Pty Ltd",
    shortName: "Spiliotis",
    software: "Xero / Leap / XPM",
    junior: "Jan",
    senior: "RB",
    manager: "JC",
    services: svc({ twoMonthlyIAS: true, quarterlyBAS: true, monthlyBooks: true }),
    maDueDay: 0,
    notes: "2-monthly IAS; quarterly BAS. Reviewer RB.",
    folderStatus: "Done",
  }),
  c({
    id: "client-elite",
    name: "Elite Perimeter Security Pty Ltd",
    shortName: "Elite",
    software: "XPM",
    junior: "Jan",
    senior: "RB",
    manager: "JC",
    services: svc({ monthlyBAS: true, twoMonthlyIAS: true }),
    maDueDay: 0,
    notes: "Include red items missed from previous BAS because payroll was completed late.",
    folderStatus: "Done",
  }),
  c({
    id: "client-lime",
    name: "Lime Network Pty Ltd",
    shortName: "Lime",
    software: "Netsuite / APS",
    junior: "Jan",
    senior: "RB",
    manager: "TC",
    services: svc({ monthlyBAS: true, payrollTax: true }),
    maDueDay: 0,
    notes: "Make a checklist for August BAS. Form 384 lodged.",
    folderStatus: "Done",
  }),
  c({
    id: "client-gestro",
    name: "Gestro / Ausmeter",
    shortName: "Gestro",
    software: "Xero",
    junior: "Jan",
    senior: "PG",
    manager: "MG",
    services: svc({ managementReports: true }),
    maDueDay: 10,
    notes: "Management accounts due on the 10th.",
    folderStatus: "Done",
  }),
  c({
    id: "client-peters",
    name: "L Vafeas & P Vafeas (Peters Prestons Market Takeaway)",
    shortName: "Peters Prestons",
    software: "APS",
    junior: "Jan",
    senior: "SH",
    manager: "MG",
    services: svc({ quarterlyBAS: true }),
    maDueDay: 0,
    notes: "Nil June BAS filed. SH asked whether further work is required.",
    folderStatus: "Done",
  }),
  c({
    id: "client-pirkx",
    name: "Pirkx Australia Pty Ltd",
    shortName: "Pirkx",
    software: "XPM",
    junior: "Jan",
    senior: "SH",
    manager: "MG",
    services: svc({ quarterlyBAS: true, twoMonthlyIAS: true }),
    maDueDay: 0,
    notes: "Business close — 30 June 2026 draft documents. Ask SH if further July IAS work required.",
    folderStatus: "Done",
    inactive: true,
  }),
  c({
    id: "client-eltham",
    name: "Eltham Physiotherapy Centre Pty Ltd",
    shortName: "Eltham",
    software: "Xero / XPM",
    junior: "Jan",
    senior: "TC",
    manager: "JC",
    services: svc({ quarterlyBAS: true, monthlyBooks: true }),
    maDueDay: 0,
    notes: "No folder structure yet — double check with DS.",
    folderStatus: "Not set",
  }),
  c({
    id: "client-boyd-ac",
    name: "A & C Boyd Pty Ltd",
    shortName: "A & C Boyd",
    software: "MYOB",
    junior: "Jan",
    senior: "TC",
    manager: "JC",
    services: svc({ quarterlyBAS: true, monthlyBooks: true }),
    maDueDay: 0,
    notes: "Mulcahy Group.",
    folderStatus: "Mulcahy Group",
  }),
  c({
    id: "client-boyd-elec",
    name: "Boyd Electrical Trust",
    shortName: "Boyd Electrical",
    software: "MYOB",
    junior: "Jan",
    senior: "TC",
    manager: "JC",
    services: svc({ quarterlyBAS: true, monthlyBooks: true }),
    maDueDay: 0,
    notes: "Trustee for Boyd Electrical Trust.",
    folderStatus: "Not set",
  }),
  c({
    id: "client-mulcahy",
    name: "Mulcahy Family Investments Pty Ltd",
    shortName: "Mulcahy Family",
    software: "MYOB",
    junior: "Jan",
    senior: "TC",
    manager: "JC",
    services: svc({ quarterlyBAS: true, monthlyBooks: true }),
    maDueDay: 0,
    notes: "Mulcahy Family Trust.",
    folderStatus: "Not set",
  }),
  c({
    id: "client-1161",
    name: "The Trustee for the 1161 Main Rd Unit Trust",
    shortName: "1161 Main",
    software: "Xero / XPM",
    junior: "Jan",
    senior: "TC",
    manager: "JC",
    services: svc({ quarterlyBAS: true, monthlyBooks: true }),
    maDueDay: 0,
    notes: "",
    folderStatus: "Not set",
  }),
  c({
    id: "client-jwcolour",
    name: "JW Colour Pty Ltd",
    shortName: "JW Colour",
    software: "XPM / Keypay",
    junior: "Jan",
    senior: "JCh",
    manager: "MG",
    services: svc({ twoMonthlyIAS: true, quarterlyBAS: true }),
    maDueDay: 0,
    notes: "Can't find folder.",
    folderStatus: "Missing",
  }),
  c({
    id: "client-ard",
    name: "A R D Earthmoving and Civil Construction Pty Ltd",
    shortName: "A R D",
    software: "APS",
    junior: "Jan",
    senior: "JCH",
    manager: "TC",
    services: svc({ quarterlyBAS: true, monthlyBooks: true, stp: true }),
    maDueDay: 0,
    notes: "Quarterly bookkeeping and payroll. Super due 21st of the following month.",
    folderStatus: "Done",
  }),
  c({
    id: "client-ashling",
    name: "Ashling Partners Australia Pty Ltd",
    shortName: "Ashling",
    software: "XPM",
    junior: "Jan",
    senior: "SH",
    manager: "MG",
    services: svc({ twoMonthlyIAS: true, quarterlyBAS: true }),
    maDueDay: 0,
    notes: "Form 384 lodged.",
    folderStatus: "Done",
  }),
  c({
    id: "client-bdp",
    name: "Building Design Partnership Australasia Pty Limited",
    shortName: "BDP",
    software: "XPM",
    junior: "Jan",
    senior: "PG / SH",
    manager: "MG",
    services: svc({ twoMonthlyIAS: true, quarterlyBAS: true }),
    maDueDay: 0,
    notes: "Need data for April 2026. Form 384 lodged.",
    folderStatus: "Done",
  }),
  c({
    id: "client-couchbase",
    name: "Couchbase Australia Pty Ltd",
    shortName: "Couchbase",
    software: "XPM",
    junior: "Jan",
    senior: "SH",
    manager: "MG",
    services: svc({ twoMonthlyIAS: true, quarterlyBAS: true }),
    maDueDay: 0,
    notes: "Unusual due dates. Form 384 lodged.",
    folderStatus: "Done",
  }),
  c({
    id: "client-airis",
    name: "Airis Security Technologies Pty Ltd",
    shortName: "Airis",
    software: "XPM",
    junior: "Jan",
    senior: "PG",
    manager: "MG",
    services: svc({ quarterlyBAS: true, twoMonthlyIAS: true }),
    maDueDay: 0,
    notes: "Disengaged in payroll April 2026. Form 384 lodged.",
    folderStatus: "Done",
    inactive: true,
  }),
  c({
    id: "client-atgroup",
    name: "AT Group Management Pte Ltd",
    shortName: "AT Group",
    software: "XPM",
    junior: "Jan",
    senior: "PG",
    manager: "TC",
    services: svc({ twoMonthlyIAS: true }),
    maDueDay: 0,
    notes: "",
    folderStatus: "Done",
  }),
  c({
    id: "client-metka",
    name: "Metka Non-Group",
    shortName: "Metka",
    software: "APS",
    junior: "Jan",
    senior: "JCh",
    manager: "JC",
    services: svc({ monthlyBAS: false }),
    maDueDay: 0,
    notes: "20 non-group entities. Monthly BAS is an entity pack — one cell per entity, not one client row.",
    folderStatus: "Done",
    group: "Metka",
  }),
  c({
    id: "client-fdm",
    name: "FDM Operations Pte. Ltd",
    shortName: "FDM",
    software: "XPM",
    junior: "JP",
    senior: "PG",
    manager: "JC",
    services: svc({ monthlyBAS: true, twoMonthlyIAS: true }),
    maDueDay: 0,
    notes: "Monthly IAS / BAS.",
    folderStatus: "Done",
  }),
  c({
    id: "client-epiq",
    name: "Epiq Systems Au Pty Ltd",
    shortName: "Epiq",
    software: "—",
    junior: "CE",
    senior: "DS",
    manager: "DS",
    services: svc({ payrollTax: true, stp: true }),
    maDueDay: 0,
    notes: "Payroll only. Payroll tax usually 25th after payroll is done, due 7th of following month.",
    folderStatus: "Done",
  }),
  c({
    id: "client-epc",
    name: "Eltham Physiotherapy — STP",
    shortName: "EPC",
    software: "Xero",
    junior: "Jan",
    senior: "TC",
    manager: "JC",
    services: svc({ stp: true }),
    maDueDay: 0,
    notes: "Fortnightly STP filing.",
    folderStatus: "Not set",
  }),
  c({
    id: "client-nocturnal",
    name: "Nocturnal Entertainment Pty Ltd",
    shortName: "Nocturnal",
    software: "XPM",
    junior: "MR",
    senior: "SH",
    manager: "MG",
    services: svc({ quarterlyBAS: true }),
    maDueDay: 0,
    notes: "Can't find folder.",
    folderStatus: "Missing",
  }),
  c({
    id: "client-surety",
    name: "Surety Australia Pty Ltd",
    shortName: "Surety",
    software: "XPM",
    junior: "Jan",
    senior: "PG / SH",
    manager: "MG",
    services: svc({}),
    maDueDay: 0,
    notes: "No work anymore.",
    folderStatus: "Done",
    inactive: true,
  }),
  c({
    id: "client-morrah",
    name: "The Morrah Street Group Pty Ltd",
    shortName: "Morrah St",
    software: "APS",
    junior: "Jan",
    senior: "SH",
    manager: "TC",
    services: svc({}),
    maDueDay: 0,
    notes: "No further work — email 2 February 2026.",
    folderStatus: "Done",
    inactive: true,
  }),
];

let seq = 1;

type ObInput = Partial<ObSeed> &
  Pick<ObSeed, "clientId" | "workstream" | "periodStart" | "dueDate" | "status" | "priority">;

function ob(partial: ObInput): ObSeed {
  const order = partial.order ?? seq;
  seq += 1;
  const id = partial.id ?? `ob-${seq}-${partial.clientId.replace("client-", "").slice(0, 12)}`;
  const defaults: Omit<ObSeed, "id" | "order" | "clientId" | "workstream" | "periodStart" | "dueDate" | "status" | "priority"> = {
    blocker: "",
    waitingOn: "",
    recurring: true,
    carryOver: false,
    onTodayPlan: false,
    completedAt: null,
    notes: "",
    nextAction: "",
    reviewer: "",
    owner: "Jan",
    estimatedMinutes: undefined,
  };
  return {
    ...defaults,
    ...partial,
    id,
    order,
  };
}

type MonthKey = "2026-06-01" | "2026-07-01" | "2026-08-01" | "2026-09-01";

function followingDue(periodStart: string, day = 21): string {
  const [y, m] = periodStart.split("-").map(Number);
  const fy = m === 12 ? y + 1 : y;
  const fm = m === 12 ? 1 : m + 1;
  const last = new Date(fy, fm, 0).getDate();
  return `${fy}-${String(fm).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

function basRow(
  clientId: string,
  label: string,
  months: Partial<Record<MonthKey, ObligationStatus>>,
  extra: { reviewer?: string; notes?: string; sourceSheet?: string } = {},
): ObSeed[] {
  return (Object.entries(months) as [MonthKey, ObligationStatus][]).map(([period, status]) =>
    ob({
      clientId,
      workstream: "bas_ias",
      periodStart: period,
      dueDate: followingDue(period, 21),
      status,
      owner: "Jan",
      reviewer: extra.reviewer || "",
      priority: "P2",
      taskLabel: label,
      nextAction:
        status === "Done" || status === "Not applicable"
          ? ""
          : status === "For review"
            ? "Reviewer sign-off"
            : `Prepare ${label}`,
      notes: extra.notes || "",
      sourceSheet: extra.sourceSheet || "BAS-IAS Tracker",
      completedAt: status === "Done" ? followingDue(period, 18) : null,
    }),
  );
}

const BAS_OBLIGATIONS: ObSeed[] = [
  ...basRow("client-ard", "QTR BAS", {
    "2026-06-01": "Done",
    "2026-07-01": "Not applicable",
    "2026-08-01": "Not applicable",
    "2026-09-01": "Not started",
  }),
  ...basRow("client-fdm", "Monthly IAS / BAS", {
    "2026-06-01": "Done",
    "2026-07-01": "Done",
    "2026-08-01": "Not started",
    "2026-09-01": "Not started",
  }),
  ...basRow(
    "client-doit",
    "Monthly PAYGI",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "Not started",
      "2026-09-01": "Not started",
    },
    { notes: "Data on the 16th" },
  ),
  ...basRow(
    "client-doit",
    "Monthly BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "Not started",
      "2026-09-01": "Not started",
    },
    { reviewer: "JCh", notes: "Data on the 16th" },
  ),
  ...basRow("client-eltham", "QTR BAS", {
    "2026-06-01": "Done",
    "2026-07-01": "Done",
    "2026-08-01": "Not applicable",
    "2026-09-01": "Not started",
  }),
  ...basRow(
    "client-peters",
    "QTR BAS",
    {
      "2026-06-01": "Waiting on client",
      "2026-07-01": "Not applicable",
      "2026-08-01": "Not applicable",
      "2026-09-01": "Not applicable",
    },
    { reviewer: "SH", notes: "Nil June BAS filed" },
  ),
  ...basRow(
    "client-spiliotis",
    "2-monthly IAS / QTR BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "Not started",
      "2026-09-01": "Not started",
    },
    { reviewer: "RB" },
  ),
  ...basRow(
    "client-zund",
    "2-monthly IAS / QTR BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "For review",
      "2026-09-01": "Not started",
    },
    { reviewer: "RB" },
  ),
  ...basRow("client-otk", "PAYG instalment", {
    "2026-06-01": "Done",
    "2026-07-01": "Done",
    "2026-08-01": "Not applicable",
    "2026-09-01": "Not started",
  }),
  ...basRow(
    "client-pirkx",
    "2-monthly IAS / QTR BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Not applicable",
      "2026-08-01": "Not applicable",
      "2026-09-01": "Not applicable",
    },
    { reviewer: "SH" },
  ),
  ...basRow("client-boyd-ac", "QTR BAS", {
    "2026-06-01": "Done",
    "2026-07-01": "Not applicable",
    "2026-08-01": "Not applicable",
    "2026-09-01": "Not started",
  }),
  ...basRow("client-mulcahy", "QTR BAS", {
    "2026-06-01": "Done",
    "2026-07-01": "Not applicable",
    "2026-08-01": "Not applicable",
    "2026-09-01": "Not started",
  }),
  ...basRow("client-boyd-elec", "QTR BAS", {
    "2026-06-01": "Done",
    "2026-07-01": "Not applicable",
    "2026-08-01": "Not applicable",
    "2026-09-01": "Not started",
  }),
  ...basRow(
    "client-airis",
    "2-monthly IAS / QTR BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "Not applicable",
      "2026-09-01": "Not applicable",
    },
  ),
  ...basRow("client-ashling", "2-monthly IAS / QTR BAS", {
    "2026-06-01": "Done",
    "2026-07-01": "Done",
    "2026-08-01": "Not started",
    "2026-09-01": "Not started",
  }),
  ...basRow(
    "client-bdp",
    "2-monthly IAS / QTR BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "Not started",
      "2026-09-01": "Not started",
    },
    { notes: "Need data for April 2026" },
  ),
  ...basRow(
    "client-couchbase",
    "2-monthly IAS / QTR BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "Not started",
      "2026-09-01": "Not started",
    },
    { notes: "Unusual due dates" },
  ),
  ...basRow("client-1161", "QTR BAS", {
    "2026-06-01": "Done",
    "2026-07-01": "Not applicable",
    "2026-08-01": "Not applicable",
    "2026-09-01": "Not started",
  }),
  ...basRow(
    "client-elite",
    "Monthly BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "Not started",
      "2026-09-01": "Not started",
    },
    {
      reviewer: "RB",
      notes: "Include red items missed because payroll was completed late.",
    },
  ),
  ...basRow(
    "client-otk",
    "Monthly BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "For review",
      "2026-09-01": "Not started",
    },
    { reviewer: "DS" },
  ),
  ...basRow(
    "client-lime",
    "Monthly BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "Not started",
      "2026-09-01": "Not started",
    },
    { notes: "Make a checklist for August BAS" },
  ),
  ...basRow(
    "client-moscot",
    "2-monthly IAS / QTR BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "For review",
      "2026-09-01": "Not started",
    },
    { reviewer: "PG", notes: "March BAS still out to sign" },
  ),
  ...basRow("client-nocturnal", "QTR BAS", {
    "2026-06-01": "Not started",
    "2026-07-01": "Done",
    "2026-08-01": "Not applicable",
    "2026-09-01": "Not started",
  }),
  ...basRow(
    "client-jwcolour",
    "2-monthly IAS / QTR BAS",
    {
      "2026-06-01": "Done",
      "2026-07-01": "Done",
      "2026-08-01": "For review",
      "2026-09-01": "Not started",
    },
    { reviewer: "JCh" },
  ),
];

const WEEKLY_BOOKS: { clientId: string; weeks: { code: string; period: string; due: string; status: ObligationStatus }[] }[] = [
  {
    clientId: "client-zund",
    weeks: [
      { code: "Aug26 W3", period: "2026-08-01", due: "2026-08-17", status: "Done" },
      { code: "Aug26 W4", period: "2026-08-01", due: "2026-08-24", status: "Done" },
      { code: "Aug26 W5", period: "2026-08-01", due: "2026-08-31", status: "In progress" },
      { code: "Sep26 W1", period: "2026-09-01", due: "2026-09-07", status: "Not started" },
    ],
  },
  {
    clientId: "client-moscot",
    weeks: [
      { code: "Aug26 W3", period: "2026-08-01", due: "2026-08-17", status: "Done" },
      { code: "Aug26 W4", period: "2026-08-01", due: "2026-08-24", status: "Done" },
      { code: "Aug26 W5", period: "2026-08-01", due: "2026-08-31", status: "In progress" },
      { code: "Sep26 W1", period: "2026-09-01", due: "2026-09-07", status: "Not started" },
    ],
  },
  {
    clientId: "client-otk",
    weeks: [
      { code: "Aug26 W3", period: "2026-08-01", due: "2026-08-17", status: "Done" },
      { code: "Aug26 W4", period: "2026-08-01", due: "2026-08-24", status: "Done" },
      { code: "Aug26 W5", period: "2026-08-01", due: "2026-08-31", status: "Done" },
      { code: "Sep26 W1", period: "2026-09-01", due: "2026-09-07", status: "Not started" },
    ],
  },
];

const MONTHLY_BOOKS = [
  "client-spiliotis",
  "client-eltham",
  "client-boyd-ac",
  "client-boyd-elec",
  "client-mulcahy",
  "client-1161",
];

const BOOK_OBLIGATIONS: ObSeed[] = [
  ...WEEKLY_BOOKS.flatMap((row) =>
    row.weeks.map((w) =>
      ob({
        clientId: row.clientId,
        workstream: "bookkeeping",
        periodStart: w.period,
        dueDate: w.due,
        status: w.status,
        owner: "Jan",
        reviewer: "",
        priority: "P2",
        taskLabel: "Weekly bookkeeping",
        weekCode: w.code,
        nextAction: w.status === "In progress" ? "Finish week and close bank rec" : "Weekly bank rec",
        sourceSheet: "Bookkeeping",
        completedAt: w.status === "Done" ? w.due : null,
        onTodayPlan: w.status === "In progress",
        estimatedMinutes: w.status === "In progress" ? 60 : undefined,
      }),
    ),
  ),
  ...MONTHLY_BOOKS.flatMap((clientId) => [
    ob({
      clientId,
      workstream: "bookkeeping",
      periodStart: "2026-07-01",
      dueDate: "2026-07-31",
      status: "Done",
      owner: "Jan",
      priority: "P3",
      taskLabel: "Monthly bookkeeping",
      weekCode: "Jul26 W4",
      sourceSheet: "Bookkeeping",
      completedAt: "2026-07-31",
    }),
    ob({
      clientId,
      workstream: "bookkeeping",
      periodStart: "2026-08-01",
      dueDate: "2026-08-31",
      status: "Not started",
      owner: "Jan",
      priority: "P3",
      taskLabel: "Monthly bookkeeping",
      weekCode: "Aug26 W5",
      sourceSheet: "Bookkeeping",
    }),
    ob({
      clientId,
      workstream: "bookkeeping",
      periodStart: "2026-09-01",
      dueDate: "2026-09-28",
      status: "Not started",
      owner: "Jan",
      priority: "P3",
      taskLabel: "Monthly bookkeeping",
      weekCode: "Sep26 W4",
      sourceSheet: "Bookkeeping",
    }),
  ]),
];

function maRow(
  clientId: string,
  dueDay: number,
  months: Record<string, ObligationStatus>,
): ObSeed[] {
  return Object.entries(months).map(([period, status]) => {
    const [y, m] = period.split("-").map(Number);
    const fy = m === 12 ? y + 1 : y;
    const fm = m === 12 ? 1 : m + 1;
    const last = new Date(fy, fm, 0).getDate();
    const due = `${fy}-${String(fm).padStart(2, "0")}-${String(Math.min(dueDay, last)).padStart(2, "0")}`;
    return ob({
      clientId,
      workstream: "management_reports",
      periodStart: period,
      dueDate: due,
      status,
      owner: "Jan",
      priority: period === "2026-08-01" && status !== "Done" ? "P1" : "P2",
      taskLabel: "Prepare management accounts",
      nextAction:
        status === "In progress"
          ? "Prepare and submit for review"
          : status === "Not started"
            ? "Prepare working papers and draft report"
            : "",
      sourceSheet: "Management Reports",
      completedAt: status === "Done" ? due : null,
      recurring: true,
      onTodayPlan: period === "2026-08-01" && status !== "Done",
      estimatedMinutes: period === "2026-08-01" && status !== "Done" ? 90 : undefined,
    });
  });
}

const MA_OBLIGATIONS: ObSeed[] = [
  ...maRow("client-moscot", 12, {
    "2026-06-01": "Done",
    "2026-07-01": "Done",
    "2026-08-01": "In progress",
  }),
  ...maRow("client-zund", 16, {
    "2026-06-01": "Done",
    "2026-07-01": "Done",
    "2026-08-01": "In progress",
  }),
  ...maRow("client-gestro", 10, {
    "2026-06-01": "Done",
    "2026-07-01": "Done",
    "2026-08-01": "Not started",
  }),
  ...maRow("client-otk", 1, {
    "2026-06-01": "Done",
    "2026-07-01": "Done",
    "2026-08-01": "Done",
  }),
];

function payRun(clientId: string, period: string, kind: "Mid" | "EOM", status: ObligationStatus): ObSeed {
  const [y, m] = period.split("-").map(Number);
  const dueDay = kind === "Mid" ? 15 : new Date(y, m, 0).getDate();
  const due = `${y}-${String(m).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
  return ob({
    clientId,
    workstream: "supplier_payments",
    periodStart: period,
    dueDate: due,
    status,
    owner: "Jan",
    priority: "P2",
    taskLabel: `${kind === "Mid" ? "Mid-month" : "Month-end"} payment run`,
    weekCode: kind,
    nextAction: status === "Done" ? "" : `Process ${kind.toLowerCase()} supplier payment run`,
    sourceSheet: "Supplier Payment Run",
    completedAt: status === "Done" ? due : null,
  });
}

const PAY_OBLIGATIONS: ObSeed[] = [
  payRun("client-otk", "2026-08-01", "Mid", "Done"),
  payRun("client-otk", "2026-08-01", "EOM", "Done"),
  payRun("client-otk", "2026-09-01", "Mid", "Not started"),
  payRun("client-otk", "2026-09-01", "EOM", "Not started"),
  payRun("client-moscot", "2026-08-01", "Mid", "Done"),
  payRun("client-moscot", "2026-08-01", "EOM", "Done"),
  payRun("client-moscot", "2026-09-01", "Mid", "Not started"),
  payRun("client-moscot", "2026-09-01", "EOM", "Not started"),
  payRun("client-zund", "2026-08-01", "Mid", "Done"),
  payRun("client-zund", "2026-08-01", "EOM", "Done"),
  payRun("client-zund", "2026-09-01", "Mid", "Not started"),
  payRun("client-zund", "2026-09-01", "EOM", "Not started"),
];

const PAYROLL_TAX: ObSeed[] = (["client-doit", "client-epiq", "client-lime"] as const).flatMap((id) => [
  ob({
    clientId: id,
    workstream: "payroll_tax",
    periodStart: "2026-07-01",
    dueDate: "2026-08-07",
    status: "Done",
    owner: "Jan",
    reviewer: id === "client-doit" ? "DS / JCh" : "DS",
    priority: "P3",
    taskLabel: "Payroll tax",
    sourceSheet: "Payroll Tax",
    completedAt: "2026-08-07",
  }),
  ob({
    clientId: id,
    workstream: "payroll_tax",
    periodStart: "2026-08-01",
    dueDate: "2026-09-07",
    status: "Done",
    owner: "Jan",
    reviewer: id === "client-doit" ? "DS / JCh" : "DS",
    priority: "P3",
    taskLabel: "Payroll tax",
    sourceSheet: "Payroll Tax",
    completedAt: "2026-09-03",
  }),
  ob({
    clientId: id,
    workstream: "payroll_tax",
    periodStart: "2026-09-01",
    dueDate: "2026-10-07",
    status: "Not started",
    owner: "Jan",
    reviewer: id === "client-doit" ? "DS / JCh" : "DS",
    priority: "P3",
    taskLabel: "Payroll tax",
    sourceSheet: "Payroll Tax",
  }),
]);

const STP_OBLIGATIONS: ObSeed[] = [
  ob({
    clientId: "client-epc",
    workstream: "stp_payroll",
    periodStart: "2026-08-01",
    dueDate: "2026-08-28",
    status: "Done",
    owner: "Jan",
    priority: "P3",
    taskLabel: "Fortnightly STP",
    weekCode: "Aug W4",
    sourceSheet: "STP & Payroll",
    completedAt: "2026-08-28",
  }),
  ob({
    clientId: "client-epc",
    workstream: "stp_payroll",
    periodStart: "2026-09-01",
    dueDate: "2026-09-11",
    status: "Not started",
    owner: "Jan",
    priority: "P3",
    taskLabel: "Fortnightly STP",
    weekCode: "Sep W1",
    sourceSheet: "STP & Payroll",
  }),
  ob({
    clientId: "client-ard",
    workstream: "stp_payroll",
    periodStart: "2026-06-01",
    dueDate: "2026-07-21",
    status: "Not started",
    owner: "Jan",
    priority: "P3",
    taskLabel: "Quarterly payroll / super",
    notes: "Super due 21st of the following month. Jun marked Not yet.",
    sourceSheet: "STP & Payroll",
  }),
  ob({
    clientId: "client-ard",
    workstream: "stp_payroll",
    periodStart: "2026-09-01",
    dueDate: "2026-10-21",
    status: "Not started",
    owner: "Jan",
    priority: "P3",
    taskLabel: "Quarterly payroll / super",
    sourceSheet: "STP & Payroll",
  }),
];

const METKA_OBLIGATIONS: ObSeed[] = METKA_ENTITIES.map((entity, i) =>
  ob({
    id: `ob-metka-jul-${i + 1}`,
    clientId: "client-metka",
    workstream: "metka_bas",
    periodStart: "2026-07-01",
    dueDate: "2026-08-21",
    status: "Ready to lodge",
    owner: entity.owner,
    reviewer: "JCh",
    priority: "P2",
    taskLabel: "July BAS — ready to lodge",
    entityName: entity.name,
    nextAction: "Lodge signed BAS",
    notes: `${entity.tax}. Preparation, ATO statement and signing copy are done.`,
    sourceSheet: "Metka BAS – Non-Group",
    recurring: true,
  }),
);

const TODAY_PLAN: ObSeed[] = [
  ob({
    id: "ob-plan-otk-jul-ma",
    clientId: "client-otk",
    workstream: "management_reports",
    periodStart: "2026-07-01",
    dueDate: "2026-08-01",
    status: "Done",
    owner: "Jan",
    priority: "P1",
    taskLabel: "Prepare management accounts",
    nextAction: "Due 1 Aug — submitted",
    onTodayPlan: false,
    recurring: true,
    sourceSheet: "Management Reports",
    completedAt: "2026-08-01",
    order: 1,
  }),
  ob({
    id: "ob-plan-moscot-jul-ma",
    clientId: "client-moscot",
    workstream: "management_reports",
    periodStart: "2026-07-01",
    dueDate: "2026-08-06",
    status: "Done",
    owner: "Jan",
    priority: "P1",
    taskLabel: "Prepare management accounts",
    nextAction: "Wait for any adjustment by client",
    onTodayPlan: false,
    recurring: true,
    sourceSheet: "Management Reports",
    completedAt: "2026-08-06",
    order: 2,
  }),
  ob({
    id: "ob-plan-gestro-jul-ma",
    clientId: "client-gestro",
    workstream: "management_reports",
    periodStart: "2026-07-01",
    dueDate: "2026-08-10",
    status: "Done",
    owner: "Jan",
    priority: "P2",
    taskLabel: "Prepare management accounts",
    nextAction: "Done",
    onTodayPlan: false,
    recurring: true,
    sourceSheet: "Management Reports",
    completedAt: "2026-08-10",
    order: 3,
  }),
  ob({
    id: "ob-plan-zund-jul-ma",
    clientId: "client-zund",
    workstream: "management_reports",
    periodStart: "2026-07-01",
    dueDate: "2026-08-20",
    status: "Done",
    owner: "Jan",
    priority: "P2",
    taskLabel: "Prepare management accounts",
    nextAction: "Due 16 Aug — working papers submitted",
    onTodayPlan: false,
    recurring: true,
    sourceSheet: "Management Reports",
    completedAt: "2026-08-20",
    order: 4,
  }),
  ob({
    id: "ob-plan-pirkx-ias",
    clientId: "client-pirkx",
    workstream: "admin",
    periodStart: "2026-07-01",
    dueDate: "2026-08-21",
    status: "Done",
    owner: "Jan",
    reviewer: "SH",
    priority: "P2",
    taskLabel: "Ask SH if further work is required — July IAS",
    onTodayPlan: false,
    recurring: false,
    sourceSheet: "BAS tracker",
    completedAt: "2026-08-22",
    order: 5,
  }),
  ob({
    id: "ob-plan-peters-bas",
    clientId: "client-peters",
    workstream: "admin",
    periodStart: "2026-06-01",
    dueDate: "2026-07-21",
    status: "Done",
    owner: "Jan",
    reviewer: "SH",
    priority: "P2",
    taskLabel: "Ask SH if further work is required — June BAS",
    onTodayPlan: false,
    recurring: false,
    sourceSheet: "BAS tracker",
    completedAt: "2026-08-22",
    order: 6,
  }),
  ob({
    id: "ob-plan-zund-june-final",
    clientId: "client-zund",
    workstream: "management_reports",
    periodStart: "2026-06-01",
    dueDate: "2026-08-20",
    status: "Done",
    owner: "Jan",
    priority: "P1",
    taskLabel: "Finalize June accounts",
    waitingOn: "Client for credit card invoices",
    onTodayPlan: false,
    recurring: true,
    sourceSheet: "Management Reports",
    completedAt: "2026-08-20",
    order: 7,
  }),
  ob({
    id: "ob-plan-all-bas",
    clientId: "client-practice",
    workstream: "bas_ias",
    periodStart: "2026-08-01",
    dueDate: "2026-09-21",
    status: "Not started",
    owner: "Jan",
    priority: "P3",
    taskLabel: "BAS & IAS — remaining clients",
    nextAction: "Work through August tracker cells that are still Not started",
    onTodayPlan: true,
    recurring: true,
    estimatedMinutes: 90,
    sourceSheet: "BAS-IAS Tracker",
    order: 1,
    todayOrder: 1,
  }),
  ob({
    id: "ob-plan-timesheet",
    clientId: "client-practice",
    workstream: "admin",
    periodStart: "2026-09-01",
    dueDate: "2026-09-04",
    status: "Not started",
    owner: "Jan",
    priority: "P3",
    taskLabel: "Timesheet",
    onTodayPlan: true,
    recurring: true,
    estimatedMinutes: 20,
    sourceSheet: "Daily To-Do",
    order: 2,
    todayOrder: 2,
  }),
];

function dedupeKey(o: ObSeed): string {
  if (o.entityName) return `entity|${o.entityName}|${o.periodStart}`;
  if (o.weekCode) return `${o.clientId}|${o.workstream}|${o.weekCode}`;
  if (o.workstream === "management_reports") {
    return `${o.clientId}|ma|${o.periodStart}|${o.taskLabel || ""}`;
  }
  return [
    o.clientId,
    o.workstream,
    o.periodStart,
    o.taskLabel || "",
    o.entityName || "",
  ].join("|");
}

const PIN_TODAY: { clientId: string; workstream: Workstream; periodStart: string; taskLabel?: string }[] = [
  { clientId: "client-doit", workstream: "bas_ias", periodStart: "2026-08-01", taskLabel: "Monthly BAS" },
  { clientId: "client-spiliotis", workstream: "bas_ias", periodStart: "2026-08-01", taskLabel: "2-monthly IAS / QTR BAS" },
  { clientId: "client-elite", workstream: "bas_ias", periodStart: "2026-08-01", taskLabel: "Monthly BAS" },
  { clientId: "client-lime", workstream: "bas_ias", periodStart: "2026-08-01", taskLabel: "Monthly BAS" },
];

export const DEMO_OBLIGATIONS: ObSeed[] = (() => {
  const plan = TODAY_PLAN;
  const rest = [
    ...BAS_OBLIGATIONS,
    ...BOOK_OBLIGATIONS,
    ...MA_OBLIGATIONS,
    ...PAY_OBLIGATIONS,
    ...PAYROLL_TAX,
    ...STP_OBLIGATIONS,
    ...METKA_OBLIGATIONS,
  ];
  const seen = new Set(plan.map(dedupeKey));
  const merged = [...plan];
  for (const row of rest) {
    const key = dedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    const pin = PIN_TODAY.find(
      (p) =>
        p.clientId === row.clientId &&
        p.workstream === row.workstream &&
        p.periodStart === row.periodStart &&
        (!p.taskLabel || p.taskLabel === row.taskLabel),
    );
    if (pin) {
      merged.push({
        ...row,
        onTodayPlan: true,
        estimatedMinutes: row.estimatedMinutes || 45,
        todayOrder: 10 + merged.filter((m) => m.onTodayPlan).length,
      });
    } else {
      merged.push(row);
    }
  }
  return merged;
})();

export const DEMO_PERSONAL_TASKS: PersonalTask[] = [
  {
    id: "pt-gym",
    category: "To do",
    task: "Visit gym",
    dueDate: "2026-08-19",
    status: "Not started",
    notes: "",
    order: 1,
  },
  {
    id: "pt-tape",
    category: "To buy",
    task: "Paper tape",
    dueDate: "2026-08-20",
    status: "Done",
    notes: "",
    order: 2,
  },
  {
    id: "pt-airah",
    category: "To do",
    task: "Job-search automation for Airah — update CV, send applications",
    dueDate: "2026-08-21",
    status: "Not started",
    notes: "",
    order: 3,
  },
  {
    id: "pt-leave",
    category: "To do",
    task: "Apply leave on 29 and 30 October",
    dueDate: "2026-10-01",
    status: "Not started",
    notes: "",
    order: 4,
  },
];

export function emptyServices(): ClientServices {
  return { ...EMPTY_SERVICES };
}

export type { Priority, Workstream };
