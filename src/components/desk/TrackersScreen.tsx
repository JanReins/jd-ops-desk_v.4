import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useData } from "@/lib/ops/data-context";
import {
  ALL_STATUSES,
  WORKSTREAM_LABELS,
  formatPeriod,
  type Client,
  type Obligation,
  type ObligationStatus,
  type Workstream,
} from "@/lib/ops/types";
import { StatusChip } from "./StatusChip";
import {
  daysOverdue,
  formatAuShort,
  formatMelbourneMonthYear,
  getMelbourneCurrentPeriod,
  getMelbourneToday,
  getWeeksForPeriod,
  listMonthPeriods,
} from "@/lib/ops/dates";
import { generateCellCandidates } from "@/lib/ops/obligationGenerator";
import { isOpenStatus } from "@/lib/ops/todaySet";
import { cn } from "@/lib/utils";
import { METKA_CLIENT_ID, METKA_ENTITIES, isMetkaClient, shortEntityName, summarizeMetkaPack } from "@/lib/ops/metka";

type StreamTab = Extract<
  Workstream,
  "bas_ias" | "bookkeeping" | "management_reports" | "supplier_payments" | "metka_bas" | "payroll_tax" | "stp_payroll"
>;

const TABS: { id: StreamTab; hint: string }[] = [
  { id: "bas_ias", hint: "Rolling months · + fills a missing cell" },
  { id: "bookkeeping", hint: "W1–W5 of the selected month · weekly clients" },
  { id: "management_reports", hint: "Due 1 / 6 / 10 / 16 of following month" },
  { id: "supplier_payments", hint: "Mid 15th · EOM last day" },
  { id: "metka_bas", hint: "20 entities · one monthly BAS cell each · rolling months" },
  { id: "payroll_tax", hint: "Due 7th following month" },
  { id: "stp_payroll", hint: "Fortnightly / monthly" },
];

interface TrackersScreenProps {
  initialStream?: string;
  onSelectObligation: (obligation: Obligation) => void;
  onOpenClientDrawer: (clientId: string) => void;
}

