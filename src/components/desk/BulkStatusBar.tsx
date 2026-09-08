import { ALL_STATUSES, type ObligationStatus } from "@/lib/ops/types";
import { CheckSquare, Square, X } from "lucide-react";
import { useState } from "react";

const QUICK: { status: ObligationStatus; label: string }[] = [
  { status: "Done", label: "Done" },
  { status: "In progress", label: "In progress" },
  { status: "Waiting on client", label: "Waiting" },
  { status: "For review", label: "Review" },
  { status: "Ready to lodge", label: "Ready" },
  { status: "Blocked", label: "Blocked" },
];

const BULK_CONFIRM_AT = 10;

type Props = {
  selectedCount: number;
  visibleCount: number;
  allVisibleSelected: boolean;
  busy?: boolean;
  onToggleAllVisible: () => void;
  onClear: () => void;
  onApply: (status: ObligationStatus) => void;
};

export function BulkStatusBar({
  selectedCount,
  visibleCount,
  allVisibleSelected,
  busy,
  onToggleAllVisible,
  onClear,
  onApply,
}: Props) {
  const [pending, setPending] = useState<ObligationStatus | null>(null);
  if (selectedCount === 0) return null;

  const requestApply = (status: ObligationStatus) => {
    if (selectedCount > BULK_CONFIRM_AT) {
      setPending(status);
      return;
    }
    onApply(status);
  };

  return (
    <div className="sticky bottom-2 z-20 mt-2 rounded-lg border border-accent/30 bg-raised px-3 py-2 shadow-panel">
      {pending ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink">
            Set {selectedCount} rows to {pending}?
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onApply(pending);
              setPending(null);
            }}
            className="inline-flex min-h-9 items-center rounded-md bg-accent px-3 text-2xs font-semibold text-accent-fg disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setPending(null)}
            className="inline-flex min-h-9 items-center rounded-md border border-line bg-surface px-3 text-2xs font-semibold text-ink"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleAllVisible}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-2xs font-semibold text-ink hover:bg-paper"
          >
            {allVisibleSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {allVisibleSelected ? "Clear visible" : `Select ${visibleCount}`}
          </button>
          <span className="text-xs font-semibold tabular-nums text-ink">
            {selectedCount} selected
          </span>
          <span className="hidden text-2xs text-muted sm:inline">Set status on all</span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {QUICK.map((item) => (
              <button
                key={item.status}
                type="button"
                disabled={busy}
                onClick={() => requestApply(item.status)}
                className="inline-flex min-h-9 items-center rounded-md border border-line bg-surface px-2.5 text-2xs font-semibold text-ink hover:border-accent/40 hover:bg-accent-soft disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
            <select
              disabled={busy}
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value as ObligationStatus;
                if (value) requestApply(value);
                e.currentTarget.value = "";
              }}
              className="min-h-9 rounded-md border border-line bg-surface px-2 text-2xs font-semibold text-ink"
              aria-label="More statuses"
            >
              <option value="" disabled>
                More…
              </option>
              {ALL_STATUSES.filter((s) => !QUICK.some((q) => q.status === s)).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink"
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
