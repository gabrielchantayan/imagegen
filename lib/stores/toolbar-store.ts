import { create } from "zustand";
import type { ReactNode } from "react";

type ToolbarState = {
  left: ReactNode;
  right: ReactNode;
  set_slots: (slots: { left?: ReactNode; right?: ReactNode }) => void;
  clear_slots: () => void;
};

export const use_toolbar_store = create<ToolbarState>((set) => ({
  left: null,
  right: null,
  set_slots: (slots) =>
    set({ left: slots.left ?? null, right: slots.right ?? null }),
  clear_slots: () => set({ left: null, right: null }),
}));
