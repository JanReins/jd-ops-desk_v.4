import { useState, useEffect, FormEvent } from 'react';
import { Obligation, Client, Priority, ObligationStatus, ALL_STATUSES, WORKSTREAM_LABELS, getTaskTitle, formatPeriod } from '@/lib/ops/types';
import { X, Save, Clock, AlertTriangle, CheckCircle2, User, Eye, Calendar } from 'lucide-react';
import { PriorityBadge } from './PriorityBadge';
import { StatusChip } from './StatusChip';

interface ObligationDetailModalProps {
  obligation: Obligation | null;
  client?: Client;
  p1Count: number;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Obligation>) => Promise<void>;
  onPriorityChange: (id: string, newPriority: Priority) => Promise<{ success: boolean; message?: string }>;
}

export function ObligationDetailModal({
  obligation,
  client,
  p1Count,
  onClose,
  onSave,
  onPriorityChange,
}: ObligationDetailModalProps) {
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [blocker, setBlocker] = useState('');
  const [waitingOn, setWaitingOn] = useState('');
  const [status, setStatus] = useState<ObligationStatus>('Not started');
  const [priority, setPriority] = useState<Priority>('P3');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [carryOver, setCarryOver] = useState(false);
  const [onTodayPlan, setOnTodayPlan] = useState(false);
  const [owner, setOwner] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (obligation) {
      setNotes(obligation.notes || '');
      setNextAction(obligation.nextAction || '');
      setBlocker(obligation.blocker || '');
      setWaitingOn(obligation.waitingOn || '');
      setStatus(obligation.status);
      setPriority(obligation.priority);
      setEstimatedMinutes(obligation.estimatedMinutes !== undefined ? obligation.estimatedMinutes : '');
      setDueDate(obligation.dueDate || '');
      setCarryOver(!!obligation.carryOver);
      setOnTodayPlan(!!obligation.onTodayPlan);
      setOwner(obligation.owner || '');
      setReviewer(obligation.reviewer || '');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [obligation]);

  if (!obligation) return null;

  const handlePrioritySelect = async (newPriority: Priority) => {
    if (newPriority === priority) return;
    const res = await onPriorityChange(obligation.id, newPriority);
    if (!res.success) {
      setErrorMsg(res.message || 'Cannot change priority');
    } else {
      setPriority(newPriority);
      setErrorMsg(null);
    }
  };

  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave(obligation.id, {
        notes,
        nextAction,
        blocker,
        waitingOn,
        status,
        dueDate,
        carryOver,
        onTodayPlan,
        owner,
        reviewer,
        estimatedMinutes: estimatedMinutes === '' ? undefined : Number(estimatedMinutes),
      });
      setSuccessMsg('Saved to local ledger');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving obligation');
    } finally {
      setSaving(false);
    }
  };

  const isP1Max = p1Count >= 3 && obligation.priority !== 'P1';

  return (
    <div
      className="fixed inset-0 z-modal overflow-y-auto bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold text-slate-500 uppercase">
                Order #{obligation.order}
              </span>
              <PriorityBadge
                priority={priority}
                onChange={handlePrioritySelect}
                p1CapacityReached={isP1Max}
              />
              <StatusChip status={status} onChange={(s) => setStatus(s)} />
              {carryOver && (
                <span className="inline-flex items-center text-2xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                  Carry Over
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {getTaskTitle(obligation, client)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Client: <strong className="text-slate-800">{client?.name || 'Unknown'}</strong>
              {obligation.entityName ? (
                <>
                  {" "}
                  · Entity: <strong className="text-slate-800">{obligation.entityName}</strong>
                </>
              ) : null}{" "}
              (Software: {client?.software || 'N/A'}) • Period: {formatPeriod(obligation.periodStart)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback banners */}
        {errorMsg && (
          <div className="px-5 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Action Row */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Next Action / Immediate Step
            </label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="e.g., JD final sign-off before electronic lodgement"
              className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Blocker & Waiting On */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Blocker (if blocked)
              </label>
              <input
                type="text"
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                placeholder="e.g. Bank feed disconnected, missing docs"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Waiting On
              </label>
              <input
                type="text"
                value={waitingOn}
                onChange={(e) => setWaitingOn(e.target.value)}
                placeholder="e.g. Client (CFO), ATO, Auditor"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Timing & Ownership Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-md border border-slate-200">
            <div>
              <label className="block text-2xs font-semibold text-slate-600 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-600 mb-1">
                Est. Minutes
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={estimatedMinutes}
                onChange={(e) =>
                  setEstimatedMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                }
                placeholder="mins"
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-600 mb-1">
                Owner
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-600 mb-1">
                Reviewer
              </label>
              <input
                type="text"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Operational Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Operational Notes & Review Log
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add client specifics, reconciliation figures, or reviewer queries..."
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Carry Over toggle */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <label className="flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                id="modal-carryover"
                checked={carryOver}
                onChange={(e) => setCarryOver(e.target.checked)}
                className="h-4 w-4 rounded border-line"
              />
              Carry over from a prior period
            </label>
            <label className="flex items-center gap-2 text-xs text-ink">
              <input
                type="checkbox"
                id="modal-today"
                checked={onTodayPlan}
                onChange={(e) => setOnTodayPlan(e.target.checked)}
                className="h-4 w-4 rounded border-line"
              />
              Pin to today's plan
            </label>
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-2xs text-slate-400">
              Workstream: {WORKSTREAM_LABELS[obligation.workstream]}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-accent hover:bg-accent-mid text-xs font-semibold text-accent-fg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? 'Saving...' : 'Save Notes & Status'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
