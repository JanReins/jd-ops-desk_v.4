import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import {
  Obligation,
  Priority,
  ObligationStatus,
  WORKSTREAM_LABELS,
  Workstream,
  ALL_STATUSES,
  formatPeriod,
} from '../types';
import { StatusChip } from './StatusChip';
import { PriorityBadge } from './PriorityBadge';
import {
  getMelbourneToday,
  getMelbourneCurrentPeriod,
  getNextMonthPeriod,
  formatMelbourneMonthYear,
} from '../utils/dates';
import { generateNextMonthCandidates, CandidateObligation } from '../utils/obligationGenerator';
import {
  Filter,
  Search,
  CalendarPlus,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
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
    updateObligationPriority,
    batchCreateObligations,
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
    set.add(melbourneCurrentPeriod);
    set.add(getNextMonthPeriod(melbourneCurrentPeriod));
    obligations.forEach((o) => {
      if (o.periodStart) set.add(o.periodStart);
    });
    return Array.from(set).sort();
  }, [obligations, melbourneCurrentPeriod]);

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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const client = clientMap.get(ob.clientId);
        const cName = (client?.shortName || client?.name || '').toLowerCase();
        const nextAction = (ob.nextAction || '').toLowerCase();
        const blocker = (ob.blocker || '').toLowerCase();
        const waitingOn = (ob.waitingOn || '').toLowerCase();
        const notes = (ob.notes || '').toLowerCase();
        const owner = (ob.owner || '').toLowerCase();

        if (
          !cName.includes(q) &&
          !nextAction.includes(q) &&
          !blocker.includes(q) &&
          !waitingOn.includes(q) &&
          !notes.includes(q) &&
          !owner.includes(q)
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

  // Trigger Open Next Month confirmation preview
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Compliance Pipeline</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Master Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Cross-client operational obligations, periodic schedules & next-month generation
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Open this period from prior month services */}
          <button
            id="open-this-period-pipeline-btn"
            type="button"
            onClick={handleOpenThisPeriodClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors cursor-pointer"
            title={`Generate obligations for ${formatMelbourneMonthYear(targetThisPeriod)} from client service flags`}
          >
            <CalendarPlus className="h-3.5 w-3.5 text-slate-600" />
            <span>Open this period from prior month services</span>
          </button>

          {/* Open Next Month Action with labeled target period */}
          <button
            id="open-next-month-pipeline-btn"
            type="button"
            onClick={handleOpenNextMonthClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span>Open {formatMelbourneMonthYear(targetNextPeriod)}</span>
          </button>
        </div>
      </div>

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
            className="px-3 py-1 rounded bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs shrink-0 cursor-pointer shadow-2xs transition-colors"
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
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Showing <strong className="text-slate-800">{sortedObligations.length}</strong> of{' '}
            <strong className="text-slate-800">{obligations.length}</strong> total obligations in
            pipeline
          </div>
          {(selectedPeriod !== 'all' ||
            selectedWorkstream !== 'all' ||
            selectedStatus !== 'all' ||
            selectedClient !== 'all' ||
            searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedPeriod('all');
                setSelectedWorkstream('all');
                setSelectedStatus('all');
                setSelectedClient('all');
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
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-28">Client</th>
                <th className="py-2.5 px-3 w-32">Workstream</th>
                <th className="py-2.5 px-3 w-24">Period</th>
                <th className="py-2.5 px-3 w-24">Due Date</th>
                <th className="py-2.5 px-3 w-36">Status</th>
                <th className="py-2.5 px-3 w-16 text-center">Priority</th>
                <th className="py-2.5 px-3 min-w-[200px]">Next Action</th>
                <th className="py-2.5 px-3 min-w-[160px]">Blocker / Waiting On</th>
                <th className="py-2.5 px-3 w-24">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedObligations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Layers className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">
                      {selectedPeriod === 'all'
                        ? 'No obligations found for the selected pipeline criteria.'
                        : `No obligations for ${formatMelbourneMonthYear(selectedPeriod)}.`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
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
                      }`}
                    >
                      {/* Client shortName */}
                      <td className="py-2.5 px-3">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            if (ob.clientId) onOpenClientDrawer(ob.clientId);
                          }}
                          className="font-bold text-slate-900 hover:text-blue-700 hover:underline cursor-pointer"
                        >
                          {client?.shortName || client?.name || 'Client'}
                        </span>
                      </td>

                      {/* Workstream */}
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {WORKSTREAM_LABELS[ob.workstream] || ob.workstream}
                      </td>

                      {/* Period */}
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
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
                          <span className="block text-[10px] text-red-600 font-semibold leading-none mt-0.5">
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
                      <td className="py-2.5 px-3 text-[11px] truncate max-w-xs">
                        {ob.blocker ? (
                          <span className="text-red-600 font-semibold">Block: {ob.blocker}</span>
                        ) : ob.waitingOn ? (
                          <span className="text-amber-700 font-medium">Wait: {ob.waitingOn}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Owner */}
                      <td className="py-2.5 px-3 text-[11px] text-slate-600 truncate">
                        {ob.owner || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for "Open Next Month" */}
      {confirmModal.open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
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
                          <div className="text-[11px] text-slate-500">{cand.nextAction}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-xs text-slate-700 font-semibold">
                            Due {cand.dueDate}
                          </span>
                          <div className="text-[10px] text-slate-400">Owner: {cand.owner}</div>
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
                  <p className="text-[11px] text-slate-400 mt-1">
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
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer shadow-xs"
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
