import { Priority } from "@/lib/ops/types";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";

interface PriorityBadgeProps {
  priority: Priority;
  onChange?: (newPriority: Priority) => void;
  disabled?: boolean;
  p1CapacityReached?: boolean;
}

const STYLES: Record<Priority, { bg: string; border: string; label: string }> = {
  P1: {
    bg: "bg-danger-soft text-danger",
    border: "border-danger/30",
    label: "P1 Critical",
  },
  P2: {
    bg: "bg-warn-soft text-warn",
    border: "border-warn/30",
    label: "P2 Important",
  },
  P3: {
    bg: "bg-paper text-muted",
    border: "border-line",
    label: "P3 Routine",
  },
};

export function PriorityBadge({
  priority,
  onChange,
  disabled = false,
  p1CapacityReached = false,
}: PriorityBadgeProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentStyle = STYLES[priority] || STYLES.P3;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const chip = `inline-flex items-center justify-center rounded border px-2 py-0.5 text-xs font-semibold ${currentStyle.bg} ${currentStyle.border}`;

  if (!onChange || disabled) {
    return <span className={chip}>{priority}</span>;
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${chip} cursor-pointer gap-1`}
        title="Adjust priority (max 3 active P1)"
      >
        <span>{priority}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-44 rounded-lg border border-line bg-raised py-1 shadow-panel">
          {(["P1", "P2", "P3"] as Priority[]).map((p) => {
            const isP1Locked = p === "P1" && priority !== "P1" && p1CapacityReached;
            const itemStyle = STYLES[p];
            return (
              <button
                key={p}
                type="button"
                disabled={isP1Locked}
                onClick={() => {
                  if (!isP1Locked) {
                    onChange(p);
                    setOpen(false);
                  }
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${
                  isP1Locked
                    ? "cursor-not-allowed bg-paper text-subtle opacity-50"
                    : p === priority
                      ? "bg-paper font-semibold text-ink"
                      : "text-muted hover:bg-paper"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`rounded border px-1.5 py-0.5 text-2xs font-semibold ${itemStyle.bg} ${itemStyle.border}`}>
                    {p}
                  </span>
                  <span>{itemStyle.label}</span>
                </span>
                {isP1Locked && (
                  <span className="flex items-center text-2xs font-medium text-danger">
                    <AlertCircle className="mr-0.5 h-3 w-3" /> Max 3
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
