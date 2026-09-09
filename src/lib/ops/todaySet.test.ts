import assert from "node:assert/strict";
import { test } from "node:test";
import type { Obligation } from "./types.ts";
import {
  clientMonthLoad,
  getBacklog,
  getCourt,
  getDueNotOnPlan,
  isLedgerOpenObligation,
  priorPeriodOpen,
} from "./todaySet.ts";

test("getCourt classifies Ready to lodge as mine", () => {
  assert.equal(getCourt("Ready to lodge"), "mine");
});

test("getCourt classifies Waiting on client and Blocked as theirs", () => {
  assert.equal(getCourt("Waiting on client"), "theirs");
  assert.equal(getCourt("Blocked"), "theirs");
});

test("getCourt classifies active working statuses as mine", () => {
  assert.equal(getCourt("Not started"), "mine");
  assert.equal(getCourt("In progress"), "mine");
  assert.equal(getCourt("For review"), "mine");
});

test("getCourt classifies Done and Not applicable as done", () => {
  assert.equal(getCourt("Done"), "done");
  assert.equal(getCourt("Not applicable"), "done");
});

function ob(partial: Partial<Obligation> & Pick<Obligation, "id">): Obligation {
  return {
    clientId: "client-metka",
    workstream: "bas_ias",
    periodStart: "2026-08-01",
    dueDate: "2026-08-21",
    status: "Not started",
    owner: "Jan",
    reviewer: "",
    priority: "P2",
    nextAction: "Do it",
    blocker: "",
    waitingOn: "",
    recurring: true,
    order: 1,
    ...partial,
  };
}

test("getBacklog ignores Metka pack cells even when overdue", () => {
  const items = [
    ob({ id: "pack", workstream: "metka_bas", entityName: "Alligator Bess Holdings Pty Ltd (Group)" }),
    ob({ id: "sitting", clientId: "client-all", workstream: "bas_ias", dueDate: "2026-08-21" }),
  ];
  const backlog = getBacklog(items, "2026-09-09", "2026-09-01");
  assert.equal(backlog.all.length, 1);
  assert.equal(backlog.all[0].id, "sitting");
});

test("getDueNotOnPlan ignores Metka pack cells due today", () => {
  const items = [
    ob({
      id: "pack",
      workstream: "metka_bas",
      dueDate: "2026-09-09",
      periodStart: "2026-09-01",
    }),
    ob({
      id: "sitting",
      clientId: "client-all",
      workstream: "bas_ias",
      dueDate: "2026-09-09",
      periodStart: "2026-09-01",
    }),
  ];
  const due = getDueNotOnPlan(items, "2026-09-09");
  assert.equal(due.length, 1);
  assert.equal(due[0].id, "sitting");
});

test("clientMonthLoad counts the Metka pack as one sitting, not 36 cells", () => {
  const pack = Array.from({ length: 20 }, (_, i) =>
    ob({
      id: `pack-${i}`,
      workstream: "metka_bas",
      periodStart: "2026-09-01",
      dueDate: "2026-10-21",
      owner: i < 11 ? "Jan" : "Jovelyn",
      estimatedMinutes: 20,
      entityName: `Entity ${i}`,
    }),
  );
  const load = clientMonthLoad("client-metka", pack, "2026-09-01", "2026-09-09");
  assert.equal(load.packCells, 20);
  assert.equal(load.open, 1);
  assert.equal(load.teamOpen, 1);
  assert.equal(load.minutes, 20);
});

test("isLedgerOpenObligation returns true for open non-Metka obligations and false for Done/Not applicable or Metka", () => {
  assert.equal(isLedgerOpenObligation(ob({ id: "1", workstream: "bas_ias", status: "Not started" })), true);
  assert.equal(isLedgerOpenObligation(ob({ id: "2", workstream: "bas_ias", status: "Done" })), false);
  assert.equal(isLedgerOpenObligation(ob({ id: "3", workstream: "bas_ias", status: "Not applicable" })), false);
  assert.equal(isLedgerOpenObligation(ob({ id: "4", workstream: "metka_bas", status: "Not started" })), false);
});

test("priorPeriodOpen excludes Metka pack cells from prior periods", () => {
  const items = [
    ob({
      id: "prior-metka-1",
      workstream: "metka_bas",
      periodStart: "2026-08-01",
      status: "Not started",
    }),
    ob({
      id: "prior-metka-2",
      workstream: "metka_bas",
      periodStart: "2026-08-01",
      status: "In progress",
    }),
    ob({
      id: "prior-standard",
      workstream: "bas_ias",
      periodStart: "2026-08-01",
      status: "Not started",
    }),
    ob({
      id: "current-standard",
      workstream: "bas_ias",
      periodStart: "2026-09-01",
      status: "Not started",
    }),
  ];
  const prior = priorPeriodOpen(items, "2026-09-01");
  assert.equal(prior.length, 1);
  assert.equal(prior[0].id, "prior-standard");

  const priorLens = items.filter(
    (o) => isLedgerOpenObligation(o) && Boolean(o.periodStart) && o.periodStart < "2026-09-01",
  );
  assert.deepEqual(priorLens, prior);
});
