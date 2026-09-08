import { Link } from "@tanstack/react-router";
import {
  WORKSTREAM_CADENCE,
  WORKSTREAM_LABELS,
  type Obligation,
  type Workstream,
} from "@/lib/ops/types";
import { isOpenStatus } from "@/lib/ops/todaySet";
import { daysOverdue } from "@/lib/ops/dates";

const STREAMS: Workstream[] = [
  "bas_ias",
  "metka_bas",
  "management_reports",
  "bookkeeping",
  "supplier_payments",
  "payroll_tax",
  "stp_payroll",
];

export function CadenceBoard({
  obligations,
  melbourneToday,
}: {
  obligations: Obligation[];
  melbourneToday: string;
}) {
  const cards = STREAMS.map((ws) => {
    const rows = obligations.filter((o) => o.workstream === ws);
    const open = rows.filter((o) => isOpenStatus(o.status));
    const overdue = open.filter((o) => o.dueDate && o.dueDate < melbourneToday);
    const review = open.filter((o) => o.status === "For review" || o.status === "Ready to lodge");
    return {
      ws,
      open: open.length,
      overdue: overdue.length,
      review: review.length,
      maxOverdue: overdue.reduce((m, o) => Math.max(m, daysOverdue(o.dueDate, melbourneToday)), 0),
    };
  });

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => (
        <Link
          key={card.ws}
          to="/trackers"
          search={{ stream: card.ws }}
          className={`rounded-lg border px-2.5 py-2.5 transition-colors ${
            card.overdue > 0
              ? "border-danger/30 bg-danger-soft/50"
              : "border-line bg-surface hover:bg-paper"
          }`}
        >
          <div className="text-2xs font-semibold uppercase tracking-wider text-muted">
            {WORKSTREAM_LABELS[card.ws]}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-lg font-semibold tabular-nums text-ink">{card.open}</span>
            <span className="text-2xs text-muted">open</span>
          </div>
          <div className="mt-0.5 text-2xs text-subtle">{WORKSTREAM_CADENCE[card.ws]}</div>
          {card.overdue > 0 ? (
            <div className="mt-1 text-2xs font-semibold text-danger">
              {card.overdue} overdue
              {card.maxOverdue ? ` · ${card.maxOverdue}d` : ""}
            </div>
          ) : card.review > 0 ? (
            <div className="mt-1 text-2xs font-medium text-warn">{card.review} for review</div>
          ) : (
            <div className="mt-1 text-2xs text-ok">On cadence</div>
          )}
        </Link>
      ))}
    </div>
  );
}
