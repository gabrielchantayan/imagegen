"use client";

import { createContext, useContext, ReactNode } from "react";
import { use_reference_auto_sync } from "@/lib/hooks/use-reference-auto-sync";

type ReferenceSyncContextType = ReturnType<typeof use_reference_auto_sync>;

const ReferenceSyncContext = createContext<ReferenceSyncContextType | null>(null);

export const ReferenceSyncProvider = ({ children }: { children: ReactNode }) => {
  const sync_state = use_reference_auto_sync();

  return (
    <ReferenceSyncContext.Provider value={sync_state}>
      {children}
    </ReferenceSyncContext.Provider>
  );
};

export const useReferenceSyncContext = () => {
  const context = useContext(ReferenceSyncContext);
  if (!context) {
    throw new Error(
      "useReferenceSyncContext must be used within a ReferenceSyncProvider"
    );
  }
  return context;
};
