import { useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Calendar,
  Users,
  RotateCcw,
  Download,
  Upload,
  GitCommit,
  Settings2,
  Table2,
  MessageSquare,
} from "lucide-react";
import { useData } from "@/lib/ops/data-context";
import { formatMelbourneMonthYear, getMelbourneToday } from "@/lib/ops/dates";
import { getTodaySet } from "@/lib/ops/todaySet";
import { exportSnapshot, parseSnapshot, checkSnapshotOrphans } from "@/lib/ops/snapshot";
import { cn } from "@/lib/utils";

export function Navbar({
  chatOpen,
  onToggleChat,
}: {
  chatOpen?: boolean;
  onToggleChat?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { obligations, clients, personalTasks, templates, lastExportAt, resetToDemoData, importSnapshotData, markExported } = useData();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPeriodLabel = useMemo(() => formatMelbourneMonthYear(), []);
  const melbourneToday = useMemo(() => getMelbourneToday(), []);
  const todayObligationsCount = useMemo(
    () => getTodaySet(obligations, melbourneToday).filter((o) => o.status !== "Done").length,
    [obligations, melbourneToday],
  );

  const handleReset = async () => {
    if (resetPhrase.trim().toUpperCase() !== "YES") return;
    setResetting(true);
    try {
      await resetToDemoData();
      setConfirmReset(false);
      setResetPhrase("");
      setShowTools(false);
    } catch (err) {
      console.error("Failed to reset:", err);
    } finally {
      setResetting(false);
    }
  };

  const handleExportJson = () => {
    try {
      const blob = exportSnapshot(clients, obligations, {
        email: "Jan",
        personalTasks,
        templates,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ops-desk-${melbourneToday}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      void markExported();
    } catch (err) {
      console.error("Failed to export snapshot:", err);
      window.alert("Failed to export JSON snapshot.");
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const snapshot = parseSnapshot(text);
      const { orphanCount } = checkSnapshotOrphans(snapshot);

      let confirmMsg = `Replace local desk with ${snapshot.clients.length} clients and ${snapshot.obligations.length} obligations`;
      if (snapshot.personalTasks?.length || snapshot.templates?.length) {
        confirmMsg += `, ${snapshot.personalTasks?.length || 0} personal tasks, ${snapshot.templates?.length || 0} templates`;
      }
      confirmMsg += " from this file?";
      if (orphanCount > 0) {
        confirmMsg = `Warning: ${orphanCount} obligation(s) reference client IDs not included in this snapshot.\n\n${confirmMsg}`;
      }

      if (window.confirm(confirmMsg)) {
        await importSnapshotData(snapshot);
        setShowTools(false);
      }
    } catch (err) {
      console.error("Failed to import snapshot:", err);
      window.alert(err instanceof Error ? err.message : "Failed to import JSON snapshot.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const tabs = [
    { to: "/", label: "Today", icon: Calendar, count: todayObligationsCount, match: (p: string) => p === "/" },
    {
      to: "/pipeline",
      label: "Pipeline",
      icon: GitCommit,
      count: obligations.filter((o) => o.status !== "Done" && o.status !== "Not applicable").length,
      match: (p: string) => p.startsWith("/pipeline"),
    },
    {
      to: "/trackers",
      label: "Trackers",
      icon: Table2,
      count: 0,
      match: (p: string) => p.startsWith("/trackers"),
    },
    {
      to: "/clients",
      label: "Clients",
      icon: Users,
      count: clients.filter((c) => !c.inactive).length,
      match: (p: string) => p.startsWith("/clients"),
    },
  ] as const;

  return (
    <header className="sticky top-0 z-nav border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-14 w-full min-w-0 max-w-7xl flex-wrap items-center justify-between gap-y-2 px-4 py-1 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="rounded-sm bg-accent px-2 py-1 text-sm font-bold tracking-tight text-accent-fg shadow-xs">
              JD OPS
            </div>
            <div className="flex items-center">
              <h1 className="text-base font-semibold tracking-tight text-ink sm:text-lg">
                Operations Desk
              </h1>
              <span className="ml-2 hidden border-l border-line px-2 text-xs text-muted sm:inline">
                {currentPeriodLabel}
              </span>
            </div>
          </div>

          <div className="hidden h-5 w-px bg-line sm:block" />

          <nav className="flex flex-wrap items-center gap-1">
            {tabs.map((tab) => {
              const active = tab.match(pathname);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={cn(
                    "flex min-h-9 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3",
                    active
                      ? "border border-accent/20 bg-accent-soft text-accent shadow-xs"
                      : "text-muted hover:bg-paper hover:text-ink",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-2xs font-bold tabular-nums",
                        active ? "bg-accent/15 text-accent" : "border border-line bg-paper text-muted",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 text-xs sm:gap-3">
          <button
            type="button"
            onClick={onToggleChat}
            aria-pressed={chatOpen}
            className={cn(
              "flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-medium transition-colors",
              chatOpen
                ? "border-accent/30 bg-accent-soft text-accent"
                : "border-line text-muted hover:bg-paper hover:text-ink",
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ask</span>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTools((v) => !v)}
              className="flex min-h-9 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 font-medium text-muted transition-colors hover:bg-paper hover:text-ink"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ledger</span>
            </button>
            {showTools && (
              <div className="absolute right-0 z-50 mt-1.5 w-64 rounded-lg border border-line bg-raised py-1 shadow-panel">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink hover:bg-paper"
                >
                  <Download className="h-3.5 w-3.5 text-muted" />
                  Export snapshot
                </button>
                <p className="px-3 pb-1 text-2xs text-subtle">
                  {lastExportAt
                    ? `Last export ${lastExportAt.slice(0, 10)}`
                    : "Never exported — this browser is the only copy"}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink hover:bg-paper"
                >
                  <Upload className="h-3.5 w-3.5 text-muted" />
                  Import snapshot
                </button>
                <div className="my-1 border-t border-line" />
                {confirmReset ? (
                  <div className="space-y-1.5 px-3 py-2">
                    <p className="text-2xs font-medium text-ink">
                      Type YES to wipe this ledger and restore the workbook seed.
                    </p>
                    <input
                      type="text"
                      value={resetPhrase}
                      onChange={(e) => setResetPhrase(e.target.value)}
                      placeholder="YES"
                      className="min-h-8 w-full rounded border border-line bg-surface px-2 text-xs text-ink"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={resetting || resetPhrase.trim().toUpperCase() !== "YES"}
                        onClick={() => void handleReset()}
                        className="rounded bg-accent px-2 py-0.5 text-2xs font-semibold text-accent-fg disabled:opacity-40"
                      >
                        {resetting ? "…" : "Reset"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmReset(false);
                          setResetPhrase("");
                        }}
                        className="rounded border border-line bg-surface px-2 py-0.5 text-2xs text-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink hover:bg-paper"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-muted" />
                    Reset to workbook
                  </button>
                )}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={(e) => void handleImportFile(e)}
            className="hidden"
          />

          <div className="flex items-center gap-2 border-l border-line pl-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
              J
            </div>
            <div className="hidden flex-col text-left md:flex">
              <span className="text-2xs leading-tight font-semibold text-ink">Jan · Practitioner</span>
              <span className="max-w-[140px] truncate text-2xs leading-none text-subtle">
                Local Melbourne ledger
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
