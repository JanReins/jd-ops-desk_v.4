import { useState, FormEvent } from 'react';
import { Client, Workstream, Priority, ObligationStatus, WORKSTREAM_LABELS, ALL_STATUSES } from '@/lib/ops/types';
import { getMelbourneCurrentPeriod, getMelbourneToday } from '@/lib/ops/dates';
import { X, Plus, AlertCircle } from 'lucide-react';

interface AddObligationModalProps {
  clients: Client[];
  initialClientId?: string;
  p1Count: number;
  onClose: () => void;
  onAdd: (data: {
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
    carryOver?: boolean;
    onTodayPlan?: boolean;
    taskLabel?: string;
    notes?: string;
  }) => Promise<string>;
}

export function AddObligationModal({
  clients,
  initialClientId,
  p1Count,
  onClose,
  onAdd,
}: AddObligationModalProps) {
  const [clientId, setClientId] = useState(initialClientId || (clients[0]?.id ?? ''));
  const [workstream, setWorkstream] = useState<Workstream>('bas_ias');
  const [periodStart, setPeriodStart] = useState(getMelbourneCurrentPeriod());
  const [dueDate, setDueDate] = useState(getMelbourneToday());
  const [status, setStatus] = useState<ObligationStatus>('Not started');
  const [priority, setPriority] = useState<Priority>('P2');
  const [owner, setOwner] = useState('Jan');
  const [reviewer, setReviewer] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [blocker, setBlocker] = useState('');
  const [waitingOn, setWaitingOn] = useState('');
  const [recurring, setRecurring] = useState(true);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>(45);
  const [carryOver, setCarryOver] = useState(false);
  const [onTodayPlan, setOnTodayPlan] = useState(true);
  const [taskLabel, setTaskLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setErrorMsg('Please select a client');
      return;
    }
    if (priority === 'P1' && p1Count >= 3) {
      setErrorMsg('Max three P1 obligations allowed. Please choose P2 or P3.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onAdd({
        clientId,
        workstream,
        periodStart,
        dueDate,
        status,
        owner,
        reviewer,
        priority,
        nextAction,
        blocker,
        waitingOn,
        recurring,
        estimatedMinutes: estimatedMinutes === '' ? undefined : Number(estimatedMinutes),
        order: Date.now() % 1000,
        carryOver,
        onTodayPlan,
        taskLabel: taskLabel.trim() || undefined,
        notes,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to add obligation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-modal overflow-y-auto bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">New Obligation</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortName} ({c.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Workstream</label>
              <select
                value={workstream}
                onChange={(e) => setWorkstream(e.target.value as Workstream)}
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {(Object.keys(WORKSTREAM_LABELS) as Workstream[]).map((w) => (
                  <option key={w} value={w}>
                    {WORKSTREAM_LABELS[w]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Period Start</label>
              <input
                type="text"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                placeholder="2026-08-01"
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Priority {p1Count >= 3 && <span className="text-red-600 font-normal">(P1 full)</span>}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="P1" disabled={p1Count >= 3}>
                  P1 (Urgent - max 3)
                </option>
                <option value="P2">P2 (High)</option>
                <option value="P3">P3 (Routine)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ObligationStatus)}
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reviewer</label>
              <input
                type="text"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Task</label>
            <input
              type="text"
              value={taskLabel}
              onChange={(e) => setTaskLabel(e.target.value)}
              placeholder="e.g. Prepare August BAS"
              className="w-full rounded border border-line bg-raised p-1.5 text-xs text-ink focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Next Action</label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g., Reconcile bank feeds & verify payroll"
              className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Est. Minutes</label>
              <input
                type="number"
                min="0"
                step="5"
                value={estimatedMinutes}
                onChange={(e) =>
                  setEstimatedMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-4 pt-5">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onTodayPlan}
                  onChange={(e) => setOnTodayPlan(e.target.checked)}
                  className="rounded border-line"
                />
                <span className="font-medium text-ink">Pin to today</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={carryOver}
                  onChange={(e) => setCarryOver(e.target.checked)}
                  className="rounded border-line"
                />
                <span className="font-medium text-ink">Carry over</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="rounded border-line"
                />
                <span className="font-medium text-ink">Recurring</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-accent hover:bg-accent-mid text-xs font-semibold text-accent-fg disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{submitting ? 'Creating...' : 'Create Obligation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
