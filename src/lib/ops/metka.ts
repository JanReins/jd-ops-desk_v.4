import type { Obligation, ObligationStatus } from "./types";
import { getCourt, isOpenStatus } from "./todaySet";

export const METKA_CLIENT_ID = "client-metka";

export type MetkaEntity = {
  name: string;
  shortName: string;
  tax: string;
  owner: string;
  group: boolean;
};

export const METKA_ENTITIES: MetkaEntity[] = [
  { name: "Alligator Bess Holdings Pty Ltd (Group)", shortName: "Alligator", tax: "Confirm registration", owner: "Jan", group: true },
  { name: "Carinya BESS Holdings Pty Ltd (Group)", shortName: "Carinya", tax: "Confirm registration", owner: "Jan", group: true },
  { name: "Denhun Holdco Pty Ltd (Group)", shortName: "Denhun", tax: "Confirm registration", owner: "Jan", group: true },
  { name: "Denman Bess Trust", shortName: "Denman Trust", tax: "Confirm registration", owner: "Jan", group: false },
  { name: "Denman Bess Holdings Pty Ltd", shortName: "Denman Hold", tax: "Confirm registration", owner: "Jan", group: false },
  { name: "Emu Park Energy Holdings Pty Ltd (Group)", shortName: "Emu Park", tax: "GST & Deferred GST", owner: "Jan", group: true },
  { name: "Hay Solar Farm Holdings Pty Ltd (Group)", shortName: "Hay SF", tax: "GST", owner: "Jan", group: true },
  { name: "M Renewables Australia Developments Pty Ltd", shortName: "M Renewables", tax: "GST, Deferred GST & PAYGI quarterly", owner: "Jan", group: false },
  { name: "Metlen Australia Finco Pty Ltd", shortName: "Metlen Finco", tax: "GST", owner: "Jan", group: false },
  { name: "Metlen Australia Services Pty Ltd", shortName: "Metlen Services", tax: "GST", owner: "Jan", group: false },
  { name: "Mettransfers Pty Ltd", shortName: "Mettransfers", tax: "GST", owner: "Jan", group: false },
  { name: "Mavis Solar Farm Australia Holdings (Group)", shortName: "Mavis SF", tax: "GST", owner: "Jovelyn", group: true },
  { name: "Moama SF Holdco Pty Ltd (Group)", shortName: "Moama", tax: "GST", owner: "Jovelyn", group: true },
  { name: "Moura Solar Farm Holdings Pty Ltd (Group)", shortName: "Moura", tax: "GST & PAYGW (monthly)", owner: "Jovelyn", group: true },
  { name: "Munna Creek Solar Farm Hold Co Pty Ltd (Group)", shortName: "Munna Creek", tax: "GST & PAYGW (monthly)", owner: "Jovelyn", group: true },
  { name: "Polldale SF Holdings Pty Ltd (Group)", shortName: "Polldale", tax: "GST", owner: "Jovelyn", group: true },
  { name: "Plains SF No1 Pty Ltd", shortName: "Plains", tax: "GST", owner: "Jovelyn", group: false },
  { name: "Terranova Asset Trust (Group)", shortName: "Terranova", tax: "GST", owner: "Jovelyn", group: true },
  { name: "Upper Hunter SF Holdco (Group)", shortName: "Upper Hunter", tax: "GST", owner: "Jovelyn", group: true },
  { name: "Wyalong Solar Farm Holdings Pty Ltd (Group)", shortName: "Wyalong", tax: "GST & PAYGW (monthly)", owner: "Jovelyn", group: true },
];

export function isMetkaClient(id?: string): boolean {
  return id === METKA_CLIENT_ID;
}

export function shortEntityName(legal?: string): string {
  if (!legal) return "Entity";
  return METKA_ENTITIES.find((e) => e.name === legal)?.shortName || legal;
}

export function isGenericMetkaBas(o: Pick<Obligation, "clientId" | "workstream" | "taskLabel" | "entityName">): boolean {
  return (
    o.clientId === METKA_CLIENT_ID &&
    o.workstream === "bas_ias" &&
    !o.entityName &&
    /metka/i.test(o.taskLabel || "")
  );
}

export type MetkaPack = {
  periodStart: string;
  rows: Obligation[];
  total: number;
  missing: number;
  done: number;
  open: number;
  mine: number;
  ready: number;
  byStatus: Partial<Record<ObligationStatus, number>>;
};

export function metkaRowsForPeriod(obligations: Obligation[], periodStart: string): Obligation[] {
  return obligations.filter(
    (o) => o.clientId === METKA_CLIENT_ID && o.workstream === "metka_bas" && o.periodStart === periodStart,
  );
}

export function summarizeMetkaPack(obligations: Obligation[], periodStart: string): MetkaPack {
  const rows = metkaRowsForPeriod(obligations, periodStart);
  const byEntity = new Set(rows.map((o) => o.entityName).filter(Boolean));
  const byStatus: Partial<Record<ObligationStatus, number>> = {};
  for (const o of rows) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  }
  const openRows = rows.filter((o) => isOpenStatus(o.status));
  return {
    periodStart,
    rows,
    total: rows.length,
    missing: Math.max(0, METKA_ENTITIES.length - byEntity.size),
    done: rows.filter((o) => o.status === "Done" || o.status === "Not applicable").length,
    open: openRows.length,
    mine: openRows.filter((o) => getCourt(o.status) === "mine").length,
    ready: rows.filter((o) => o.status === "Ready to lodge").length,
    byStatus,
  };
}

export function listMetkaPacks(obligations: Obligation[]): MetkaPack[] {
  const periods = new Set<string>();
  for (const o of obligations) {
    if (o.clientId === METKA_CLIENT_ID && o.workstream === "metka_bas" && o.periodStart) {
      periods.add(o.periodStart);
    }
  }
  return Array.from(periods)
    .sort()
    .map((p) => summarizeMetkaPack(obligations, p));
}
