import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { useData } from "@/lib/ops/data-context";
import { formatAuShort, getMelbourneToday } from "@/lib/ops/dates";
import { thisWeekBookWork } from "@/lib/ops/obligationGenerator";
import { isOpenStatus } from "@/lib/ops/todaySet";
import { cn } from "@/lib/utils";

export function MondayStart() {
  const { clients, obligations, openThisWeekBooks } = useData();
  const today = useMemo(() => getMelbourneToday(), []);
  const work = useMemo(() => thisWeekBookWork(clients, obligations, today), [clients, obligations, today]);
  const [open, setOpen] = useState(false);
  const [pinIds, setPinIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  if (!work || work.rows.length === 0) return null;

  const missing = work.rows.filter((r) => !r.existing).length;
  const openCells = work.rows.filter((r) => r.existing && isOpenStatus(r.existing.status)).length;

  const togglePin = (clientId: string) => {
    setPinIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await openThisWeekBooks(
        work.rows.map((r) => ({ clientId: r.client.id, pin: pinIds.has(r.client.id) })),
      );
      setOpen(false);
      setPinIds(new Set());
      setFlash(
        `${res.weekCode}: opened ${res.created} cell${res.created === 1 ? "" : "s"}, pinned ${res.pinned}`,
      );
      setTimeout(() => setFlash(null), 3500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-paper"
      >
        <BookOpen className="h-3.5 w-3.5" />
        Open {work.week.weekCode}
      </button>
      {flash && <span className="text-2xs font-medium text-accent">{flash}</span>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold text-ink">Open this week's books</h3>
              <p className="mt-0.5 text-2xs text-muted">
                {work.week.weekCode} · week of {formatAuShort(work.week.weekStart)}. Creates missing
                cells. Tick pin for the ones you will sit today. Monthly books only on the last week.
              </p>
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-4 py-2">
              <p className="mb-2 text-2xs text-muted">
                {work.rows.length} clients · {missing} missing · {openCells} already open
              </p>
              <ul className="space-y-1">
                {work.rows.map((row) => {
                  const done = row.existing && !isOpenStatus(row.existing.status);
                  return (
                    <li
                      key={row.client.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-line bg-paper px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-ink">
                          {row.client.shortName}
                        </div>
                        <div className="text-2xs text-muted">
                          {row.monthlyOnly ? "Month-end" : "Weekly"}
                          {done
                            ? " · already done"
                            : row.existing
                              ? ` · ${row.existing.status}`
                              : " · will create"}
                        </div>
                      </div>
                      <label
                        className={cn(
                          "inline-flex min-h-8 items-center gap-1 text-2xs font-semibold",
                          done ? "text-subtle" : "text-ink",
                        )}
                      >
                        <input
                          type="checkbox"
                          disabled={Boolean(done)}
                          checked={pinIds.has(row.client.id)}
                          onChange={() => togglePin(row.client.id)}
                          className="h-3.5 w-3.5"
                        />
                        Pin
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-10 rounded-md border border-line px-3 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirm()}
                className="min-h-10 rounded-md bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-mid disabled:opacity-50"
              >
                {busy ? "Opening…" : "Open week"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
