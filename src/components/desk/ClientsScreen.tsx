import { useState, useMemo } from 'react';
import { useData } from '@/lib/ops/data-context';
import { Client, ClientServices, SERVICE_LABELS } from '@/lib/ops/types';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { AddClientModal } from './AddClientModal';
import { CLIENT_LOAD_MINUTES, clientMonthLoad } from '@/lib/ops/todaySet';
import { getMelbourneCurrentPeriod, getMelbourneToday } from '@/lib/ops/dates';
import { isMetkaClient, METKA_ENTITIES } from '@/lib/ops/metka';

interface ClientsScreenProps {
  onSelectClient: (clientId: string) => void;
}

export function ClientsScreen({ onSelectClient }: ClientsScreenProps) {
  const { clients, obligations, addClient } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [hideInactive, setHideInactive] = useState(true);

  // Map open obligations per client
  const currentPeriod = getMelbourneCurrentPeriod();
  const melbourneToday = getMelbourneToday();

  const obligationsPerClient = useMemo(() => {
    const map = new Map<string, { total: number; open: number; p1: number }>();
    clients.forEach((c) => map.set(c.id, { total: 0, open: 0, p1: 0 }));

    obligations.forEach((o) => {
      if (o.workstream === "metka_bas") return;
      const entry = map.get(o.clientId) || { total: 0, open: 0, p1: 0 };
      entry.total += 1;
      if (o.status !== "Done" && o.status !== "Not applicable") {
        entry.open += 1;
        if (o.priority === "P1") entry.p1 += 1;
      }
      map.set(o.clientId, entry);
    });

    return map;
  }, [clients, obligations]);

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clients.filter((c) => {
      if (hideInactive && c.inactive) return false;
      if (!q) return true;
      const entityHit =
        isMetkaClient(c.id) &&
        METKA_ENTITIES.some(
          (e) => e.name.toLowerCase().includes(q) || e.shortName.toLowerCase().includes(q),
        );
      return (
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.software.toLowerCase().includes(q) ||
        (c.junior || '').toLowerCase().includes(q) ||
        (c.senior || '').toLowerCase().includes(q) ||
        (c.manager || '').toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q) ||
        entityHit
      );
    });
  }, [clients, searchQuery, hideInactive]);

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="rounded-lg border border-line bg-surface p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">Clients</h1>
            <p className="mt-0.5 text-xs text-muted">
              Master list · this month load is Jan's open minutes. Team open is shown quieter.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients, software, staff..."
                className="min-h-9 w-full rounded-md border border-line bg-raised pl-8 pr-2.5 text-xs text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setHideInactive((v) => !v)}
              className={`min-h-9 rounded-md border px-3 text-xs font-medium ${
                hideInactive
                  ? "border-line bg-raised text-muted"
                  : "border-accent/30 bg-accent-soft text-accent"
              }`}
            >
              {hideInactive ? "Inactive hidden" : "Showing inactive"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex min-h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-mid"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add client</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {filteredClients.map((client) => {
          const obStats = obligationsPerClient.get(client.id) || { total: 0, open: 0, p1: 0 };
          const load = clientMonthLoad(client.id, obligations, currentPeriod, melbourneToday);
          return (
            <button
              key={client.id}
              type="button"
              onClick={() => onSelectClient(client.id)}
              className="w-full rounded-lg border border-line bg-surface p-3 text-left shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-ink">{client.shortName}</div>
                  <div className="text-2xs text-muted">{client.name}</div>
                </div>
                <span className="rounded border border-line bg-paper px-1.5 py-0.5 text-2xs font-medium text-muted">
                  {client.software}
                </span>
              </div>
              <div className="mt-2 text-2xs text-muted">
                {client.junior || "—"} / {client.senior || "—"} / {client.manager || "—"}
              </div>
              <div className="mt-1 text-2xs text-ink">
                {load.open} Jan
                {load.packCells > 0 ? ` · pack ${load.packCells}` : ""}
                {load.minutes > 0 ? ` · ${(load.minutes / 60).toFixed(1)}h` : ""}
                {load.teamOpen > 0 ? ` · team ${load.teamOpen}` : ""}
                {obStats.p1 > 0 ? ` · ${obStats.p1} P1` : ""}
              </div>
              {(load.minutes > 0 || load.teamMinutes > 0) && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-paper">
                  <div
                    className={`h-full ${load.minutes > CLIENT_LOAD_MINUTES ? "bg-warn" : "bg-accent"}`}
                    style={{ width: `${Math.min(100, Math.round((load.minutes / CLIENT_LOAD_MINUTES) * 100))}%` }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop Dense Table */}
      <div className="hidden overflow-hidden rounded-lg border border-line bg-surface shadow-xs md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-2xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 min-w-[200px]">Client / Short Name</th>
                <th className="py-2.5 px-4 w-32">Software</th>
                <th className="py-2.5 px-4 w-44">Staff Allocation</th>
                <th className="py-2.5 px-4 w-28">MA / folder</th>
                <th className="py-2.5 px-4 min-w-[280px]">Active Services</th>
                <th className="py-2.5 px-4 w-32 text-center">Open Obligations</th>
                <th className="py-2.5 px-4 w-36">This month load</th>
                <th className="py-2.5 px-4 w-24 text-right">Drawer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No clients match your search.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const obStats = obligationsPerClient.get(client.id) || {
                    total: 0,
                    open: 0,
                    p1: 0,
                  };
                  const load = clientMonthLoad(client.id, obligations, currentPeriod, melbourneToday);
                  const activeServicesCount = Object.values(client.services).filter(Boolean).length;

                  return (
                    <tr
                      key={client.id}
                      onClick={() => onSelectClient(client.id)}
                      className="group hover:bg-slate-50/90 transition-colors cursor-pointer"
                    >
                      {/* Name & Short Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                            {client.shortName}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {client.name}
                            </span>
                            {client.notes && (
                              <p className="text-2xs text-slate-400 truncate max-w-[280px] mt-0.5">
                                {client.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Software */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {client.software}
                        </span>
                      </td>

                      {/* Staff */}
                      <td className="py-3 px-4">
                        <div className="text-2xs space-y-0.5">
                          <div>
                            <span className="text-slate-400">Mgr:</span>{' '}
                            <strong className="text-slate-800">{client.manager || 'JD'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">Team:</span>{' '}
                            <span className="text-slate-600">
                              {client.senior || '—'}, {client.junior || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* MA Due Day */}
                      <td className="py-3 px-4">
                        {client.services.managementReports && client.maDueDay ? (
                          <span className="font-mono text-xs font-semibold text-ink">Day {client.maDueDay}</span>
                        ) : (
                          <span className="text-2xs text-subtle">—</span>
                        )}
                        {client.folderStatus && (
                          <span className="block text-2xs text-muted">Folder: {client.folderStatus}</span>
                        )}
                        {client.inactive && (
                          <span className="mt-0.5 inline-block rounded border border-line px-1 text-2xs text-subtle">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Active Services Badges */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[380px]">
                          {(Object.keys(client.services) as (keyof ClientServices)[])
                            .filter((k) => client.services[k])
                            .slice(0, 4)
                            .map((k) => (
                              <span
                                key={k}
                                className="text-2xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {SERVICE_LABELS[k]}
                              </span>
                            ))}
                          {activeServicesCount > 4 && (
                            <span className="text-2xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-semibold">
                              +{activeServicesCount - 4} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Open Obligations */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-semibold text-xs px-2 py-0.5 rounded ${
                              obStats.open > 0
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {obStats.open} open
                          </span>
                          {obStats.p1 > 0 && (
                            <span
                              className="text-2xs font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200"
                              title={`${obStats.p1} P1 obligations`}
                            >
                              {obStats.p1} P1
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-2xs tabular-nums text-ink">
                          {(load.minutes / 60).toFixed(1)}h Jan
                          {load.open > 0 ? ` · ${load.open}` : ""}
                          {load.packCells > 0 ? ` · pack ${load.packCells}` : ""}
                          {load.overdue > 0 ? ` · ${load.overdue} late` : ""}
                        </div>
                        {load.teamOpen > 0 && (
                          <div className="text-2xs text-subtle">
                            team {(load.teamMinutes / 60).toFixed(1)}h · {load.teamOpen} open
                          </div>
                        )}
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-paper">
                          <div
                            className={`h-full ${load.minutes > CLIENT_LOAD_MINUTES ? "bg-warn" : "bg-accent"}`}
                            style={{
                              width: `${Math.min(100, Math.round((load.minutes / CLIENT_LOAD_MINUTES) * 100))}%`,
                            }}
                          />
                        </div>
                      </td>

                      {/* Drawer link */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-slate-500 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all cursor-pointer"
                        >
                          <span>Drawer</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddClientModal onClose={() => setShowAddModal(false)} onAdd={addClient} />
      )}
    </div>
  );
}
