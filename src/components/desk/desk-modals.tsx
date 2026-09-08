import { createContext, useContext, useState, type ReactNode } from "react";
import type { Obligation } from "@/lib/ops/types";

interface DeskModalsValue {
  drawerClientId: string | null;
  setDrawerClientId: (id: string | null) => void;
  selectedObligation: Obligation | null;
  setSelectedObligation: (ob: Obligation | null) => void;
  showAddObligation: boolean;
  addObligationClientId: string | null;
  openAddObligation: (clientId?: string | null) => void;
  closeAddObligation: () => void;
}

const DeskModalsContext = createContext<DeskModalsValue | undefined>(undefined);

export function DeskModalsProvider({ children }: { children: ReactNode }) {
  const [drawerClientId, setDrawerClientId] = useState<string | null>(null);
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);
  const [addObligationClientId, setAddObligationClientId] = useState<string | null>(null);
  const [showAddObligation, setShowAddObligation] = useState(false);

  const openAddObligation = (clientId?: string | null) => {
    setAddObligationClientId(clientId ?? null);
    setShowAddObligation(true);
  };

  const closeAddObligation = () => {
    setShowAddObligation(false);
    setAddObligationClientId(null);
  };

  return (
    <DeskModalsContext.Provider
      value={{
        drawerClientId,
        setDrawerClientId,
        selectedObligation,
        setSelectedObligation,
        showAddObligation,
        addObligationClientId,
        openAddObligation,
        closeAddObligation,
      }}
    >
      {children}
    </DeskModalsContext.Provider>
  );
}

export function useDeskModals(): DeskModalsValue {
  const ctx = useContext(DeskModalsContext);
  if (!ctx) throw new Error("useDeskModals must be used within DeskModalsProvider");
  return ctx;
}
