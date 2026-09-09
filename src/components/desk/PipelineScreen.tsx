import { useEffect, useState, useMemo } from 'react';
import { useData } from '@/lib/ops/data-context';
import {
  Obligation,
  ObligationStatus,
  Priority,
  WORKSTREAM_LABELS,
  Workstream,
  ALL_STATUSES,
  formatPeriod,
} from '@/lib/ops/types';
import { StatusChip } from './StatusChip';
import { BulkStatusBar } from './BulkStatusBar';
import { MetkaPackCard } from './MetkaPackCard';
import { shortEntityName, METKA_CLIENT_ID } from '@/lib/ops/metka';
import {
  getMelbourneToday,
  getMelbourneCurrentPeriod,
  getNextMonthPeriod,
  formatMelbourneMonthYear,
  listMonthPeriods,
} from '@/lib/ops/dates';
import { generateNextMonthCandidates, generateRollingHorizon, CandidateObligation } from '@/lib/ops/obligationGenerator';
import { isOpenStatus, isTodayObligation, getCourt, priorPeriodOpen, isOverdueOpen } from '@/lib/ops/todaySet';
import {
  Search,
  CalendarPlus,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Repeat,
  Pin,
  PinOff,
  History,
} from 'lucide-react';

interface PipelineScreenProps {
  onSelectObligation: (obligation: Obligation) => void;
  onOpenClientDrawer: (clientId: string) => void;
}

