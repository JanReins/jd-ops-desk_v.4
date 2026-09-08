import { useMemo, useState } from "react";
import { History, Pin } from "lucide-react";
import type { Client, Obligation } from "@/lib/ops/types";
import { formatPeriod, WORKSTREAM_LABELS } from "@/lib/ops/types";
import { daysOverdue, formatAuShort } from "@/lib/ops/dates";
import {
  BACKLOG_PREVIEW,
  getCourt,
  groupBacklogByPeriod,
} from "@/lib/ops/todaySet";

interface BacklogStripProps {
  items: Obligation[];
  mineCount: number;
  overdueCount: number;
  leftoverCount: number;
  clientMap: Map<string, Client>;
  melbourneToday: string;
  onSelectObligation: (obligation: Obligation) => void;
  onPin: (id: string) => void;
}

export function BacklogStrip({
  items,
  mineCount,
  overdueCount,
  leftoverCount,
  clientMap,
  melbourneToday,
  onSelectObligation,
  onPin,
}: BacklogStripProps) {
  const [expanded, setExpanded] = useState(false);
  const groups = useMemo(() => {
    const source = expanded || items.length <= BACKLOG_PREVIEW
      ? items
      : items.slice(0, BACKLOG_PREVIEW);
    return groupBacklogByPeriod(source);
  }, [expanded, items]);

  if (items.length === 0) return null;

  const title =
    leftoverCount > 0 && overdueCount > 0
      ? "Backlog — overdue and leftover"
      : leftoverCount > 0
        ? "Backlog — leftover from prior months"
        : "Backlog — overdue, not on plan";

  return (
    <div
      id="today-backlog"
      className="rounded-lg border border-danger/30 bg-danger-soft/40 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-danger">
            <History className="h-3.5 w-3.5" />
            {title}
          </p>
          <p className="mt-0.5 text-2xs text-muted">
            {items.length} off the sitting · {mineCount} my court. Pin only what you will sit.
          </p>
        </div>
        <span className="shrink-0 text-2xs text-subtle">{items.length}</span>
      </div>
      <div className="mt-2 space-y-2.5">
        {groups.map((group) => (
          <div key={group.period || "none"}>
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wider text-muted">
              {group.period ? formatPeriod(group.period) : "No period"} · {group.items.length}
            </p>
            <div className="space-y-1.5">
              {group.items.map((ob) => {
                const client = clientMap.get(ob.clientId);
                const late = daysOverdue(ob.dueDate, melbourneToday);
                const watching = getCourt(ob.status) === "theirs";
                return (
                  <div
                    key={ob.id}
                    className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectObligation(ob)}
                      className="min-w-0 text-left"
                    >
                      <div className="truncate text-xs font-semibold text-ink">
                        {ob.nextAction || ob.taskLabel || WORKSTREAM_LABELS[ob.workstream]}
                      </div>
                      <div className="truncate text-2xs text-muted">
                        {client?.shortName}
                        {ob.dueDate ? ` · ${formatAuShort(ob.dueDate)}` : ""}
                        {late > 0 ? ` · ${late}d overdue` : ""}
                        {watching ? " · watching" : ""}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPin(ob.id)}
                      className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-line bg-paper px-2 text-2xs font-semibold text-ink hover:border-accent hover:text-accent"
                    >
                      <Pin className="h-3 w-3" />
                      Pin
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {items.length > BACKLOG_PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-2xs font-semibold text-danger hover:underline"
        >
          {expanded ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}
