import { useState } from "react";
import { Repeat } from "lucide-react";
import { useData } from "@/lib/ops/data-context";
import { WORKSTREAM_LABELS } from "@/lib/ops/types";
import { nextDueForTemplate, templateAlreadyOpen } from "@/lib/ops/templates";
import { formatAuShort } from "@/lib/ops/dates";

export function TemplatesPanel() {
  const { templates, clients, obligations, spawnTemplate } = useData();
  const [msg, setMsg] = useState<string | null>(null);
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  return (
    <section className="rounded-lg border border-line bg-surface p-3.5 shadow-xs">
      <div className="mb-2">
        <h3 className="text-xs font-semibold tracking-tight text-ink">Recurring templates</h3>
        <p className="text-2xs text-muted">
          Spawn the next cycle without opening a cell. Service rows still generate from the client.
        </p>
      </div>
      {msg && <p className="mb-2 text-2xs font-medium text-accent">{msg}</p>}
      {templates.length === 0 ? (
        <p className="text-2xs text-subtle italic">No saved recurring templates.</p>
      ) : (
        <ul className="space-y-1.5">
          {templates.map((tpl) => {
            const due = nextDueForTemplate(tpl);
            const open = templateAlreadyOpen(tpl, obligations, due);
            const client = clientMap.get(tpl.clientId);
            return (
              <li
                key={tpl.id}
                className="flex items-center justify-between gap-2 rounded-md border border-line bg-paper px-2 py-1.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-ink">{tpl.taskLabel}</div>
                  <div className="truncate text-2xs text-muted">
                    {client?.shortName || "Practice"} · {WORKSTREAM_LABELS[tpl.workstream]} · {tpl.cadence} ·{" "}
                    {formatAuShort(due)}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={open}
                  onClick={async () => {
                    const res = await spawnTemplate(tpl.id);
                    setMsg(res.message);
                    setTimeout(() => setMsg(null), 2500);
                  }}
                  className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md border border-line px-2 text-2xs font-semibold text-ink hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  <Repeat className="h-3 w-3" />
                  {open ? "Open" : "Spawn"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
