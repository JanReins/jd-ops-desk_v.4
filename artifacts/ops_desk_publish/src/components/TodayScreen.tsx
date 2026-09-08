import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Obligation, Priority, ObligationStatus, getTaskTitle, WORKSTREAM_LABELS, Workstream } from '../types';
import { StatusChip } from './StatusChip';
import { PriorityBadge } from './PriorityBadge';
import { getMelbourneToday } from '../utils/dates';
import { getTodaySet } from '../utils/todaySet';
import {
  Search,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  ListTodo,
  Flame,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

interface TodayScreenProps {
  onOpenClientDrawer: (clientId: string) => void;
  onSelectObligation: (obligation: Obligation) => void;
  onAddObligation: () => void;
}

export function TodayScreen({
  onOpenClientDrawer,
  onSelectObligation,
  onAddObligation,
}: TodayScreenProps) {
  const {
    clients,
    obligations,
    p1Count,
    updateObligationStatus,
    updateObligationPriority,
  } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [workstreamFilter, setWorkstreamFilter] = useState<string>('all');
  const [showAllObligations, setShowAllObligations] = useState(false);
  const [priorityAlert, setPriorityAlert] = useState<string | null>(null);

  // Australia/Melbourne current date (YYYY-MM-DD)
  const melbourneToday = useMemo(() => getMelbourneToday(), []);

  // Client lookup map
  const clientMap = useMemo(() => {
    return new Map(clients.map((c) => [c.id, c]));
  }, [clients]);

  // Base "Today Set" strictly shared with Navbar
  const todaySet = useMemo(() => {
    return getTodaySet(obligations, melbourneToday);
  }, [obligations, melbourneToday]);

  // Sort function: P1 first, then dueDate ascending, then order
  const sortComparator = (a: Obligation, b: Obligation) => {
    // 1. Priority P1 first
    const pRank = (p: Priority) => (p === 'P1' ? 0 : p === 'P2' ? 1 : 2);
    if (pRank(a.priority) !== pRank(b.priority)) {
      return pRank(a.priority) - pRank(b.priority);
    }
    // 2. Due date ascending
    const dateA = a.dueDate || '9999-99-99';
    const dateB = b.dueDate || '9999-99-99';
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    // 3. Order
    return (a.order || 0) - (b.order || 0);
  };

  // The scoped source: either todaySet or all obligations (if toggle on)
  const scopedSource = showAllObligations ? obligations : todaySet;

  // Header metrics computed strictly from the Today set (plus completed today)
  const headerMetrics = useMemo(() => {
    const open = todaySet.length;
    let overdue = 0;
    let estMinutes = 0;

    todaySet.forEach((o) => {
      if (o.dueDate && o.dueDate < melbourneToday) {
        overdue += 1;
      }
      if (o.estimatedMinutes) {
        estMinutes += o.estimatedMinutes;
      }
    });

    // Done today: completedAt full Melbourne date (YYYY-MM-DD) === melbourneToday
    const doneToday = obligations.filter(
      (o) =>
        o.status === 'Done' &&
        o.completedAt &&
        o.completedAt === melbourneToday
    ).length;

    return {
      open,
      overdue,
      estMinutes,
      p1Count,
      doneToday,
    };
  }, [todaySet, obligations, melbourneToday, p1Count]);

  // Filtered and sorted list for display
  const displayedObligations = useMemo(() => {
    const filtered = scopedSource.filter((ob) => {
      const client = clientMap.get(ob.clientId);
      const title = getTaskTitle(ob, client).toLowerCase();
      const nextAction = (ob.nextAction || '').toLowerCase();
      const notes = (ob.notes || '').toLowerCase();
      const blocker = (ob.blocker || '').toLowerCase();
      const owner = (ob.owner || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      if (
        q &&
        !title.includes(q) &&
        !nextAction.includes(q) &&
        !notes.includes(q) &&
        !blocker.includes(q) &&
        !owner.includes(q)
      ) {
        return false;
      }

      if (workstreamFilter !== 'all' && ob.workstream !== workstreamFilter) {
        return false;
      }

      return true;
    });

    return filtered.sort(sortComparator);
  }, [scopedSource, clientMap, searchQuery, workstreamFilter]);

  // Handle priority change with max 3 P1 enforcement
  const handlePriorityChange = async (id: string, newPriority: Priority) => {
    setPriorityAlert(null);
    const res = await updateObligationPriority(id, newPriority);
    if (!res.success) {
      setPriorityAlert(res.message || 'Cannot set more than 3 active P1 obligations.');
      setTimeout(() => setPriorityAlert(null), 4000);
    }
  };

  // Format today's date in Melbourne timezone
  const todayFormatted = useMemo(() => {
    try {
      const [year, month, day] = melbourneToday.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return melbourneToday;
    }
  }, [melbourneToday]);

  return (
    <div className="space-y-4">
      {/* Top Bar: Title & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Today's Focus Plan</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Melbourne
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {todayFormatted} • Operational lodgements, active reviews & next 14-day commitments
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Show all obligations fallback toggle */}
          <button
            type="button"
            onClick={() => setShowAllObligations((prev) => !prev)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
              showAllObligations
                ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {showAllObligations ? 'Showing All (Debug Mode)' : 'Show all obligations'}
          </button>

          <button
            id="new-obligation-btn"
            type="button"
            onClick={onAddObligation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Obligation</span>
          </button>
        </div>
      </div>

      {/* Priority Alert Banner */}
      {priorityAlert && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{priorityAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setPriorityAlert(null)}
            className="text-amber-700 hover:text-amber-900 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Professional Polish Metric Cards (4-column grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Open on Today */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Open (Today Plan)
            </span>
            <ListTodo className="h-4 w-4 text-blue-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{headerMetrics.open}</span>
            <span className="text-[11px] text-slate-500">commitments</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Due &lt;= 14d, carry-over, or active
          </div>
        </div>

        {/* Overdue */}
        <div
          className={`border rounded-lg p-3.5 shadow-xs transition-colors ${
            headerMetrics.overdue > 0
              ? 'bg-red-50/50 border-red-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-semibold tracking-wider uppercase ${
                headerMetrics.overdue > 0 ? 'text-red-700' : 'text-slate-500'
              }`}
            >
              Overdue
            </span>
            <AlertCircle
              className={`h-4 w-4 ${
                headerMetrics.overdue > 0 ? 'text-red-600' : 'text-slate-400'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                headerMetrics.overdue > 0 ? 'text-red-700' : 'text-slate-900'
              }`}
            >
              {headerMetrics.overdue}
            </span>
            <span className="text-[11px] text-slate-500">past dueDate</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {headerMetrics.overdue > 0 ? 'Immediate action required' : 'No overdue items'}
          </div>
        </div>

        {/* Est. Load Minutes */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Est. Load Time
            </span>
            <Clock className="h-4 w-4 text-slate-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {headerMetrics.estMinutes}m
            </span>
            <span className="text-[11px] text-slate-500">
              ({(headerMetrics.estMinutes / 60).toFixed(1)}h)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Estimated operational workload
          </div>
        </div>

        {/* P1 Urgent Count / 3 */}
        <div
          className={`border rounded-lg p-3.5 shadow-xs transition-colors ${
            p1Count >= 3
              ? 'bg-amber-50/50 border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-semibold tracking-wider uppercase ${
                p1Count >= 3 ? 'text-amber-800' : 'text-slate-500'
              }`}
            >
              P1 Capacity
            </span>
            <Flame
              className={`h-4 w-4 ${
                p1Count >= 3 ? 'text-amber-600' : 'text-slate-400'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                p1Count >= 3 ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {p1Count} / 3
            </span>
            <span className="text-[11px] text-slate-500">active cap</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {p1Count >= 3 ? 'P1 slots full (max 3)' : `${3 - p1Count} P1 slot(s) remaining`}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search obligations, client, next action, owner..."
            className="w-full rounded border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Workstream selector */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={workstreamFilter}
            onChange={(e) => setWorkstreamFilter(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 font-medium focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Workstreams</option>
            {(Object.keys(WORKSTREAM_LABELS) as Workstream[]).map((ws) => (
              <option key={ws} value={ws}>
                {WORKSTREAM_LABELS[ws]}
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{displayedObligations.length}</span>{' '}
          {showAllObligations ? 'total obligations' : 'plan items'}
        </div>
      </div>

      {/* Today Obligations Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3 w-16 text-center">Priority</th>
                <th className="py-2.5 px-3 min-w-[260px]">Task Title & Workstream</th>
                <th className="py-2.5 px-3 w-28">Due Date</th>
                <th className="py-2.5 px-3 w-36">Status</th>
                <th className="py-2.5 px-3 min-w-[200px]">Next Action / Blocker</th>
                <th className="py-2.5 px-3 w-28">Staff</th>
                <th className="py-2.5 px-3 w-16 text-right">Est.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedObligations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">
                      No obligations matching this filter.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {showAllObligations
                        ? 'Try changing your search terms or workstream filter.'
                        : 'Your Today plan is clear! Use "Show all obligations" or check the Pipeline.'}
                    </p>
                  </td>
                </tr>
              ) : (
                displayedObligations.map((ob, idx) => {
                  const client = clientMap.get(ob.clientId);
                  const isDone = ob.status === 'Done' || ob.status === 'Not applicable';
                  const isOverdue = !isDone && ob.dueDate && ob.dueDate < melbourneToday;
                  const isP1 = ob.priority === 'P1';

                  return (
                    <tr
                      key={ob.id}
                      onClick={() => onSelectObligation(ob)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isP1 && !isDone
                          ? 'bg-amber-50/30'
                          : isOverdue
                          ? 'bg-red-50/20'
                          : ''
                      }`}
                    >
                      {/* 1. Order */}
                      <td
                        className="py-2.5 px-3 text-center text-[11px] font-mono text-slate-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {idx + 1}
                      </td>

                      {/* 2. Priority */}
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={ob.priority}
                          onChange={(e) =>
                            handlePriorityChange(ob.id, e.target.value as Priority)
                          }
                          className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                          <option value="P3">P3</option>
                        </select>
                      </td>

                      {/* 3. Task Title & Client Link */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (ob.clientId) onOpenClientDrawer(ob.clientId);
                            }}
                            className="font-bold text-slate-900 hover:text-blue-700 hover:underline cursor-pointer"
                          >
                            {client?.shortName || client?.name || 'Client'}
                          </span>
                          <span className="text-slate-400 font-light">•</span>
                          <span className="font-semibold text-slate-800">
                            {WORKSTREAM_LABELS[ob.workstream] || ob.workstream}
                          </span>
                          {ob.carryOver && (
                            <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              Carry Over
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Period: {ob.periodStart || 'Current'}
                        </div>
                      </td>

                      {/* 4. Due Date (dynamic overdue comparison against melbourneToday) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`font-mono text-xs ${
                            isOverdue
                              ? 'text-red-700 font-bold'
                              : isDone
                              ? 'text-slate-400 line-through'
                              : 'text-slate-700'
                          }`}
                        >
                          {ob.dueDate}
                        </span>
                        {isOverdue && (
                          <span className="block text-[10px] text-red-600 font-medium leading-none mt-0.5">
                            Overdue
                          </span>
                        )}
                      </td>

                      {/* 5. Status Chip & Dropdown */}
                      <td
                        className="py-2.5 px-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <StatusChip
                          status={ob.status}
                          onChange={(newStatus) =>
                            updateObligationStatus(ob.id, newStatus)
                          }
                        />
                      </td>

                      {/* 6. Next Action / Blocker */}
                      <td className="py-2.5 px-3">
                        <div className="text-slate-900 font-medium truncate max-w-xs">
                          {ob.nextAction || '—'}
                        </div>
                        {ob.blocker && (
                          <div className="text-[10px] text-red-600 font-semibold truncate max-w-xs mt-0.5">
                            Blocker: {ob.blocker}
                          </div>
                        )}
                        {ob.waitingOn && (
                          <div className="text-[10px] text-amber-700 truncate max-w-xs mt-0.5">
                            Waiting on: {ob.waitingOn}
                          </div>
                        )}
                      </td>

                      {/* 7. Staff */}
                      <td className="py-2.5 px-3 text-[11px] text-slate-600">
                        <div className="truncate font-medium">{ob.owner}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Rev: {ob.reviewer}
                        </div>
                      </td>

                      {/* 8. Estimated Minutes */}
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-500">
                        {ob.estimatedMinutes ? `${ob.estimatedMinutes}m` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
