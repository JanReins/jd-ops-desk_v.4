import { ObligationStatus, ALL_STATUSES } from "@/lib/ops/types";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface StatusChipProps {
  status: ObligationStatus;
  onChange?: (newStatus: ObligationStatus) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

const STATUS_STYLES: Record<
  ObligationStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  "Not started": {
    bg: "bg-paper hover:bg-paper",
    text: "text-muted",
    dot: "bg-subtle",
    label: "Not started",
  },
  "In progress": {
    bg: "bg-accent-soft hover:bg-accent-soft",
    text: "text-accent",
    dot: "bg-accent",
    label: "In progress",
  },
  "For review": {
    bg: "bg-warn-soft hover:bg-warn-soft",
    text: "text-warn",
    dot: "bg-warn",
    label: "For review",
  },
  "Waiting on client": {
    bg: "bg-warn-soft hover:bg-warn-soft",
    text: "text-warn",
    dot: "bg-warn",
    label: "Waiting",
  },
  Blocked: {
    bg: "bg-danger-soft hover:bg-danger-soft",
    text: "text-danger",
    dot: "bg-danger",
    label: "Blocked",
  },
  "Ready to lodge": {
    bg: "bg-ok-soft hover:bg-ok-soft",
    text: "text-ok",
    dot: "bg-ok",
    label: "Ready to lodge",
  },
  Done: {
    bg: "bg-ok-soft hover:bg-ok-soft",
    text: "text-ok",
    dot: "bg-ok",
    label: "Done",
  },
  "Not applicable": {
    bg: "bg-paper hover:bg-paper",
    text: "text-subtle",
    dot: "bg-subtle",
    label: "N/A",
  },
};

export function StatusChip({
  status,
  onChange,
  disabled = false,
  size = "sm",
}: StatusChipProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const style = STATUS_STYLES[status] || STATUS_STYLES["Not started"];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const chipClass = `inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 font-semibold tracking-wide ${
    size === "sm" ? "text-2xs" : "text-xs"
  } ${style.bg} ${style.text}`;

  if (!onChange || disabled) {
    return (
      <span className={chipClass}>
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
        <span className="whitespace-nowrap">{style.label}</span>
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${chipClass} cursor-pointer`}
        title="Update status"
      >
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
        <span className="whitespace-nowrap">{style.label}</span>
        <ChevronDown className="ml-0.5 h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-44 rounded-lg border border-line bg-raised py-1 shadow-panel">
          <div className="border-b border-line px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-subtle">
            Set status
          </div>
          {ALL_STATUSES.map((s) => {
            const itemStyle = STATUS_STYLES[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-paper ${
                  s === status ? "bg-paper font-semibold text-ink" : "text-muted"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${itemStyle.dot}`} />
                <span>{s}</span>
                {s === status && (
                  <span className="ml-auto text-2xs font-semibold text-accent">Active</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
