import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSnapshot } from "./snapshot.ts";
import type { Client, Obligation, PersonalTask, RecurringTemplate } from "./types.ts";

const client: Client = {
  id: "client-a",
  name: "Acme",
  shortName: "Acme",
  software: "Xero",
  junior: "Jan",
  senior: "",
  manager: "JD",
  services: {
    monthlyBAS: true,
    twoMonthlyIAS: false,
    quarterlyBAS: false,
    weeklyBooks: false,
    monthlyBooks: false,
    paymentRun: false,
    managementReports: false,
    payrollTax: false,
    stp: false,
  },
  maDueDay: 0,
  notes: "",
};

const obligation: Obligation = {
  id: "ob-1",
  clientId: "client-a",
  workstream: "bas_ias",
  periodStart: "2026-09-01",
  dueDate: "2026-10-21",
  status: "Not started",
  owner: "Jan",
  reviewer: "",
  priority: "P2",
  nextAction: "Prepare BAS",
  blocker: "",
  waitingOn: "",
  recurring: true,
  order: 1,
};

const personal: PersonalTask = {
  id: "pt-1",
  category: "Admin",
  task: "Timesheet",
  dueDate: "2026-09-09",
  status: "Not started",
  notes: "",
  order: 1,
};

const template: RecurringTemplate = {
  id: "tpl-1",
  clientId: "client-a",
  workstream: "bas_ias",
  cadence: "monthly",
  dueRule: "21_next",
  taskLabel: "Monthly BAS",
  nextAction: "Prepare BAS",
  estimatedMinutes: 45,
  pinOnSpawn: false,
};

test("parseSnapshot accepts version 1 ledger files", () => {
  const raw = JSON.stringify({
    version: 1,
    kind: "ops-desk-snapshot",
    exportedAt: "2026-09-01T00:00:00.000Z",
    email: "Jan",
    clients: [client],
    obligations: [obligation],
  });
  const snap = parseSnapshot(raw);
  assert.equal(snap.version, 1);
  assert.equal(snap.clients.length, 1);
  assert.equal(snap.personalTasks, undefined);
});

test("parseSnapshot accepts version 2 personal tasks and templates", () => {
  const raw = JSON.stringify({
    version: 2,
    kind: "ops-desk-snapshot",
    exportedAt: "2026-09-09T00:00:00.000Z",
    email: "Jan",
    clients: [client],
    obligations: [obligation],
    personalTasks: [personal],
    templates: [template],
  });
  const snap = parseSnapshot(raw);
  assert.equal(snap.version, 2);
  assert.equal(snap.personalTasks?.length, 1);
  assert.equal(snap.templates?.length, 1);
  assert.equal(snap.personalTasks?.[0].task, "Timesheet");
});

test("parseSnapshot rejects unknown versions", () => {
  const raw = JSON.stringify({
    version: 99,
    kind: "ops-desk-snapshot",
    exportedAt: "2026-09-09T00:00:00.000Z",
    email: "Jan",
    clients: [],
    obligations: [],
  });
  assert.throws(() => parseSnapshot(raw), /Unsupported snapshot version/);
});
