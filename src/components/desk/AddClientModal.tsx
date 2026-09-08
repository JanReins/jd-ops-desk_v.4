import { useState, FormEvent } from 'react';
import { ClientServices, SERVICE_LABELS } from '@/lib/ops/types';
import { X, Plus, Building2 } from 'lucide-react';

interface AddClientModalProps {
  onClose: () => void;
  onAdd: (data: {
    name: string;
    shortName: string;
    software: string;
    junior: string;
    senior: string;
    manager: string;
    services: ClientServices;
    maDueDay: number;
    notes: string;
  }) => Promise<string>;
}

export function AddClientModal({ onClose, onAdd }: AddClientModalProps) {
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [software, setSoftware] = useState('Xero');
  const [junior, setJunior] = useState('Jan');
  const [senior, setSenior] = useState('');
  const [manager, setManager] = useState('');
  const [maDueDay, setMaDueDay] = useState<number>(20);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [services, setServices] = useState<ClientServices>({
    monthlyBAS: false,
    twoMonthlyIAS: false,
    quarterlyBAS: true,
    weeklyBooks: false,
    monthlyBooks: true,
    paymentRun: false,
    managementReports: true,
    payrollTax: false,
    stp: true,
  });

  const handleToggle = (key: keyof ClientServices) => {
    setServices((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Client legal/trading name is required');
      return;
    }
    const computedShortName = shortName.trim() || name.split(' ')[0];

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onAdd({
        name: name.trim(),
        shortName: computedShortName,
        software,
        junior,
        senior,
        manager,
        services,
        maDueDay: Number(maDueDay),
        notes,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error adding client');
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
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">Add New Client</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Client Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apex Dynamics Pty Ltd"
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Short Name / Code</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. Apex"
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">General Ledger Software</label>
              <select
                value={software}
                onChange={(e) => setSoftware(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="Xero">Xero</option>
                <option value="MYOB">MYOB</option>
                <option value="QuickBooks Online">QuickBooks Online</option>
                <option value="NetSuite">NetSuite</option>
                <option value="Sage">Sage</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">MA Due Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={maDueDay}
                onChange={(e) => setMaDueDay(parseInt(e.target.value, 10))}
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Junior</label>
              <input
                type="text"
                value={junior}
                onChange={(e) => setJunior(e.target.value)}
                placeholder="Jan"
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Senior</label>
              <input
                type="text"
                value={senior}
                onChange={(e) => setSenior(e.target.value)}
                placeholder="Sam Taylor"
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Manager</label>
              <input
                type="text"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Contracted Services</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(SERVICE_LABELS) as (keyof ClientServices)[]).map((key) => {
                const active = services[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggle(key)}
                    className={`px-2 py-1 rounded border text-left text-2xs transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-700 border-blue-700 text-accent-fg font-semibold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {SERVICE_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Operational Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Initial onboarding notes, key client contacts..."
              className="w-full rounded border border-slate-300 p-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
            />
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
              <span>{submitting ? 'Adding...' : 'Add Client'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
