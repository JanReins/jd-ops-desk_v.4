import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useData } from "@/lib/ops/data-context";
import type { CloseDayDecision } from "@/lib/ops/data-context";
import {
  Obligation,
  ObligationStatus,
  Priority,
  WORKSTREAM_LABELS,
} from "@/lib/ops/types";
import { StatusChip } from "./StatusChip";
import { PriorityBadge } from "./PriorityBadge";
import { daysOverdue, formatAuShort, getMelbourneCurrentPeriod, getMelbourneToday } from "@/lib/ops/dates";
import {
  DAY_CAPACITY_MINUTES,
  TODAY_SOFT_CAP,
  getBacklog,
  getCourt,
  getDueNotOnPlan,
  getTodaySet,
  isOpenStatus,
  openMinutes,
  sortTodayStack,
} from "@/lib/ops/todaySet";
import { WeekStrip } from "./week-strip";
import { CadenceBoard } from "./CadenceBoard";
import { PersonalChecklist } from "./PersonalChecklist";
import { FastCapture } from "./FastCapture";
import { TemplatesPanel } from "./TemplatesPanel";
import { MondayStart } from "./MondayStart";
import { BacklogStrip } from "./BacklogStrip";
import { BulkStatusBar } from "./BulkStatusBar";
import { MetkaPackCard } from "./MetkaPackCard";
import { shortEntityName } from "@/lib/ops/metka";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  History,
  ListTodo,
  Pin,
  PinOff,
  Plus,
  Search,
  Sunset,
} from "lucide-react";

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
    lastClosedDate,
    lastExportAt,
    updateObligationStatus,
    batchUpdateObligationStatus,
    updateObligationPriority,
    pinToToday,
    unpinFromToday,
    reorderTodayPlan,
    closeDay,
  } = useData();

  const [searchQuery, setSearchQuery] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [priorityAlert, setPriorityAlert] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const melbourneToday = useMemo(() => getMelbourneToday(), []);
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const todaySet = useMemo(
    () => sortTodayStack(getTodaySet(obligations, melbourneToday)),
    [obligations, melbourneToday],
  );
  const dueTray = useMemo(
    () => getDueNotOnPlan(obligations, melbourneToday),
    [obligations, melbourneToday],
  );
  const currentPeriod = useMemo(() => getMelbourneCurrentPeriod(), []);
  const backlog = useMemo(
    () => getBacklog(obligations, melbourneToday, currentPeriod),
    [obligations, melbourneToday, currentPeriod],
  );

  const sitting = useMemo(
    () => todaySet.filter((o) => getCourt(o.status) === "mine"),
    [todaySet],
  );
  const watching = useMemo(
    () => todaySet.filter((o) => getCourt(o.status) === "theirs"),
    [todaySet],
  );
  const doneOnPlan = useMemo(
    () => todaySet.filter((o) => o.status === "Done"),
    [todaySet],
  );

  const openItems = useMemo(() => todaySet.filter((o) => isOpenStatus(o.status)), [todaySet]);
  const sittingOpen = sitting;
  const load = useMemo(() => openMinutes(sittingOpen), [sittingOpen]);
  const overCapacity = load.minutes > DAY_CAPACITY_MINUTES;
  const overStack = sittingOpen.length > TODAY_SOFT_CAP;
  const closedToday = lastClosedDate === melbourneToday;

  const headerMetrics = useMemo(() => {
    const overdue = sittingOpen.filter((o) => o.dueDate && o.dueDate < melbourneToday);
    return {
      tasks: todaySet.length,
      open: sittingOpen.length,
      done: doneOnPlan.length,
      overdue: overdue.length,
      watching: watching.length,
    };
  }, [todaySet, sittingOpen, doneOnPlan, watching, melbourneToday]);

  const displayedObligations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const base = showDone ? [...sittingOpen, ...doneOnPlan] : sittingOpen;
    return base.filter((ob) => {
      if (!q) return true;
      const client = clientMap.get(ob.clientId);
      const hay = [
        ob.taskLabel,
        ob.nextAction,
        ob.notes,
        ob.blocker,
        ob.waitingOn,
        ob.entityName,
        ob.owner,
        client?.name,
        client?.shortName,
        WORKSTREAM_LABELS[ob.workstream],
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sittingOpen, doneOnPlan, clientMap, searchQuery, showDone]);

  const selectableIds = useMemo(() => {
    const ids = displayedObligations.map((o) => o.id);
    for (const ob of watching) {
      if (!ids.includes(ob.id)) ids.push(ob.id);
    }
    return ids;
  }, [displayedObligations, watching]);

  const allVisibleSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIds([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const applyBulkStatus = async (status: ObligationStatus) => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      await batchUpdateObligationStatus(selectedIds, status);
      setSelectedIds([]);
    } finally {
      setBulkBusy(false);
    }
  };

  const handlePriorityChange = async (id: string, newPriority: Priority) => {
    setPriorityAlert(null);
    const res = await updateObligationPriority(id, newPriority);
    if (!res.success) {
      setPriorityAlert(res.message || "Cannot set more than 3 active P1 obligations.");
      setTimeout(() => setPriorityAlert(null), 4000);
    }
  };

  const persistOrder = async (ids: string[]) => {
    await reorderTodayPlan(ids);
  };

  const moveRow = async (id: string, direction: -1 | 1) => {
    const ids = displayedObligations.filter((o) => isOpenStatus(o.status)).map((o) => o.id);
    const idx = ids.indexOf(id);
    const next = idx + direction;
    if (idx < 0 || next < 0 || next >= ids.length) return;
    const swapped = ids.slice();
    const [item] = swapped.splice(idx, 1);
    swapped.splice(next, 0, item);
    await persistOrder(swapped);
  };

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const ids = displayedObligations.filter((o) => isOpenStatus(o.status)).map((o) => o.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const next = ids.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setDragId(null);
    await persistOrder(next);
  };

  const handlePin = async (id: string) => {
    const res = await pinToToday(id);
    if (res.message) {
      setPriorityAlert(res.message);
      setTimeout(() => setPriorityAlert(null), 4000);
    }
  };

  const todayFormatted = useMemo(() => {
    const [year, month, day] = melbourneToday.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [melbourneToday]);

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted">
            Daily priority planner
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Today's plan</h2>
          <p className="mt-0.5 text-xs text-muted">
            {todayFormatted} · Melbourne · Sitting is my court only. Watching is a chase list.
            {closedToday ? " Day closed — carry-overs are already on tomorrow's stack." : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MondayStart />
          <button
            type="button"
            onClick={() => setCloseOpen(true)}
            disabled={todaySet.length === 0}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-paper disabled:opacity-50"
          >
            <Sunset className="h-3.5 w-3.5" />
            Close day
          </button>
          <button
            id="new-obligation-btn"
            type="button"
            onClick={onAddObligation}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-fg hover:bg-accent-mid"
          >
            <Plus className="h-3.5 w-3.5" />
            Full form
          </button>
        </div>
      </div>

      {!lastExportAt && (
        <div className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-2xs text-warn">
          This browser is the only copy of the ledger. Use Ledger → Export snapshot after you sit.
        </div>
      )}

      <FastCapture />

      {priorityAlert && (
        <div className="flex items-center justify-between rounded-md border border-warn/40 bg-warn-soft p-2.5 text-xs text-warn">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{priorityAlert}</span>
          </div>
          <button type="button" onClick={() => setPriorityAlert(null)} className="px-1 font-semibold">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="This sitting"
          value={headerMetrics.open}
          hint={
            overStack
              ? `Over ${TODAY_SOFT_CAP} — park before pinning more`
              : `${headerMetrics.done} done · ${headerMetrics.watching} watching`
          }
          icon={<ListTodo className="h-4 w-4 text-accent" />}
          tone={overStack ? "warn" : "neutral"}
        />
        <MetricCard
          label="Open minutes"
          value={`${load.minutes}m`}
          hint={
            load.unestimated > 0
              ? `${(load.minutes / 60).toFixed(1)}h of 6h · ${load.unestimated} unestimated`
              : `${(load.minutes / 60).toFixed(1)}h of 6h · my court only`
          }
          icon={<Clock className="h-4 w-4" />}
          tone={overCapacity ? "warn" : "neutral"}
          bar={Math.min(100, Math.round((load.minutes / DAY_CAPACITY_MINUTES) * 100))}
        />
      </div>
      <div className="flex flex-wrap gap-2 text-2xs text-muted">
        {headerMetrics.overdue > 0 && (
          <span className="rounded border border-danger/30 bg-danger-soft px-2 py-1 font-semibold text-danger">
            {headerMetrics.overdue} late in my court
          </span>
        )}
        {backlog.all.length > 0 && (
          <button
            type="button"
            onClick={() =>
              document.getElementById("today-backlog")?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="inline-flex items-center gap-1 rounded border border-danger/30 bg-danger-soft px-2 py-1 font-semibold text-danger"
          >
            <History className="h-3 w-3" />
            {backlog.all.length} leftover
            {backlog.mineCount > 0 ? ` · ${backlog.mineCount} my court` : ""}
          </button>
        )}
        {p1Count > 0 && (
          <span className="rounded border border-warn/30 bg-warn-soft px-2 py-1 font-semibold text-warn">
            {p1Count} / 3 P1
          </span>
        )}
      </div>

      {watching.length > 0 && (
        <div className="rounded-lg border border-warn/30 bg-warn-soft/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xs font-semibold uppercase tracking-wider text-muted">
              Chase — their court
            </p>
            <span className="text-2xs text-subtle">{watching.length} watching</span>
          </div>
          <div className="mt-2 space-y-1">
            {watching.map((ob) => {
              const client = clientMap.get(ob.clientId);
              return (
                <div
                  key={ob.id}
                  className="flex min-h-10 items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(ob.id)}
                      onChange={() => toggleSelected(ob.id)}
                      className="h-4 w-4 shrink-0 accent-accent"
                      aria-label={`Select ${ob.nextAction || ob.taskLabel}`}
                    />
                    <button
                      type="button"
                      onClick={() => onSelectObligation(ob)}
                      className="min-w-0 text-left"
                    >
                    <span className="block truncate text-xs font-semibold text-ink">
                      {ob.nextAction || ob.taskLabel}
                    </span>
                    <span className="block truncate text-2xs text-muted">
                      {ob.entityName ? shortEntityName(ob.entityName) : client?.shortName}
                      {ob.waitingOn ? ` · ${ob.waitingOn}` : ` · ${ob.status}`}
                    </span>
                  </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void unpinFromToday(ob.id)}
                    className="shrink-0 text-2xs font-semibold text-muted hover:text-ink"
                  >
                    Park
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {backlog.all.length > 0 && (
        <BacklogStrip
          items={backlog.all}
          mineCount={backlog.mineCount}
          overdueCount={backlog.overdueCount}
          leftoverCount={backlog.leftoverCount}
          clientMap={clientMap}
          melbourneToday={melbourneToday}
          onSelectObligation={onSelectObligation}
          onPin={(id) => void handlePin(id)}
        />
      )}

      <MetkaPackCard obligations={obligations} />

      {dueTray.length > 0 && (
        <div className="rounded-lg border border-line bg-surface p-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xs font-semibold uppercase tracking-wider text-muted">
              Due today, not on plan
            </p>
            <span className="text-2xs text-subtle">{dueTray.length} to consider</span>
          </div>
          <div className="mt-2 flex flex-col gap-1.5">
            {dueTray.slice(0, 8).map((ob) => {
              const client = clientMap.get(ob.clientId);
              return (
                <div
                  key={ob.id}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-dashed border-line bg-paper px-2.5 py-1.5"
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
                      {client?.shortName} · {formatAuShort(ob.dueDate)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePin(ob.id)}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md border border-line bg-surface px-2 text-2xs font-semibold text-ink hover:border-accent hover:text-accent"
                  >
                    <Pin className="h-3 w-3" />
                    Pin
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-2.5 shadow-xs">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search this sitting…"
            className="min-h-9 w-full rounded-md border border-line bg-raised pl-8 pr-3 text-xs text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowDone((v) => !v)}
          className={cn(
            "min-h-9 rounded-md border px-3 text-xs font-medium",
            showDone
              ? "border-line bg-raised text-muted"
              : "border-accent/30 bg-accent-soft text-accent",
          )}
        >
          {showDone ? "Hide done" : "Show done"}
        </button>
        <button
          type="button"
          onClick={() =>
            setSelectedIds(allVisibleSelected ? [] : selectableIds)
          }
          className="min-h-9 rounded-md border border-line bg-raised px-3 text-xs font-medium text-ink hover:bg-paper"
        >
          {allVisibleSelected ? "Clear ticks" : "Select sitting"}
        </button>
        <span className="text-2xs text-muted">{displayedObligations.length} in sitting</span>
      </div>

      <div className="min-w-0 space-y-2">
          {displayedObligations.length === 0 ? (
            <EmptyPlan />
          ) : (
            displayedObligations.map((ob, idx) => {
              const client = clientMap.get(ob.clientId);
              const overdueDays = isOpenStatus(ob.status)
                ? daysOverdue(ob.dueDate, melbourneToday)
                : 0;
              const isP1 = ob.priority === "P1" && isOpenStatus(ob.status);
              const open = isOpenStatus(ob.status);
              return (
                <div
                  key={ob.id}
                  draggable={false}
                  onDragOver={(e) => {
                    if (open && dragId) e.preventDefault();
                  }}
                  onDrop={() => void handleDrop(ob.id)}
                  className={cn(
                    "flex gap-2 rounded-lg border p-2.5 shadow-xs sm:p-3",
                    dragId === ob.id && "opacity-50",
                    isP1
                      ? "border-warn/40 bg-warn-soft/40"
                      : overdueDays > 0
                        ? "border-danger/30 bg-danger-soft/40"
                        : "border-line bg-surface",
                    selectedIds.includes(ob.id) && "ring-1 ring-accent/40",
                  )}
                >
                  <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(ob.id)}
                      onChange={() => toggleSelected(ob.id)}
                      className="h-4 w-4 accent-accent"
                      aria-label={`Select ${ob.nextAction || ob.taskLabel}`}
                    />
                    <span className="font-mono text-2xs text-subtle">{idx + 1}</span>
                    {open ? (
                      <>
                        <span
                          draggable
                          className="hidden cursor-grab text-subtle sm:block"
                          title="Drag to reorder"
                          onDragStart={(e) => {
                            setDragId(ob.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                        <button
                          type="button"
                          aria-label="Move up"
                          className="flex min-h-8 min-w-8 items-center justify-center rounded text-muted hover:bg-paper hover:text-ink"
                          onClick={() => void moveRow(ob.id, -1)}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          className="flex min-h-8 min-w-8 items-center justify-center rounded text-muted hover:bg-paper hover:text-ink"
                          onClick={() => void moveRow(ob.id, 1)}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectObligation(ob)}
                        className="min-w-0 text-left"
                      >
                        <div className="text-sm font-semibold leading-snug text-ink">
                          {ob.nextAction || ob.taskLabel || WORKSTREAM_LABELS[ob.workstream]}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-2xs text-muted">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (ob.clientId) onOpenClientDrawer(ob.clientId);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") onOpenClientDrawer(ob.clientId);
                            }}
                            className="font-semibold text-ink hover:text-accent hover:underline"
                          >
                            {ob.entityName ? shortEntityName(ob.entityName) : client?.shortName || "Client"}
                          </span>
                          <span>· {ob.taskLabel || WORKSTREAM_LABELS[ob.workstream]}</span>
                          {ob.carryOver && (
                            <span className="rounded border border-warn/30 bg-warn-soft px-1 py-0.5 font-semibold text-warn">
                              Carry over
                            </span>
                          )}
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <PriorityBadge
                          priority={ob.priority}
                          onChange={(p) => void handlePriorityChange(ob.id, p)}
                          p1CapacityReached={p1Count >= 3}
                        />
                      </div>
                    </div>

                    {(ob.waitingOn || ob.blocker) && (
                      <div className="mt-1 text-2xs">
                        {ob.waitingOn ? (
                          <span className="text-warn">Waiting: {ob.waitingOn}</span>
                        ) : null}
                        {ob.blocker ? (
                          <span className="text-danger">
                            {ob.waitingOn ? " · " : ""}
                            Blocker: {ob.blocker}
                          </span>
                        ) : null}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "font-mono text-2xs",
                          overdueDays > 0 ? "font-semibold text-danger" : "text-muted",
                        )}
                      >
                        {formatAuShort(ob.dueDate)}
                        {overdueDays > 0 ? ` · ${overdueDays}d overdue` : ""}
                      </span>
                      <span className="font-mono text-2xs text-muted">
                        {ob.estimatedMinutes ? `${ob.estimatedMinutes}m` : "no est."}
                      </span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <StatusChip
                          status={ob.status}
                          onChange={(newStatus) => void updateObligationStatus(ob.id, newStatus)}
                        />
                      </div>
                      {open ? (
                        <button
                          type="button"
                          onClick={() => void unpinFromToday(ob.id)}
                          className="ml-auto inline-flex min-h-8 items-center gap-1 rounded px-1.5 text-2xs font-medium text-muted hover:text-ink"
                          title="Park in pipeline"
                        >
                          <PinOff className="h-3 w-3" />
                          Park
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowWeek((v) => !v)}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold",
            showWeek
              ? "border-accent/30 bg-accent-soft text-accent"
              : "border-line bg-surface text-ink hover:bg-paper",
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Week diary
          {showWeek ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold",
            showMore
              ? "border-accent/30 bg-accent-soft text-accent"
              : "border-line bg-surface text-ink hover:bg-paper",
          )}
        >
          Personal / templates
          {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {showWeek && (
        <div className="space-y-3">
          <CadenceBoard obligations={obligations} melbourneToday={melbourneToday} />
          <WeekStrip
            obligations={obligations}
            melbourneToday={melbourneToday}
            clients={clients}
            onSelectObligation={onSelectObligation}
            onPin={(id) => void handlePin(id)}
          />
        </div>
      )}

      {showMore && (
        <div className="grid gap-3 lg:grid-cols-2">
          <PersonalChecklist />
          <TemplatesPanel />
        </div>
      )}

      {closeOpen && (
        <CloseDayModal
          items={openItems}
          doneCount={headerMetrics.done}
          clientMap={clientMap}
          closedToday={closedToday}
          onCancel={() => setCloseOpen(false)}
          onConfirm={async (decisions) => {
            await closeDay(decisions);
            setCloseOpen(false);
          }}
        />
      )}

      <BulkStatusBar
        selectedCount={selectedIds.length}
        visibleCount={selectableIds.length}
        allVisibleSelected={allVisibleSelected}
        busy={bulkBusy}
        onToggleAllVisible={() => setSelectedIds(allVisibleSelected ? [] : selectableIds)}
        onClear={() => setSelectedIds([])}
        onApply={(status) => void applyBulkStatus(status)}
      />
    </div>
  );
}

function CloseDayModal({
  items,
  doneCount,
  clientMap,
  closedToday,
  onCancel,
  onConfirm,
}: {
  items: Obligation[];
  doneCount: number;
  clientMap: Map<string, { shortName: string; name: string }>;
  closedToday: boolean;
  onCancel: () => void;
  onConfirm: (decisions: CloseDayDecision[]) => Promise<void>;
}) {
  const [choices, setChoices] = useState<Record<string, "carry" | "park">>(() =>
    Object.fromEntries(items.map((o) => [o.id, "carry" as const])),
  );
  const [saving, setSaving] = useState(false);

  const setAll = (action: "carry" | "park") => {
    setChoices(Object.fromEntries(items.map((o) => [o.id, action])));
  };

  return (
    <div
      className="fixed inset-0 z-modal flex items-end justify-center bg-ink/40 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="max-h-[90dvh] w-full max-w-lg overflow-hidden rounded-t-lg border border-line bg-surface shadow-panel sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line bg-paper px-4 py-3">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted">End of sitting</p>
          <h3 className="text-base font-semibold text-ink">Close today's plan</h3>
          <p className="mt-0.5 text-xs text-muted">
            {doneCount} done stay off the plan. Open items either carry to tomorrow or go back to
            Pipeline.
            {closedToday ? " You already closed once today — this replaces that close." : ""}
          </p>
        </div>
        <div className="flex gap-2 border-b border-line px-4 py-2">
          <button
            type="button"
            onClick={() => setAll("carry")}
            className="min-h-9 rounded-md border border-line bg-raised px-2.5 text-2xs font-semibold"
          >
            Carry all
          </button>
          <button
            type="button"
            onClick={() => setAll("park")}
            className="min-h-9 rounded-md border border-line bg-raised px-2.5 text-2xs font-semibold"
          >
            Park all
          </button>
        </div>
        <div className="max-h-[50dvh] space-y-1.5 overflow-y-auto p-3">
          {items.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted">
              Nothing open. Closing will clear completed items from the plan.
            </p>
          ) : (
            items.map((ob) => {
              const client = clientMap.get(ob.clientId);
              const action = choices[ob.id] || "carry";
              return (
                <div
                  key={ob.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-line bg-paper px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold text-ink">
                      {ob.nextAction || ob.taskLabel}
                    </div>
                    <div className="truncate text-2xs text-muted">{client?.shortName}</div>
                  </div>
                  <div className="flex shrink-0 rounded-md border border-line bg-surface p-0.5">
                    <button
                      type="button"
                      onClick={() => setChoices((c) => ({ ...c, [ob.id]: "carry" }))}
                      className={cn(
                        "min-h-8 rounded px-2 text-2xs font-semibold",
                        action === "carry" ? "bg-accent text-accent-fg" : "text-muted",
                      )}
                    >
                      Carry
                    </button>
                    <button
                      type="button"
                      onClick={() => setChoices((c) => ({ ...c, [ob.id]: "park" }))}
                      className={cn(
                        "min-h-8 rounded px-2 text-2xs font-semibold",
                        action === "park" ? "bg-accent text-accent-fg" : "text-muted",
                      )}
                    >
                      Park
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-10 rounded-md border border-line px-3 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const decisions: CloseDayDecision[] = items.map((o) => ({
                id: o.id,
                action: choices[o.id] || "carry",
              }));
              await onConfirm(decisions);
            }}
            className="min-h-10 rounded-md bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-mid disabled:opacity-50"
          >
            {saving ? "Closing…" : "Close day"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  bar,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  tone?: "neutral" | "danger" | "warn";
  bar?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3.5 shadow-xs",
        tone === "danger"
          ? "border-danger/30 bg-danger-soft/60"
          : tone === "warn"
            ? "border-warn/30 bg-warn-soft/60"
            : "border-line bg-surface",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs font-semibold uppercase tracking-wider text-muted">{label}</span>
        <span className={tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-muted"}>
          {icon}
        </span>
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-ink">{value}</div>
      {typeof bar === "number" && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper">
          <div
            className={cn("h-full rounded-full", overBarClass(tone))}
            style={{ width: `${bar}%` }}
          />
        </div>
      )}
      <div className="mt-1 text-2xs text-muted">{hint}</div>
    </div>
  );
}

function overBarClass(tone: "neutral" | "danger" | "warn") {
  if (tone === "warn") return "bg-warn";
  if (tone === "danger") return "bg-danger";
  return "bg-accent";
}

function EmptyPlan() {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-10 text-center">
      <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-subtle" />
      <p className="text-xs font-semibold text-ink">Nothing on today's plan.</p>
      <p className="mt-0.5 text-2xs text-muted">
        Pin due work from the tray above, or add a task. Pipeline keeps the rest.
      </p>
    </div>
  );
}
