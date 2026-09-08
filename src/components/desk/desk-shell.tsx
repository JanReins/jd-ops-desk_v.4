import { useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { DataProvider, useData } from "@/lib/ops/data-context";
import type { Obligation } from "@/lib/ops/types";
import { Navbar } from "./Navbar";
import { ClientDrawer } from "./ClientDrawer";
import { ObligationDetailModal } from "./ObligationDetailModal";
import { AddObligationModal } from "./AddObligationModal";
import { DeskModalsProvider, useDeskModals } from "./desk-modals";
import { DeskChat } from "./DeskChat";

function DeskFrame() {
  const { clients, obligations, loading, p1Count, updateClient, updateObligationStatus, updateObligation, updateObligationPriority, addObligation } =
    useData();
  const {
    drawerClientId,
    setDrawerClientId,
    selectedObligation,
    setSelectedObligation,
    showAddObligation,
    addObligationClientId,
    openAddObligation,
    closeAddObligation,
  } = useDeskModals();
  const [chatOpen, setChatOpen] = useState(false);

  const activeDrawerClient = clients.find((c) => c.id === drawerClientId) || null;
  const selectedObClient = selectedObligation
    ? clients.find((c) => c.id === selectedObligation.clientId)
    : undefined;

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink antialiased">
      <Navbar chatOpen={chatOpen} onToggleChat={() => setChatOpen((v) => !v)} />

      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col overflow-x-hidden p-4 sm:p-6">
        {loading && obligations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-xs text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span>Loading operations ledger from local storage…</span>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-ink/80 bg-ink px-4 text-2xs text-accent-fg sm:px-6">
        <span className="truncate">Jan · JD accounting desk · Saved in this browser</span>
        <span className="hidden shrink-0 text-subtle sm:inline">No sign-in · Local ledger</span>
      </footer>

      {activeDrawerClient && (
        <ClientDrawer
          client={activeDrawerClient}
          obligations={obligations}
          p1Count={p1Count}
          onClose={() => setDrawerClientId(null)}
          onUpdateClient={updateClient}
          onUpdateObligationStatus={updateObligationStatus}
          onSelectObligation={(ob: Obligation) => setSelectedObligation(ob)}
          onAddObligationForClient={(clientId: string) => openAddObligation(clientId)}
        />
      )}

      {selectedObligation && (
        <ObligationDetailModal
          obligation={selectedObligation}
          client={selectedObClient}
          p1Count={p1Count}
          onClose={() => setSelectedObligation(null)}
          onSave={updateObligation}
          onPriorityChange={updateObligationPriority}
        />
      )}

      {showAddObligation && (
        <AddObligationModal
          clients={clients}
          initialClientId={addObligationClientId || undefined}
          p1Count={p1Count}
          onClose={closeAddObligation}
          onAdd={addObligation}
        />
      )}
      {chatOpen && <DeskChat onClose={() => setChatOpen(false)} />}
    </div>
  );
}

export function DeskShell() {
  return (
    <DataProvider>
      <DeskModalsProvider>
        <DeskFrame />
      </DeskModalsProvider>
    </DataProvider>
  );
}
