import { useMemo, useState } from "react";
import type { Client, Obligation } from "@/lib/ops/types";
import { WORKSTREAM_LABELS } from "@/lib/ops/types";
import { addDays, startOfWeekMonday } from "@/lib/ops/dates";
import { getCourt, isOpenStatus, isTodayObligation } from "@/lib/ops/todaySet";
import { cn } from "@/lib/utils";
import { Pin } from "lucide-react";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekStrip({
  obligations,
  melbourneToday,
  clients,
  onSelectObligation,
  onPin,
}: {
  obligations: Obligation[];
  melbourneToday: string;
  clients: Client[];
  onSelectObligation: (o: Obligation) => void;
  onPin: (id: string) => void;
}) {
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const [selected, setSelected] = useState(melbourneToday);

  const days = useMemo(() => {
    const start = startOfWeekMonday(melbourneToday);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      const due = obligations.filter((o) => isOpenStatus(o.status) && o.dueDate === date);
      const late =
        date === melbourneToday
          ? obligations.filter(
              (o) =>
                isOpenStatus(o.status) &&
                isTodayObligation(o) &&
                o.dueDate &&
                o.dueDate < melbourneToday,
            )
          : [];
      const items = date === melbourneToday ? [...late, ...due.filter((o) => !late.includes(o))] : due;
      return {
        date,
        label: DAY_NAMES[i],
        dayNum: Number(date.slice(8, 10)),
        items,
        p1: items.filter((o) => o.priority === "P1").length,
        lateCount: late.length,
        isToday: date === melbourneToday,
        isWeekend: i >= 5,
      };
    });
  }, [obligations, melbourneToday]);

  const selectedDay = days.find((d) => d.date === selected) || days.find((d) => d.isToday);

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Week diary</p>
          <p className="text-2xs text-subtle">
            Books on Monday · mid run on the 15th · EOM on month-end. Click a day.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            onClick={() => setSelected(d.date)}
            className={cn(
              "rounded-lg border px-1 py-2 text-center sm:px-2",
              d.date === selected
                ? "border-accent bg-accent-soft"
                : d.isToday
                  ? "border-accent/40 bg-surface"
                  : "border-line bg-surface",
              d.isWeekend && "opacity-70",
            )}
          >
            <div className="text-2xs font-semibold uppercase tracking-wider text-muted">{d.label}</div>
            <div
              className={cn(
                "mt-0.5 font-mono text-sm font-semibold tabular-nums",
                d.date === selected || d.isToday ? "text-accent" : "text-ink",
              )}
            >
              {d.dayNum}
            </div>
            <div className="mt-1 text-2xs tabular-nums text-muted">
              {d.items.length > 0 ? d.items.length : "—"}
            </div>
            {d.lateCount > 0 && (
              <div className="mt-0.5 text-2xs font-semibold text-danger">{d.lateCount} late</div>
            )}
          </button>
        ))}
      </div>

      <div className="hidden gap-1.5 md:grid md:grid-cols-5">
        {days.slice(0, 5).map((d) => (
          <div
            key={`col-${d.date}`}
            className={cn(
              "min-h-[120px] rounded-lg border p-1.5",
              d.date === selected ? "border-accent bg-accent-soft/40" : "border-line bg-surface",
            )}
          >
            <div className="mb-1 flex items-center justify-between px-0.5">
              <span className="text-2xs font-semibold text-muted">
                {d.label} {d.dayNum}
              </span>
              {d.p1 > 0 && <span className="text-2xs font-semibold text-warn">{d.p1} P1</span>}
            </div>
            <div className="space-y-1">
              {d.items.slice(0, 5).map((ob) => {
                const client = clientMap.get(ob.clientId);
                const court = getCourt(ob.status);
                return (
                  <button
                    key={ob.id}
                    type="button"
                    onClick={() => onSelectObligation(ob)}
                    className={cn(
                      "w-full rounded-md border px-1.5 py-1 text-left",
                      court === "theirs" ? "border-warn/30 bg-warn-soft/50" : "border-line bg-paper",
                    )}
                  >
                    <div className="truncate text-2xs font-semibold text-ink">
                      {ob.nextAction || ob.taskLabel || WORKSTREAM_LABELS[ob.workstream]}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-2xs text-muted">{client?.shortName}</span>
                      {!isTodayObligation(ob) && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPin(ob.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") onPin(ob.id);
                          }}
                          className="text-accent"
                          title="Pin to today"
                        >
                          <Pin className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {d.items.length > 5 && (
                <div className="px-1 text-2xs text-subtle">+{d.items.length - 5} more</div>
              )}
              {d.items.length === 0 && <div className="px-1 py-3 text-center text-2xs text-subtle">Clear</div>}
            </div>
          </div>
        ))}
      </div>

      {selectedDay && (
        <div className="space-y-1 md:hidden">
          {selectedDay.items.length === 0 ? (
            <p className="py-2 text-center text-2xs text-muted">Nothing due this day.</p>
          ) : (
            selectedDay.items.map((ob) => {
              const client = clientMap.get(ob.clientId);
              return (
                <button
                  key={ob.id}
                  type="button"
                  onClick={() => onSelectObligation(ob)}
                  className="flex min-h-11 w-full items-center justify-between rounded-md border border-line bg-surface px-2.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-ink">
                      {ob.nextAction || ob.taskLabel}
                    </span>
                    <span className="block truncate text-2xs text-muted">{client?.shortName}</span>
                  </span>
                  {!isTodayObligation(ob) && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPin(ob.id);
                      }}
                      className="ml-2 shrink-0 text-2xs font-semibold text-accent"
                    >
                      Pin
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
