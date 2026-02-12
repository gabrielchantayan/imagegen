"use client";

import { useMemo } from "react";
import { CheckSquare, Square, GitCompare, X, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToolbarSlots } from "@/components/shared/toolbar-slots";
import { use_history_store } from "@/lib/stores/history-store";

type HistoryToolbarProps = {
  total: number;
  selected_count: number;
  is_select_mode: boolean;
  on_toggle_select_mode: () => void;
  on_compare: () => void;
  on_clear_selection: () => void;
};

export const HistoryToolbar = ({
  total,
  selected_count,
  is_select_mode,
  on_toggle_select_mode,
  on_compare,
  on_clear_selection,
}: HistoryToolbarProps) => {
  const set_shortcuts_modal_open = use_history_store((s) => s.set_shortcuts_modal_open);

  const left_slot = useMemo(() => (
    <div className="flex items-center gap-2">
      <h1 className="text-lg font-semibold">History</h1>
      <span className="text-sm text-muted-foreground">
        {total.toLocaleString()} {total === 1 ? "generation" : "generations"}
      </span>
    </div>
  ), [total]);

  const right_slot = useMemo(() => (
    <>
      {is_select_mode && (
        <>
          <span className="text-sm text-muted-foreground mr-2">
            {selected_count} selected
          </span>

          {selected_count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={on_clear_selection}
            >
              <X className="size-4 mr-1" />
              Clear
            </Button>
          )}

          {selected_count === 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={on_compare}
            >
              <GitCompare className="size-4 mr-2" />
              Compare
            </Button>
          )}
        </>
      )}

      <Button
        variant={is_select_mode ? "default" : "outline"}
        size="sm"
        onClick={on_toggle_select_mode}
      >
        {is_select_mode ? (
          <>
            <CheckSquare className="size-4 mr-2" />
            Exit Select
          </>
        ) : (
          <>
            <Square className="size-4 mr-2" />
            Select
          </>
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => set_shortcuts_modal_open(true)}
        title="Keyboard shortcuts (?)"
      >
        <HelpCircle className="size-4" />
      </Button>
    </>
  ), [is_select_mode, selected_count, on_clear_selection, on_compare, on_toggle_select_mode, set_shortcuts_modal_open]);

  return <ToolbarSlots left={left_slot} right={right_slot} />;
};
