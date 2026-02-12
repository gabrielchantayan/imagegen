"use client";

import { useEffect, type ReactNode } from "react";
import { use_toolbar_store } from "@/lib/stores/toolbar-store";

type ToolbarSlotsProps = {
  left?: ReactNode;
  right?: ReactNode;
};

export const ToolbarSlots = ({ left, right }: ToolbarSlotsProps) => {
  const set_slots = use_toolbar_store((s) => s.set_slots);
  const clear_slots = use_toolbar_store((s) => s.clear_slots);

  useEffect(() => {
    set_slots({ left, right });
    return () => clear_slots();
  }, [left, right, set_slots, clear_slots]);

  return null;
};
