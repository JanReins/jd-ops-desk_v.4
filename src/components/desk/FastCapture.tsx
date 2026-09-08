import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useData } from "@/lib/ops/data-context";
import { getMelbourneToday, periodStartFromDate, weekContainingDate } from "@/lib/ops/dates";
import type { Workstream } from "@/lib/ops/types";
import { WORKSTREAM_LABELS } from "@/lib/ops/types";
import { defaultWorkstream, findWeekBookCell } from "@/lib/ops/obligationGenerator";

export function FastCapture() {
  const { clients, obligations, addObligation, updateObligation } = useData();
  const active = clients.filter((c) => !c.inactive);
  const [clientId, setClientId] = useState(active[0]?.id ?? "");

  useEffect(() => {
    if (!clientId && active.length > 0) {
      setClientId(active[0].id);
    }
  }, [active, clientId]);

  const client = active.find((c) => c.id === clientId) || active[0];
  const [line, setLine] = useState("");
  const [dueDate, setDueDate] = useState(getMelbourneToday());
  const [workstream, setWorkstream] = useState<Workstream>(
    client ? defaultWorkstream(client) : "admin",
  );
  const [pin, setPin] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (client) setWorkstream(defaultWorkstream(client));
  }, [clientId]);

  const week = useMemo(() => weekContainingDate(getMelbourneToday()), []);
  const attachesToBooks =
    Boolean(client && (client.services.weeklyBooks || client.services.monthlyBooks)) &&
    workstream === "bookkeeping" &&
    Boolean(week);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nextAction = line.trim();
    if (!nextAction || !clientId) return;
    setBusy(true);
    try {
      if (attachesToBooks && week) {
        const existing = findWeekBookCell(obligations, clientId, week.weekCode);
        if (existing) {
          const generic = /bank reconciliation|bookkeeping|ledger/i.test(existing.nextAction || "");
          await updateObligation(existing.id, {
            nextAction,
            onTodayPlan: pin || Boolean(existing.onTodayPlan),
            status:
              existing.status === "Done" || existing.status === "Not applicable"
                ? "In progress"
                : existing.status,
            notes:
              !generic && existing.nextAction && existing.nextAction !== nextAction
                ? [existing.notes, `Was: ${existing.nextAction}`].filter(Boolean).join("\n")
                : existing.notes,
          });
          setLine("");
          setFlash(
            pin
              ? `On ${client?.shortName} · ${week.weekCode} · pinned`
              : `On ${client?.shortName} · ${week.weekCode}`,
          );
          setTimeout(() => setFlash(null), 2500);
          return;
        }
        await addObligation({
          clientId,
          workstream: "bookkeeping",
          periodStart: week.periodStart,
          dueDate: week.dueDate,
          status: "Not started",
          owner: "Jan",
          reviewer: "",
          priority: "P2",
          nextAction,
          blocker: "",
          waitingOn: "",
          recurring: true,
          estimatedMinutes: 60,
          order: Date.now() % 1000,
          onTodayPlan: pin,
          taskLabel: client?.services.weeklyBooks ? "Weekly bookkeeping" : "Monthly bookkeeping",
          weekCode: week.weekCode,
          sourceSheet: "Bookkeeping",
          notes: "",
        });
        setLine("");
        setFlash(pin ? `Opened ${week.weekCode} and pinned` : `Opened ${week.weekCode}`);
        setTimeout(() => setFlash(null), 2500);
        return;
      }

      await addObligation({
        clientId,
        workstream,
        periodStart: periodStartFromDate(dueDate),
        dueDate,
        status: "Not started",
        owner: "Jan",
        reviewer: "",
        priority: "P2",
        nextAction,
        blocker: "",
        waitingOn: "",
        recurring: false,
        estimatedMinutes: 30,
        order: Date.now() % 1000,
        onTodayPlan: pin,
        taskLabel: nextAction,
        notes: "",
      });
      setLine("");
      setFlash(pin ? "Pinned to today" : "Saved to pipeline");
      setTimeout(() => setFlash(null), 2500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="rounded-lg border border-line bg-surface p-2.5 shadow-xs"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Fast capture</p>
        {flash ? (
          <span className="text-2xs font-medium text-accent">{flash}</span>
        ) : attachesToBooks && week ? (
          <span className="truncate text-2xs text-muted">
            Lands on {client?.shortName} · {week.weekCode}
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="min-h-10 max-w-[40%] rounded-md border border-line bg-raised px-2 text-xs text-ink focus:border-accent focus:outline-none sm:max-w-[180px]"
        >
          {active.map((c) => (
            <option key={c.id} value={c.id}>
              {c.shortName}
            </option>
          ))}
        </select>
        <input
          value={line}
          onChange={(e) => setLine(e.target.value)}
          placeholder="Next action — one line"
          className="min-h-10 min-w-0 flex-1 rounded-md border border-line bg-raised px-2.5 text-xs text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
        />
        {!attachesToBooks && (
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="min-h-10 rounded-md border border-line bg-raised px-2 text-xs text-ink focus:border-accent focus:outline-none"
          />
        )}
        <select
          value={workstream}
          onChange={(e) => setWorkstream(e.target.value as Workstream)}
          className="min-h-10 rounded-md border border-line bg-raised px-2 text-xs text-ink focus:border-accent focus:outline-none"
        >
          {(Object.keys(WORKSTREAM_LABELS) as Workstream[]).map((ws) => (
            <option key={ws} value={ws}>
              {WORKSTREAM_LABELS[ws]}
            </option>
          ))}
        </select>
        <label className="inline-flex min-h-10 items-center gap-1 rounded-md border border-line bg-raised px-2 text-2xs font-semibold text-ink">
          <input
            type="checkbox"
            checked={pin}
            onChange={(e) => setPin(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Today
        </label>
        <button
          type="submit"
          disabled={busy || !line.trim()}
          className="min-h-10 rounded-md bg-accent px-3 text-xs font-semibold text-accent-fg hover:bg-accent-mid disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </form>
  );
}
