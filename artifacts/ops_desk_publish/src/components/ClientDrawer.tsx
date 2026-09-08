import { useState, useMemo } from 'react';
import {
  Client,
  Obligation,
  ClientServices,
  SERVICE_LABELS,
  getTaskTitle,
  ObligationStatus,
  WORKSTREAM_LABELS,
} from '../types';
import { StatusChip } from './StatusChip';
import { PriorityBadge } from './PriorityBadge';
import {
  X,
  FileText,
  Plus,
  Save,
  Layers,
  CalendarPlus,
  CheckCircle2,
} from 'lucide-react';
import {
  getMelbourneCurrentPeriod,
  getNextMonthPeriod,
  formatMelbourneMonthYear,
} from '../utils/dates';
import { generateNextMonthCandidates, CandidateObligation } from '../utils/obligationGenerator';
import { useData } from '../context/DataContext';

interface ClientDrawerProps {
  client: Client | null;
  obligations: Obligation[];
  p1Count: number;
  onClose: () => void;
  onUpdateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  onUpdateObligationStatus: (id: string, status: ObligationStatus) => Promise<void>;
  onSelectObligation: (obligation: Obligation) => void;
  onAddObligationForClient: (clientId: string) => void;
}

export function ClientDrawer({
  client,
  obligations,
  onClose,
  onUpdateClient,
  onUpdateObligationStatus,
  onSelectObligation,
  onAddObligationForClient,
}: ClientDrawerProps) {
  if (!client) return null;

  const { batchCreateObligations, clients } = useData();

  const [notes, setNotes] = useState(client.notes || '');
  const [maDueDay, setMaDueDay] = useState(client.maDueDay || 15);
  const [services, setServices] = useState<ClientServices>({ ...client.services });
  const [software, setSoftware] = useState(client.software || 'Xero');
  const [junior, setJunior] = useState(client.junior || '');
  const [senior, setSenior] = useState(client.senior || '');
  const [manager, setManager] = useState(client.manager || 'JD');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Client "Open next month" confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    targetPeriod: string;
    candidates: CandidateObligation[];
    creating: boolean;
  }>({
    open: false,
    targetPeriod: '',
    candidates: [],
    creating: false,
  });
  const [nextMonthSuccess, setNextMonthSuccess] = useState<string | null>(null);

  const clientObligations = obligations.filter((o) => o.clientId === client.id);
  const openObligations = clientObligations.filter(
    (o) => o.status !== 'Done' && o.status !== 'Not applicable'
  );
  const completedObligations = clientObligations.filter((o) => o.status === 'Done');

  // Next Melbourne month
  const nextMelbournePeriod = useMemo(() => {
    return getNextMonthPeriod(getMelbourneCurrentPeriod());
  }, []);

  const handleToggleService = (key: keyof ClientServices) => {
    setServices((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveClientDetails = async () => {
    setSaving(true);
    try {
      await onUpdateClient(client.id, {
        notes,
        maDueDay: Number(maDueDay),
        services,
        software,
        junior,
        senior,
        manager,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving client details:', err);
    } finally {
      setSaving(false);
    }
  };

  // Open confirmation preview modal instead of writing immediately
  const handleOpenNextMonthClick = () => {
    const candidates = generateNextMonthCandidates(
      clients,
      obligations,
      nextMelbournePeriod,
      client.id
    );
    setConfirmModal({
      open: true,
      targetPeriod: nextMelbournePeriod,
      candidates,
      creating: false,
    });
  };

  // Confirm and batch write obligations
  const handleConfirmCreateNextMonth = async () => {
    setConfirmModal((prev) => ({ ...prev, creating: true }));
    try {
      const count = await batchCreateObligations(confirmModal.candidates);
      setConfirmModal({ open: false, targetPeriod: '', candidates: [], creating: false });
      setNextMonthSuccess(
        `Created ${count} new obligations for ${formatMelbourneMonthYear(nextMelbournePeriod)}.`
      );
      setTimeout(() => setNextMonthSuccess(null), 5000);
    } catch (err: unknown) {
      setConfirmModal((prev) => ({ ...prev, creating: false }));
      const msg = err instanceof Error ? err.message : 'Failed to generate next month';
      alert(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                  {client.shortName}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {client.software}
                </span>
                <span className="text-xs text-slate-500">
                  MA Due: Day {client.maDueDay || '15'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {client.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Team allocation pills */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Junior</span>
              <p className="font-semibold text-slate-800">{client.junior || 'Unassigned'}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Senior</span>
              <p className="font-semibold text-slate-800">{client.senior || 'Unassigned'}</p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Manager</span>
              <p className="font-semibold text-slate-800">{client.manager || 'JD'}</p>
            </div>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Services Matrix Section */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                Contracted Services
              </h3>
              <span className="text-[11px] text-slate-500">
                {Object.values(services).filter(Boolean).length} of 9 active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(SERVICE_LABELS) as (keyof ClientServices)[]).map((key) => {
                const isActive = services[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleService(key)}
                    className={`flex items-center justify-between p-2 rounded border text-left text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-white border-blue-300 text-blue-900 font-semibold shadow-xs'
                        : 'bg-slate-100/60 border-slate-200 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate mr-1">{SERVICE_LABELS[key]}</span>
                    <span
                      className={`h-4 w-4 rounded flex items-center justify-center shrink-0 text-[10px] ${
                        isActive
                          ? 'bg-blue-700 text-white'
                          : 'border border-slate-300 bg-white text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Client Operational Notes */}
          <div className="rounded-lg border border-slate-200 p-4 bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                Firm Operational Notes
              </label>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Operational peculiarities, lodgement nuances, client contacts..."
              className="w-full rounded border border-slate-300 p-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleSaveClientDetails}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-blue-700 hover:bg-blue-800 text-[11px] font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Save className="h-3 w-3" />
                <span>{saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Notes & Services'}</span>
              </button>
            </div>
          </div>

          {/* Client Obligations Section */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Open Obligations ({openObligations.length})
                </h3>
                {completedObligations.length > 0 && (
                  <span className="text-[11px] text-slate-500">
                    ({completedObligations.length} done)
                  </span>
                )}
              </div>

              {/* Smaller control on Clients drawer: Open next month + Add Obligation */}
              <div className="flex items-center gap-1.5">
                <button
                  id="open-next-month-client-btn"
                  type="button"
                  onClick={handleOpenNextMonthClick}
                  title={`Open obligations for ${formatMelbourneMonthYear(nextMelbournePeriod)}`}
                  className="flex items-center gap-1 px-2.5 py-1 rounded border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer shadow-xs"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  <span>Open {formatMelbourneMonthYear(nextMelbournePeriod)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onAddObligationForClient(client.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-600" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {nextMonthSuccess && (
              <div className="mb-3 rounded-md border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{nextMonthSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNextMonthSuccess(null)}
                  className="text-emerald-700 font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {openObligations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-slate-500 text-xs">
                No active open obligations for this client.
              </div>
            ) : (
              <div className="space-y-2">
                {openObligations.map((ob) => (
                  <div
                    key={ob.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
                    onClick={() => onSelectObligation(ob)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <PriorityBadge priority={ob.priority} disabled />
                        <span className="font-semibold text-slate-900 text-xs">
                          {getTaskTitle(ob, client)}
                        </span>
                        {ob.carryOver && (
                          <span className="text-[10px] font-semibold px-1 rounded bg-amber-100 text-amber-800">
                            Carry
                          </span>
                        )}
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <StatusChip
                          status={ob.status}
                          onChange={(s) => onUpdateObligationStatus(ob.id, s)}
                        />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-3">
                        <span>Due: <strong className="text-slate-700">{ob.dueDate}</strong></span>
                        {ob.estimatedMinutes && (
                          <span>Est: <strong className="text-slate-700">{ob.estimatedMinutes}m</strong></span>
                        )}
                      </div>
                      <span className="text-slate-400">Owner: {ob.owner || '—'}</span>
                    </div>

                    {ob.nextAction && (
                      <div className="mt-1.5 text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate">
                        <strong className="text-slate-700">Next:</strong> {ob.nextAction}
                      </div>
                    )}

                    {ob.blocker && (
                      <div className="mt-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <strong>Blocker:</strong> {ob.blocker}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Completed Section */}
            {completedObligations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Completed Obligations ({completedObligations.length})
                </span>
                <div className="space-y-1.5">
                  {completedObligations.map((ob) => (
                    <div
                      key={ob.id}
                      onClick={() => onSelectObligation(ob)}
                      className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs text-slate-500 hover:bg-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="line-through">{getTaskTitle(ob, client)}</span>
                      </div>
                      <span className="text-emerald-700 text-[11px] font-semibold shrink-0">
                        Done ✓
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Preview Modal for Client Drawer */}
      {confirmModal.open && (
        <div
          className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            if (!confirmModal.creating) {
              setConfirmModal({ open: false, targetPeriod: '', candidates: [], creating: false });
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
                  Open {formatMelbourneMonthYear(confirmModal.targetPeriod)} — {client.shortName}
                </h3>
              </div>
              <button
                type="button"
                disabled={confirmModal.creating}
                onClick={() =>
                  setConfirmModal({ open: false, targetPeriod: '', candidates: [], creating: false })
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
                    for period{' '}
                    <strong className="font-bold">{formatMelbourneMonthYear(confirmModal.targetPeriod)}</strong>{' '}
                    for <strong className="font-bold">{client.name}</strong> based on active service agreements.
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100 bg-slate-50/50">
                    {confirmModal.candidates.map((cand, i) => (
                      <div key={i} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {WORKSTREAM_LABELS[cand.workstream] || cand.workstream}
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
                    No new obligations need to be generated for this client in {formatMelbourneMonthYear(confirmModal.targetPeriod)}.
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
                        ? 'Creating...'
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