export function PipelineScreen({
  onSelectObligation,
  onOpenClientDrawer,
}: PipelineScreenProps) {
  const {
    clients,
    obligations,
    updateObligationStatus,
    batchUpdateObligationStatus,
    updateObligationPriority,
    batchCreateObligations,
    pinToToday,
    unpinFromToday,
  } = useData();

  // Current Melbourne period default: YYYY-MM-01
  const melbourneCurrentPeriod = useMemo(() => getMelbourneCurrentPeriod(), []);
  const melbourneToday = useMemo(() => getMelbourneToday(), []);

  // Filter states
  const [selectedPeriod, setSelectedPeriod] = useState<string>(melbourneCurrentPeriod);
  const [selectedWorkstream, setSelectedWorkstream] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [courtFilter, setCourtFilter] = useState<'all' | 'mine' | 'theirs'>('all');
  const [ledgerLens, setLedgerLens] = useState<'off' | 'overdue' | 'prior'>('off');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [mobileShown, setMobileShown] = useState(80);

  // "Open next month / period" modal confirmation state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    targetPeriod: string;
    title: string;
    candidates: CandidateObligation[];
    creating: boolean;
  }>({
    open: false,
    targetPeriod: '',
    title: '',
    candidates: [],
    creating: false,
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Client lookup map
  const clientMap = useMemo(() => {
    return new Map(clients.map((c) => [c.id, c]));
  }, [clients]);

  // Distinct periods across all obligations + current + next
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    listMonthPeriods(melbourneCurrentPeriod, 2, 3).forEach((p) => set.add(p));
    obligations.forEach((o) => {
      if (o.periodStart && o.periodStart.endsWith("-01")) set.add(o.periodStart);
    });
    return Array.from(set).sort();
  }, [obligations, melbourneCurrentPeriod]);

  const horizonMissing = useMemo(
    () => generateRollingHorizon(clients, obligations, 2),
    [clients, obligations],
  );

  // Target period for "Open this period from prior month services":
  // generate obligations whose periodStart === selectedPeriod (or current if 'all')
  const targetThisPeriod = useMemo(() => {
    return selectedPeriod === 'all' ? melbourneCurrentPeriod : selectedPeriod;
  }, [selectedPeriod, melbourneCurrentPeriod]);

  // Target month for "Open next month" from selectedPeriod (or current if 'all')
  const targetNextPeriod = useMemo(() => {
    const base = selectedPeriod === 'all' ? melbourneCurrentPeriod : selectedPeriod;
    return getNextMonthPeriod(base);
  }, [selectedPeriod, melbourneCurrentPeriod]);

  // Count obligations by period
  const periodCounts = useMemo(() => {
    const counts = new Map<string, number>();
    obligations.forEach((o) => {
      if (o.periodStart) {
        counts.set(o.periodStart, (counts.get(o.periodStart) || 0) + 1);
      }
    });
    return counts;
  }, [obligations]);

  const priorOpen = useMemo(
    () => priorPeriodOpen(obligations, melbourneCurrentPeriod),
    [obligations, melbourneCurrentPeriod],
  );
  const priorMineCount = useMemo(
    () => priorOpen.filter((o) => getCourt(o.status) === "mine").length,
    [priorOpen],
  );
  const openByPeriod = useMemo(() => {
    const counts = new Map<string, number>();
    obligations.forEach((o) => {
      if (o.periodStart && isOpenStatus(o.status) && o.workstream !== "metka_bas") {
        counts.set(o.periodStart, (counts.get(o.periodStart) || 0) + 1);
      }
    });
    return counts;
  }, [obligations]);

  const viewPriorBacklog = () => {
    setSelectedPeriod("all");
    setSelectedStatus("all");
    setLedgerLens("prior");
    setSearchQuery("");
  };

  // If selectedPeriod filter returns zero rows AND another period has rows, identify that period
  const otherPeriodWithRows = useMemo(() => {
    if (selectedPeriod === 'all') return null;
    const countForSelected = periodCounts.get(selectedPeriod) || 0;
    if (countForSelected > 0) return null;

    // Find another period with rows (e.g. August 2026, or highest count / most recent)
    const sortedPeriodsWithRows = Array.from(periodCounts.entries())
      .filter(([p, count]) => p !== selectedPeriod && count > 0)
      .sort((a, b) => b[0].localeCompare(a[0]));

    return sortedPeriodsWithRows.length > 0 ? sortedPeriodsWithRows[0][0] : null;
  }, [selectedPeriod, periodCounts]);

  // Filtered obligations
  const filteredObligations = useMemo(() => {
    return obligations.filter((ob) => {
      if (selectedPeriod !== 'all' && ob.periodStart !== selectedPeriod) {
        return false;
      }
      if (selectedWorkstream !== 'all' && ob.workstream !== selectedWorkstream) {
        return false;
      }
      if (selectedStatus !== 'all' && ob.status !== selectedStatus) {
        return false;
      }
      if (selectedClient !== 'all' && ob.clientId !== selectedClient) {
        return false;
      }
      if (courtFilter !== 'all' && isOpenStatus(ob.status) && getCourt(ob.status) !== courtFilter) {
        return false;
      }
      if (courtFilter !== 'all' && !isOpenStatus(ob.status)) {
        return false;
      }
      if (ledgerLens === "overdue" && !isOverdueOpen(ob, melbourneToday)) {
        return false;
      }
      if (
        ledgerLens === "prior" &&
        !(isOpenStatus(ob.status) && ob.periodStart && ob.periodStart < melbourneCurrentPeriod)
      ) {
        return false;
      }
      const searching = Boolean(searchQuery.trim());
      const showPackRows =
        selectedWorkstream === "metka_bas" ||
        selectedClient === METKA_CLIENT_ID ||
        searching;
      if (!showPackRows && ob.workstream === "metka_bas") {
        return false;
      }
      if (searching) {
        const q = searchQuery.toLowerCase().trim();
        const client = clientMap.get(ob.clientId);
        const cName = (client?.shortName || client?.name || '').toLowerCase();
        const nextAction = (ob.nextAction || '').toLowerCase();
        const blocker = (ob.blocker || '').toLowerCase();
        const waitingOn = (ob.waitingOn || '').toLowerCase();
        const notes = (ob.notes || '').toLowerCase();
        const owner = (ob.owner || '').toLowerCase();
        const entity = (ob.entityName || '').toLowerCase();

        if (
          !cName.includes(q) &&
          !nextAction.includes(q) &&
          !blocker.includes(q) &&
          !waitingOn.includes(q) &&
          !notes.includes(q) &&
          !owner.includes(q) &&
          !entity.includes(q) &&
          !shortEntityName(ob.entityName).toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    obligations,
    selectedPeriod,
    selectedWorkstream,
    selectedStatus,
    selectedClient,
    searchQuery,
    clientMap,
    courtFilter,
    ledgerLens,
    melbourneToday,
    melbourneCurrentPeriod,
  ]);

  // Sort by workstream, then dueDate ascending, then priority
  const sortedObligations = useMemo(() => {
    return [...filteredObligations].sort((a, b) => {
      if (a.workstream !== b.workstream) {
        return a.workstream.localeCompare(b.workstream);
      }
      const dateA = a.dueDate || '9999-99-99';
      const dateB = b.dueDate || '9999-99-99';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.order || 0) - (b.order || 0);
    });
  }, [filteredObligations]);

  const selectableIds = useMemo(() => sortedObligations.map((o) => o.id), [sortedObligations]);
  const allVisibleSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIds([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const applyBulkStatus = async (status: ObligationStatus) => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      await batchUpdateObligationStatus(selectedIds, status);
      setSelectedIds([]);
    } finally {
      setBulkBusy(false);
    }
  };

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of ALL_STATUSES) counts[s] = 0;
    for (const o of filteredObligations) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return ALL_STATUSES.map((s) => ({ status: s, count: counts[s] || 0 })).filter((x) => x.count > 0);
  }, [filteredObligations]);

  // Trigger Open This Period from prior month services
  const handleOpenThisPeriodClick = () => {
    const candidates = generateNextMonthCandidates(clients, obligations, targetThisPeriod);
    setConfirmModal({
      open: true,
      targetPeriod: targetThisPeriod,
      title: `Open This Period: ${formatMelbourneMonthYear(targetThisPeriod)}`,
      candidates,
      creating: false,
    });
  };

  const handleOpenNextMonthClick = () => {
    const candidates = generateNextMonthCandidates(clients, obligations, targetNextPeriod);
    setConfirmModal({
      open: true,
      targetPeriod: targetNextPeriod,
      title: `Open ${formatMelbourneMonthYear(targetNextPeriod)}`,
      candidates,
      creating: false,
    });
  };

  const handleOpenHorizonClick = () => {
    setConfirmModal({
      open: true,
      targetPeriod: melbourneCurrentPeriod,
      title: `Fill ${formatMelbourneMonthYear(melbourneCurrentPeriod)} – ${formatMelbourneMonthYear(getNextMonthPeriod(getNextMonthPeriod(melbourneCurrentPeriod)))}`,
      candidates: horizonMissing,
      creating: false,
    });
  };

  // Confirm and batch create
  const handleConfirmCreateNextMonth = async () => {
    setConfirmModal((prev) => ({ ...prev, creating: true }));
    try {
      const createdCount = await batchCreateObligations(confirmModal.candidates);
      const targetP = confirmModal.targetPeriod;
      setConfirmModal({ open: false, targetPeriod: '', title: '', candidates: [], creating: false });
      setNotification(
        `Successfully created ${createdCount} obligations for ${formatMelbourneMonthYear(
          targetP
        )}.`
      );
      // Switch period filter to the opened period so the user sees newly created rows immediately
      setSelectedPeriod(targetP);
      setTimeout(() => setNotification(null), 6000);
    } catch (err: unknown) {
      setConfirmModal((prev) => ({ ...prev, creating: false }));
      const msg = err instanceof Error ? err.message : 'Failed to create obligations';
      alert(msg);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Master ledger</p>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Compliance pipeline</h2>
          <p className="mt-0.5 text-xs text-muted">
            Recurring work rolls forward each month. Weekly bookkeeping opens as W1–W5, not a single lump.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="open-this-period-pipeline-btn"
            type="button"
            onClick={handleOpenThisPeriodClick}
            className="flex min-h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper"
            title={`Generate obligations for ${formatMelbourneMonthYear(targetThisPeriod)} from client service flags`}
          >
            <CalendarPlus className="h-3.5 w-3.5 text-muted" />
            <span>Open {formatMelbourneMonthYear(targetThisPeriod)}</span>
          </button>
          <button
            id="open-next-month-pipeline-btn"
            type="button"
            onClick={handleOpenNextMonthClick}
            className="flex min-h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span>Open {formatMelbourneMonthYear(targetNextPeriod)}</span>
          </button>
          <button
            id="fill-horizon-pipeline-btn"
            type="button"
            onClick={handleOpenHorizonClick}
            disabled={horizonMissing.length === 0}
            className="flex min-h-9 items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg hover:bg-accent-mid disabled:opacity-50"
          >
            <Repeat className="h-3.5 w-3.5" />
            <span>
              {horizonMissing.length > 0
                ? `Fill missing (${horizonMissing.length})`
                : "Horizon filled"}
            </span>
          </button>
        </div>
      </div>

      {priorOpen.length > 0 && selectedPeriod === melbourneCurrentPeriod && ledgerLens === "off" && (
        <div className="flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger-soft/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <History className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-xs text-ink">
              <span className="font-semibold">
                {priorOpen.length} open from prior months
              </span>
              {priorMineCount > 0 ? ` · ${priorMineCount} my court` : ""}
              . {formatMelbourneMonthYear(melbourneCurrentPeriod)} hides prior months unless you open them.
            </p>
          </div>
          <button
            type="button"
            onClick={viewPriorBacklog}
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-md bg-danger px-3 text-xs font-semibold text-accent-fg hover:opacity-90"
          >
            View backlog
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            setSelectedPeriod("all");
            setLedgerLens("off");
          }}
          className={`min-h-8 rounded-full border px-3 text-2xs font-semibold ${
            selectedPeriod === "all"
              ? "border-accent bg-accent text-accent-fg"
              : "border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          All
        </button>
        {availablePeriods.map((p) => {
          const count = periodCounts.get(p) || 0;
          const openCount = openByPeriod.get(p) || 0;
          const isPast = p < melbourneCurrentPeriod;
          const showOpen = isPast && openCount > 0;
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                setSelectedPeriod(p);
                setLedgerLens("off");
              }}
              className={`min-h-8 rounded-full border px-3 text-2xs font-semibold ${
                selectedPeriod === p
                  ? "border-accent bg-accent text-accent-fg"
                  : showOpen
                    ? "border-danger/40 bg-danger-soft text-danger"
                    : p === melbourneCurrentPeriod
                      ? "border-accent/30 bg-accent-soft text-accent"
                      : "border-line bg-surface text-muted hover:text-ink"
              }`}
            >
              {formatPeriod(p)}
              {showOpen ? ` · ${openCount}` : count > 0 ? ` · ${count}` : ""}
              {p === melbourneCurrentPeriod ? " · now" : ""}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["all", "mine", "theirs"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCourtFilter(c)}
            className={`min-h-8 rounded-full border px-3 text-2xs font-semibold ${
              courtFilter === c
                ? "border-accent bg-accent text-accent-fg"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {c === "all" ? "All courts" : c === "mine" ? "My court" : "Watching"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setLedgerLens((v) => (v === "overdue" ? "off" : "overdue"))}
          className={`min-h-8 rounded-full border px-3 text-2xs font-semibold ${
            ledgerLens === "overdue"
              ? "border-danger bg-danger text-accent-fg"
              : "border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          Overdue
        </button>
        <button
          type="button"
          onClick={() => {
            if (ledgerLens === "prior") {
              setLedgerLens("off");
              return;
            }
            setSelectedPeriod("all");
            setLedgerLens("prior");
          }}
          className={`min-h-8 rounded-full border px-3 text-2xs font-semibold ${
            ledgerLens === "prior"
              ? "border-danger bg-danger text-accent-fg"
              : "border-line bg-surface text-muted hover:text-ink"
          }`}
        >
          Prior months{priorOpen.length > 0 ? ` · ${priorOpen.length}` : ""}
        </button>
      </div>

      {statusBreakdown.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {statusBreakdown.map((row) => (
            <button
              key={row.status}
              type="button"
              onClick={() => setSelectedStatus(row.status === selectedStatus ? 'all' : row.status)}
              className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${
                selectedStatus === row.status
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface hover:bg-paper'
              }`}
            >
              <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{row.status}</div>
              <div className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-ink">{row.count}</div>
            </button>
          ))}
        </div>
      )}

      {/* Notification banner */}
      {notification && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <MetkaPackCard obligations={obligations} />

      {/* Empty period banner when another period has rows */}
      {otherPeriodWithRows && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              No obligations for {formatMelbourneMonthYear(selectedPeriod)}. Demo / leftover work is in{' '}
              <strong className="font-semibold">{formatMelbourneMonthYear(otherPeriodWithRows)}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPeriod(otherPeriodWithRows)}
            className="px-3 py-1 rounded bg-amber-700 hover:bg-amber-800 text-accent-fg font-semibold text-xs shrink-0 cursor-pointer shadow-2xs transition-colors"
          >
            View {formatMelbourneMonthYear(otherPeriodWithRows)}
          </button>
        </div>
      )}

      {/* Pipeline Dense Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
          {/* Period Filter */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-800 font-medium focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Periods</option>
              {availablePeriods.map((p) => (
                <option key={p} value={p}>
                  {formatMelbourneMonthYear(p)} ({p})
                </option>
              ))}
            </select>
          </div>

          {/* Workstream Filter */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Workstream
            </label>
            <select
              value={selectedWorkstream}
              onChange={(e) => setSelectedWorkstream(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-800 font-medium focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Workstreams</option>
              {(Object.keys(WORKSTREAM_LABELS) as Workstream[]).map((ws) => (
                <option key={ws} value={ws}>
                  {WORKSTREAM_LABELS[ws]}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-800 font-medium focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Client Filter */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Client
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-800 font-medium focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortName} ({c.name})
                </option>
              ))}
            </select>
          </div>

          {/* Search text */}
          <div>
            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords..."
                className="w-full rounded border border-slate-300 bg-white pl-7 pr-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-2xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Showing <strong className="text-slate-800">{sortedObligations.length}</strong> of{' '}
            <strong className="text-slate-800">{obligations.length}</strong> total
            {selectedWorkstream !== "metka_bas" &&
            selectedClient !== METKA_CLIENT_ID &&
            !searchQuery.trim()
              ? " · Metka pack hidden — open Trackers or filter Metka BAS"
              : ""}
          </div>
          {(selectedPeriod !== 'all' ||
            selectedWorkstream !== 'all' ||
            selectedStatus !== 'all' ||
            selectedClient !== 'all' ||
            courtFilter !== 'all' ||
            ledgerLens !== 'off' ||
            searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedPeriod('all');
                setSelectedWorkstream('all');
                setSelectedStatus('all');
                setSelectedClient('all');
                setCourtFilter('all');
                setLedgerLens('off');
                setSearchQuery('');
              }}
              className="text-blue-700 hover:text-blue-900 font-medium hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Dense Table of All Pipeline Obligations */}
      <div className="space-y-2 md:hidden">
        {sortedObligations.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface px-4 py-10 text-center text-xs text-muted">
            No obligations match these filters.
          </div>
        ) : (
          sortedObligations.slice(0, mobileShown).map((ob) => {
            const client = clientMap.get(ob.clientId);
            const isDone = ob.status === "Done" || ob.status === "Not applicable";
            const isOverdue = !isDone && ob.dueDate && ob.dueDate < melbourneToday;
            return (
              <div
                key={ob.id}
                className={`flex gap-2 rounded-lg border p-3 text-left ${
                  isOverdue ? "border-danger/30 bg-danger-soft/40" : "border-line bg-surface"
                } ${selectedIds.includes(ob.id) ? "ring-1 ring-accent/40" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(ob.id)}
                  onChange={() => toggleSelected(ob.id)}
                  className="mt-1 h-4 w-4 shrink-0 accent-accent"
                  aria-label={`Select ${ob.nextAction || ob.taskLabel}`}
                />
                <div
                  role="button"
                  tabIndex={0}
                  className="min-w-0 flex-1"
                  onClick={() => onSelectObligation(ob)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectObligation(ob);
                    }
                  }}
                >
                <div className="text-xs font-semibold text-ink">
                  {ob.entityName ? shortEntityName(ob.entityName) : client?.shortName || "Client"} · {WORKSTREAM_LABELS[ob.workstream]}
                </div>
                <div className="mt-0.5 text-2xs text-muted">{ob.taskLabel || ob.nextAction || "—"}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className={`font-mono text-2xs ${isOverdue ? "font-semibold text-danger" : "text-muted"}`}>
                    {ob.dueDate}
                  </span>
                  <StatusChip
                    status={ob.status}
                    onChange={(newStatus) => void updateObligationStatus(ob.id, newStatus)}
                  />
                  {isOpenStatus(ob.status) && (
                    <button
                      type="button"
                      onClick={() =>
                        isTodayObligation(ob) ? void unpinFromToday(ob.id) : void pinToToday(ob.id)
                      }
                      className="ml-auto inline-flex min-h-8 items-center gap-1 rounded px-1.5 text-2xs font-semibold text-muted hover:text-accent"
                    >
                      {isTodayObligation(ob) ? (
                        <>
                          <PinOff className="h-3 w-3" /> Park
                        </>
                      ) : (
                        <>
                          <Pin className="h-3 w-3" /> Today
                        </>
                      )}
                    </button>
                  )}
                </div>
                </div>
              </div>
            );
          })
        )}
        {sortedObligations.length > mobileShown ? (
          <button
            type="button"
            onClick={() => setMobileShown(sortedObligations.length)}
            className="w-full min-h-10 rounded-lg border border-line bg-surface text-xs font-semibold text-ink"
          >
            Show remaining {sortedObligations.length - mobileShown} of {sortedObligations.length}
          </button>
        ) : null}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-line bg-surface shadow-xs md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-2xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => setSelectedIds(allVisibleSelected ? [] : selectableIds)}
                    className="h-4 w-4 accent-accent"
                    aria-label="Select visible obligations"
                  />
                </th>
                <th className="py-2.5 px-3 w-28">Client</th>
                <th className="py-2.5 px-3 w-32">Workstream</th>
                <th className="py-2.5 px-3 w-24">Period</th>
                <th className="py-2.5 px-3 w-24">Due Date</th>
                <th className="py-2.5 px-3 w-36">Status</th>
                <th className="py-2.5 px-3 w-16 text-center">Priority</th>
                <th className="py-2.5 px-3 min-w-[200px]">Next Action</th>
                <th className="py-2.5 px-3 min-w-[160px]">Blocker / Waiting On</th>
                <th className="py-2.5 px-3 w-24">Owner</th>
                <th className="py-2.5 px-3 w-16 text-center">Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedObligations.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Layers className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">
                      {selectedPeriod === 'all'
                        ? 'No obligations found for the selected pipeline criteria.'
                        : `No obligations for ${formatMelbourneMonthYear(selectedPeriod)}.`}
                    </p>
                    <p className="text-2xs text-slate-400 mt-0.5">
                      {selectedPeriod !== 'all'
                        ? `Switch period, or use "Open this period from prior month services" to generate ${formatMelbourneMonthYear(selectedPeriod)} commitments.`
                        : 'Adjust your filters or use generation controls to create commitments.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sortedObligations.map((ob) => {
                  const client = clientMap.get(ob.clientId);
                  const isDone = ob.status === 'Done' || ob.status === 'Not applicable';
                  const isOverdue = !isDone && ob.dueDate && ob.dueDate < melbourneToday;

                  return (
                    <tr
                      key={ob.id}
                      onClick={() => onSelectObligation(ob)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        ob.priority === 'P1' && !isDone
                          ? 'bg-amber-50/20'
                          : isOverdue
                          ? 'bg-red-50/20'
                          : ''
                      } ${selectedIds.includes(ob.id) ? 'bg-accent-soft/50' : ''}`}
                    >
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(ob.id)}
                          onChange={() => toggleSelected(ob.id)}
                          className="h-4 w-4 accent-accent"
                          aria-label={`Select ${ob.nextAction || ob.taskLabel}`}
                        />
                      </td>
                      {/* Client shortName */}
                      <td className="py-2.5 px-3">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (ob.clientId) onOpenClientDrawer(ob.clientId);
                          }}
                          className="font-bold text-slate-900 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                          {ob.entityName ? shortEntityName(ob.entityName) : client?.shortName || client?.name || 'Client'}
                        </span>
                      </td>

                      {/* Workstream */}
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {WORKSTREAM_LABELS[ob.workstream] || ob.workstream}
                      </td>

                      {/* Period */}
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-2xs">
                        {formatPeriod(ob.periodStart)}
                      </td>

                      {/* Due Date */}
                      <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap">
                        <span
                          className={
                            isOverdue
                              ? 'text-red-700 font-bold'
                              : isDone
                              ? 'text-slate-400 line-through'
                              : 'text-slate-700'
                          }
                        >
                          {ob.dueDate}
                        </span>
                        {isOverdue && (
                          <span className="block text-2xs text-red-600 font-semibold leading-none mt-0.5">
                            Overdue
                          </span>
                        )}
                      </td>

                      {/* Status chip (interactive) */}
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <StatusChip
                          status={ob.status}
                          onChange={(newStatus) => updateObligationStatus(ob.id, newStatus)}
                        />
                      </td>

                      {/* Priority */}
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={ob.priority}
                          onChange={(e) =>
                            updateObligationPriority(ob.id, e.target.value as Priority)
                          }
                          className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                          <option value="P3">P3</option>
                        </select>
                      </td>

                      {/* Next Action */}
                      <td className="py-2.5 px-3 text-slate-900 truncate max-w-xs font-medium">
                        {ob.nextAction || '—'}
                      </td>

                      {/* Blocker / Waiting On */}
                      <td className="py-2.5 px-3 text-2xs truncate max-w-xs">
                        {ob.blocker ? (
                          <span className="text-red-600 font-semibold">Block: {ob.blocker}</span>
                        ) : ob.waitingOn ? (
                          <span className="text-amber-700 font-medium">Wait: {ob.waitingOn}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Owner */}
                      <td className="py-2.5 px-3 text-2xs text-slate-600 truncate">
                        {ob.owner || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {isDone ? (
                          <span className="text-2xs text-subtle">—</span>
                        ) : (
                          <button
                            type="button"
                            title={isTodayObligation(ob) ? "Park from today" : "Pin to today"}
                            onClick={() =>
                              isTodayObligation(ob)
                                ? void unpinFromToday(ob.id)
                                : void pinToToday(ob.id)
                            }
                            className={`inline-flex min-h-8 min-w-8 items-center justify-center rounded ${
                              isTodayObligation(ob)
                                ? "bg-accent-soft text-accent"
                                : "text-muted hover:bg-paper hover:text-accent"
                            }`}
                          >
                            {isTodayObligation(ob) ? (
                              <PinOff className="h-3.5 w-3.5" />
                            ) : (
                              <Pin className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BulkStatusBar
        selectedCount={selectedIds.length}
        visibleCount={selectableIds.length}
        allVisibleSelected={allVisibleSelected}
        busy={bulkBusy}
        onToggleAllVisible={() => setSelectedIds(allVisibleSelected ? [] : selectableIds)}
        onClear={() => setSelectedIds([])}
        onApply={(status) => void applyBulkStatus(status)}
      />

      {/* Confirmation Modal for "Open Next Month" */}
      {confirmModal.open && (
        <div
          className="fixed inset-0 z-modal overflow-y-auto bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!confirmModal.creating) {
              setConfirmModal({ open: false, targetPeriod: '', title: '', candidates: [], creating: false });
            }
          }}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
              <div className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmModal.title || `Open Period: ${formatMelbourneMonthYear(confirmModal.targetPeriod)}`}
                </h3>
              </div>
              <button
                type="button"
                disabled={confirmModal.creating}
                onClick={() =>
                  setConfirmModal({ open: false, targetPeriod: '', title: '', candidates: [], creating: false })
                }
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {confirmModal.candidates.length > 0 ? (
                <>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-900 leading-relaxed">
                    Will create{' '}
                    <strong className="font-bold">{confirmModal.candidates.length} obligations</strong>{' '}
                    for period <strong className="font-bold">{formatMelbourneMonthYear(confirmModal.targetPeriod)}</strong> ({confirmModal.targetPeriod}) across your active clients based on their contracted service agreements.
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100 bg-slate-50/50">
                    {confirmModal.candidates.map((cand, i) => (
                      <div key={i} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {cand.clientShortName} • {WORKSTREAM_LABELS[cand.workstream]}
                          </div>
                          <div className="text-2xs text-slate-500">{cand.nextAction}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs text-slate-700 font-semibold">
                            Due {cand.dueDate}
                          </span>
                          <div className="text-2xs text-slate-400">Owner: {cand.owner}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-md border border-slate-200">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-800">
                    All obligations for {formatMelbourneMonthYear(confirmModal.targetPeriod)} already exist!
                  </p>
                  <p className="text-2xs text-slate-400 mt-1">
                    No new obligations need to be generated for this period.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={confirmModal.creating}
                  onClick={() =>
                    setConfirmModal({
                      open: false,
                      targetPeriod: '',
                      title: '',
                      candidates: [],
                      creating: false,
                    })
                  }
                  className="px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
                >
                  {confirmModal.candidates.length > 0 ? 'Cancel' : 'Close'}
                </button>

                {confirmModal.candidates.length > 0 && (
                  <button
                    type="button"
                    disabled={confirmModal.creating}
                    onClick={handleConfirmCreateNextMonth}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-accent hover:bg-accent-mid text-xs font-semibold text-accent-fg disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    <span>
                      {confirmModal.creating
                        ? 'Creating Batch...'
                        : `Confirm & Create ${confirmModal.candidates.length} Obligations`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
