import assert from "node:assert/strict";
import { test } from "node:test";
import type { Client, Obligation } from "./types.ts";
import {
    generateNextMonthCandidates,
    generateRollingHorizon,
} from "./obligationGenerator.ts";
import { METKA_CLIENT_ID } from "./metka.ts";

function sampleClient(overrides?: Partial<Client>): Client {
    return {
          id: "c-1",
          name: "Test Client",
          shortName: "Test",
          junior: "Jan",
          senior: "JCh",
          inactive: false,
          software: "Xero",
          manager: "",
          maDueDay: 0,
          notes: "",
          services: {
                  weeklyBooks: false,
                  monthlyBooks: false,
                  monthlyBAS: false,
                  twoMonthlyIAS: false,
                  quarterlyBAS: false,
                  paymentRun: true,
                  managementReports: false,
                  payrollTax: false,
                  stp: false,
          },
          ...overrides,
    };
}

function sampleObligation(overrides?: Partial<Obligation>): Obligation {
    return {
          id: "ob-sample",
          clientId: "c-1",
          workstream: "supplier_payments",
          periodStart: "2026-08-01",
          dueDate: "2026-08-15",
          status: "Not started",
          owner: "Jan",
          reviewer: "JCh",
          priority: "P2",
          nextAction: "Mid-month payment run",
          blocker: "",
          waitingOn: "",
          recurring: true,
          order: 10,
          weekCode: "Mid",
          taskLabel: "Mid-month payment run",
          ...overrides,
    };
}

test("prior-month Mid exists -> next month still generates Mid and EOM candidates", () => {
    const clients = [sampleClient()];
    const existingObligations: Obligation[] = [
          sampleObligation({ id: "ob-aug-mid", periodStart: "2026-08-01", weekCode: "Mid" }),
        ];

       const candidates = generateNextMonthCandidates(clients, existingObligations, "2026-09-01");
    const weekCodes = candidates.map((c) => c.weekCode);

       assert.deepEqual(weekCodes, ["Mid", "EOM"]);
});

test("same-period Mid exists -> does not duplicate Mid in candidate generation", () => {
    const clients = [sampleClient()];
    const existingObligations: Obligation[] = [
          sampleObligation({ id: "ob-sep-mid", periodStart: "2026-09-01", weekCode: "Mid" }),
        ];

       const candidates = generateNextMonthCandidates(clients, existingObligations, "2026-09-01");
    const weekCodes = candidates.map((c) => c.weekCode);

       assert.deepEqual(weekCodes, ["EOM"]);
});

test("bookkeeping month-prefixed weekCode dedupes correctly within same period", () => {
    const client = sampleClient({
          id: "c-2",
          services: {
                  weeklyBooks: true,
                  monthlyBooks: false,
                  monthlyBAS: false,
                  twoMonthlyIAS: false,
                  quarterlyBAS: false,
                  paymentRun: false,
                  managementReports: false,
                  payrollTax: false,
                  stp: false,
          },
    });

       const existingObligations: Obligation[] = [
             sampleObligation({
                     id: "ob-book-w1",
                     clientId: "c-2",
                     workstream: "bookkeeping",
                     periodStart: "2026-09-01",
                     weekCode: "Sep26 W1",
             }),
           ];

       const candidates = generateNextMonthCandidates([client], existingObligations, "2026-09-01");
    const weekCodes = candidates.map((c) => c.weekCode);

       assert.ok(!weekCodes.includes("Sep26 W1"));
    assert.ok(weekCodes.includes("Sep26 W2"));
});

test("Metka entityName deduplication remains unchanged within period", () => {
    const metkaClient: Client = sampleClient({
          id: METKA_CLIENT_ID,
          name: "Metka Group",
          shortName: "Metka",
          junior: "Jan",
          senior: "JCh",
          inactive: false,
          services: {
                  weeklyBooks: false,
                  monthlyBooks: false,
                  monthlyBAS: true,
                  twoMonthlyIAS: false,
                  quarterlyBAS: false,
                  paymentRun: false,
                  managementReports: false,
                  payrollTax: false,
                  stp: false,
          },
    });

       const existing: Obligation[] = [
             sampleObligation({
                     id: "ob-metka-1",
                     clientId: METKA_CLIENT_ID,
                     workstream: "metka_bas",
                     periodStart: "2026-09-01",
                     entityName: "Alligator Bess Holdings Pty Ltd (Group)",
             }),
           ];

       const candidates = generateNextMonthCandidates([metkaClient], existing, "2026-09-01");
    const alligatorCandidate = candidates.find(
          (c) => c.entityName === "Alligator Bess Holdings Pty Ltd (Group)",
        );

       assert.equal(alligatorCandidate, undefined);
    assert.ok(candidates.length > 0);
});

test("rolling horizon over 3 months yields Mid/EOM each month for a paymentRun client", () => {
    const client = sampleClient();
    const existing: Obligation[] = [
          sampleObligation({ id: "aug-mid", periodStart: "2026-08-01", weekCode: "Mid" }),
        ];

       const candidates = generateRollingHorizon([client], existing, 2);
    const paymentCandidates = candidates.filter((c) => c.workstream === "supplier_payments");

       // generateRollingHorizon starts at current Melbourne period and goes forward 2 months (total 3 months).
       // Each month should generate 2 candidates (Mid and EOM).
       assert.equal(paymentCandidates.length, 6);
});