export function TrackersScreen({
  initialStream,
  onSelectObligation,
  onOpenClientDrawer,
}: TrackersScreenProps) {
  const validInitial = TABS.some((t) => t.id === initialStream)
    ? (initialStream as StreamTab)
    : "bas_ias";
  const [tab, setTab] = useState<StreamTab>(validInitial);
  const currentPeriod = useMemo(() => getMelbourneCurrentPeriod(), []);
  const [focusPeriod, setFocusPeriod] = useState(currentPeriod);
  const { clients, obligations, updateObligationStatus, batchCreateObligations } = useData();
  const melbourneToday = useMemo(() => getMelbourneToday(), []);
  const [creatingKey, setCreatingKey] = useState<string | null>(null);

  const horizon = useMemo(() => listMonthPeriods(currentPeriod, 2, 3), [currentPeriod]);
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const rows = useMemo(
    () => obligations.filter((o) => o.workstream === tab),
    [obligations, tab],
  );

  const weeks = useMemo(() => getWeeksForPeriod(focusPeriod), [focusPeriod]);

  const columns = useMemo(() => {
    if (tab === "bookkeeping") return weeks.map((w) => w.weekCode);
    if (tab === "supplier_payments") {
      return [`${focusPeriod}|Mid`, `${focusPeriod}|EOM`];
    }
    return horizon;
  }, [tab, weeks, horizon, focusPeriod]);

  const grouped = useMemo(() => {
    if (tab === "metka_bas") {
      const known = new Set(METKA_ENTITIES.map((e) => e.name));
      const extras = Array.from(
        new Set(
          rows
            .map((o) => o.entityName)
            .filter((n): n is string => typeof n === "string" && n.length > 0 && !known.has(n)),
        ),
      ).sort();
      const names = [...METKA_ENTITIES.map((e) => e.name), ...extras];
      return names.map((name) => {
        const roster = METKA_ENTITIES.find((e) => e.name === name);
        const cells: Record<string, Obligation> = {};
        for (const o of rows) {
          if (o.entityName === name) cells[o.periodStart] = o;
        }
        return {
          key: name,
          label: roster?.shortName || shortEntityName(name),
          clientId: METKA_CLIENT_ID,
          cells,
          notes: roster ? `${roster.group ? "Group" : "Non-group"} · ${roster.tax}` : "",
          client: clientMap.get(METKA_CLIENT_ID),
        };
      });
    }

    const byClient = new Map<
      string,
      {
        key: string;
        label: string;
        clientId: string;
        cells: Record<string, Obligation>;
        notes: string;
        client?: Client;
      }
    >();

    const relevantClients = clients.filter((c) => {
      if (c.inactive) return false;
      const s = c.services;
      if (tab === "bookkeeping") return s.weeklyBooks || s.monthlyBooks;
      if (tab === "bas_ias") return (s.monthlyBAS || s.twoMonthlyIAS || s.quarterlyBAS) && !isMetkaClient(c.id);
      if (tab === "management_reports") return s.managementReports;
      if (tab === "supplier_payments") return s.paymentRun;
      if (tab === "payroll_tax") return s.payrollTax;
      if (tab === "stp_payroll") return s.stp;
      return true;
    });

    for (const client of relevantClients) {
      byClient.set(client.id, {
        key: client.id,
        label: client.shortName || client.name,
        clientId: client.id,
        cells: {},
        notes: client.notes || "",
        client,
      });
    }

    for (const o of rows) {
      const client = clientMap.get(o.clientId);
      if (client?.inactive) continue;
      const col = columnKey(tab, o);
      if (!col) continue;
      if (tab === "bookkeeping" && !columns.includes(col)) continue;
      if (tab === "supplier_payments" && !columns.includes(col)) continue;
      const existing = byClient.get(o.clientId) || {
        key: o.clientId,
        label: client?.shortName || client?.name || o.clientId,
        clientId: o.clientId,
        cells: {},
        notes: client?.notes || "",
        client,
      };
      const prev = existing.cells[col];
      if (!prev || (o.taskLabel || "").length >= (prev.taskLabel || "").length) {
        existing.cells[col] = o;
      }
      byClient.set(o.clientId, existing);
    }
    return Array.from(byClient.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows, clientMap, tab, clients, columns]);

  const openCount = rows.filter((o) => isOpenStatus(o.status)).length;
  const overdueCount = rows.filter(
    (o) => isOpenStatus(o.status) && o.dueDate && o.dueDate < melbourneToday,
  ).length;

  const handleCreateCell = async (client: Client | undefined, col: string, entityName?: string) => {
    if (!client) return;
    const period = periodFromColumn(tab, col, focusPeriod);
    const weekCode =
      tab === "bookkeeping"
        ? col
        : tab === "supplier_payments"
          ? col.split("|")[1]
          : undefined;
    const candidates = generateCellCandidates(client, obligations, tab, period, weekCode, entityName);
    if (candidates.length === 0) return;
    const key = `${client.id}:${col}:${entityName || ""}`;
    setCreatingKey(key);
    try {
      await batchCreateObligations(candidates);
    } finally {
      setCreatingKey(null);
    }
  };

  const metkaPack = tab === "metka_bas" ? summarizeMetkaPack(obligations, focusPeriod) : null;
  const metkaClient = clients.find((c) => c.id === METKA_CLIENT_ID);

  return (
    <div className="space-y-4">
      <div className="border-b border-line pb-3">
        <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Control sheet</p>
        <h2 className="text-xl font-semibold tracking-tight text-ink">Trackers</h2>
        <p className="mt-0.5 text-xs text-muted">
          Month chips · tap status · + on an empty cell · red when late.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "min-h-9 rounded-md border px-3 text-xs font-semibold",
              tab === item.id
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-line bg-surface text-muted hover:bg-paper hover:text-ink",
            )}
          >
            {WORKSTREAM_LABELS[item.id]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
          {horizon.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFocusPeriod(p)}
              className={cn(
                "min-h-8 rounded-full border px-3 text-2xs font-semibold",
                p === focusPeriod
                  ? "border-accent bg-accent text-accent-fg"
                  : p === currentPeriod
                    ? "border-accent/30 bg-accent-soft text-accent"
                    : "border-line bg-surface text-muted hover:text-ink",
              )}
            >
              {formatPeriod(p)}
              {p === currentPeriod ? " · now" : ""}
            </button>
          ))}
        </div>

      <div className="flex flex-wrap items-center gap-3 text-2xs text-muted">
        <span>
          {grouped.length} rows · {openCount} open
          {overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}
        </span>
        <span className="text-subtle">{TABS.find((t) => t.id === tab)?.hint}</span>
        {tab === "bookkeeping" && (
          <span className="text-subtle">{formatMelbourneMonthYear(focusPeriod)} weeks</span>
        )}
        {metkaPack && metkaClient && metkaPack.missing > 0 && (
          <button
            type="button"
            disabled={creatingKey === `pack:${focusPeriod}`}
            onClick={() => void handleCreateCell(metkaClient, focusPeriod)}
            className="min-h-8 rounded-md border border-line bg-raised px-2.5 text-2xs font-semibold text-ink hover:border-accent hover:text-accent"
          >
            Open {formatPeriod(focusPeriod)} pack ({metkaPack.missing} missing)
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-paper text-2xs font-semibold uppercase tracking-wider text-muted">
                <th className="sticky left-0 z-10 min-w-[160px] bg-paper px-3 py-2.5">
                  {tab === "metka_bas" ? "Entity" : "Client"}
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className={cn(
                      "min-w-[132px] px-2 py-2.5 text-center",
                      isCurrentColumn(tab, col, currentPeriod, focusPeriod) && "text-accent",
                    )}
                  >
                    {formatColumn(tab, col, weeks)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {grouped.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-muted">
                    No {WORKSTREAM_LABELS[tab].toLowerCase()} rows yet. Open a period from Pipeline to generate them.
                  </td>
                </tr>
              ) : (
                grouped.map((row) => (
                  <tr key={row.key} className="hover:bg-paper/70">
                    <td className="sticky left-0 z-10 bg-surface px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenClientDrawer(row.clientId)}
                        className="font-semibold text-ink hover:text-accent hover:underline"
                      >
                        {row.label}
                      </button>
                      {tab === "bookkeeping" && row.client?.services.weeklyBooks && (
                        <div className="text-2xs text-subtle">Weekly</div>
                      )}
                      {tab === "bookkeeping" && row.client?.services.monthlyBooks && !row.client.services.weeklyBooks && (
                        <div className="text-2xs text-subtle">Month-end</div>
                      )}
                      {row.notes ? (
                        <div className="max-w-[220px] truncate text-2xs text-subtle" title={row.notes}>
                          {row.notes}
                        </div>
                      ) : null}
                      {tab === "metka_bas" ? (
                        <div className="max-w-[220px] truncate text-2xs text-subtle" title={row.key}>
                          {row.key}
                        </div>
                      ) : null}
                    </td>
                    {columns.map((col) => {
                      const cell = row.cells[col];
                      if (!cell) {
                        const lastWeek = weeks[weeks.length - 1]?.weekCode;
                        const monthlyOnly =
                          tab === "bookkeeping" &&
                          row.client?.services.monthlyBooks &&
                          !row.client.services.weeklyBooks;
                        const canAdd =
                          Boolean(row.client) &&
                          !(monthlyOnly && col !== lastWeek);
                        const busy = creatingKey === `${row.clientId}:${col}:${tab === "metka_bas" ? row.key : ""}`;
                        return (
                          <td key={col} className="px-2 py-2 text-center">
                            {canAdd ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void handleCreateCell(
                                    row.client,
                                    col,
                                    tab === "metka_bas" ? row.key : undefined,
                                  )
                                }
                                className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-dashed border-line text-subtle hover:border-accent hover:text-accent"
                                title="Create this cycle"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <span className="text-2xs text-subtle">—</span>
                            )}
                          </td>
                        );
                      }
                      const overdue =
                        isOpenStatus(cell.status) && cell.dueDate && cell.dueDate < melbourneToday;
                      return (
                        <td
                          key={col}
                          className={cn("px-2 py-2 text-center", overdue && "bg-danger-soft/40")}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <StatusChip
                              status={cell.status}
                              onChange={(s: ObligationStatus) =>
                                void updateObligationStatus(cell.id, s)
                              }
                            />
                            <button
                              type="button"
                              onClick={() => onSelectObligation(cell)}
                              className="text-2xs text-muted hover:text-accent"
                            >
                              {overdue
                                ? `${daysOverdue(cell.dueDate, melbourneToday)}d late`
                                : formatAuShort(cell.dueDate)}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {tab === "metka_bas" && (
        <p className="text-2xs text-muted">
          Metka Non-Group stays one client. Each legal entity is a row; each month is a cell. Work the
          pack here (bulk ticks from Pipeline still work). Due the 21st of the following month.
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-2xs text-subtle">
        {ALL_STATUSES.map((s) => (
          <span key={s} className="rounded-full border border-line bg-paper px-2 py-0.5">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function columnKey(tab: StreamTab, o: Obligation): string {
  if (tab === "bookkeeping") return o.weekCode || o.periodStart;
  if (tab === "supplier_payments") return `${o.periodStart}|${o.weekCode || "Run"}`;
  return o.periodStart;
}

function periodFromColumn(tab: StreamTab, col: string, focusPeriod: string): string {
  if (tab === "supplier_payments") return col.split("|")[0] || focusPeriod;
  if (tab === "bookkeeping") return focusPeriod;
  return col;
}

function isCurrentColumn(tab: StreamTab, col: string, currentPeriod: string, focusPeriod: string): boolean {
  if (tab === "bookkeeping") return focusPeriod === currentPeriod;
  if (tab === "supplier_payments") return col.startsWith(currentPeriod);
  return col === currentPeriod;
}

function formatColumn(
  tab: StreamTab,
  col: string,
  weeks: { weekCode: string; dueDate: string; weekIndex: number }[],
): string {
  if (tab === "bookkeeping") {
    const week = weeks.find((w) => w.weekCode === col);
    if (week) return `W${week.weekIndex} · ${formatAuShort(week.dueDate)}`;
    return col;
  }
  if (tab === "supplier_payments") {
    const [period, kind] = col.split("|");
    return `${formatPeriod(period)} ${kind}`;
  }
  return formatPeriod(col);
}
