"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { use_builder_store } from "@/lib/stores/builder-store";
import { use_references } from "@/lib/hooks/use-references";

const REFERENCE_CATEGORIES = ["characters", "physical_traits"];

/**
 * Hook that automatically syncs face references based on selected components.
 *
 * When a character or physical_trait component with linked references is selected,
 * those references are automatically added to the builder's selected references.
 *
 * Tracks auto-added vs manually-added references so that:
 * - Auto references are removed when their source component is deselected
 * - Manual references persist regardless of component changes
 */
export const use_reference_auto_sync = () => {
  const { component_defaults } = use_references();
  const subjects = use_builder_store((s) => s.subjects);
  const selected_reference_ids = use_builder_store((s) => s.selected_reference_ids);
  const set_references = use_builder_store((s) => s.set_references);

  // Track manually added reference IDs
  const [manual_ids, set_manual_ids] = useState<Set<string>>(new Set());

  // Track if this is the first render to avoid overwriting persisted state
  const is_initialized = useRef(false);

  // Compute auto-selected reference IDs from all selected components
  const auto_ids = useMemo(() => {
    const ids = new Set<string>();

    for (const subject of subjects) {
      for (const category of REFERENCE_CATEGORIES) {
        const components = subject.selections[category] ?? [];
        for (const component of components) {
          const ref_ids = component_defaults[component.id] ?? [];
          for (const ref_id of ref_ids) {
            ids.add(ref_id);
          }
        }
      }
    }

    return ids;
  }, [subjects, component_defaults]);

  // Sync selected references: auto + manual
  useEffect(() => {
    // Skip first render to allow hydration of persisted state
    if (!is_initialized.current) {
      is_initialized.current = true;

      // On first render, any existing selections not from auto are manual
      const initial_manual = new Set<string>();
      for (const id of selected_reference_ids) {
        if (!auto_ids.has(id)) {
          initial_manual.add(id);
        }
      }
      if (initial_manual.size > 0) {
        set_manual_ids(initial_manual);
      }
      return;
    }

    // Compute new selection: all auto + all manual
    const new_selection = new Set([...auto_ids, ...manual_ids]);
    const new_array = [...new_selection];

    // Only update if changed
    const current_set = new Set(selected_reference_ids);
    const has_changed =
      new_selection.size !== current_set.size ||
      new_array.some((id) => !current_set.has(id));

    if (has_changed) {
      set_references(new_array);
    }
  }, [auto_ids, manual_ids, set_references, selected_reference_ids]);

  // Add a reference manually
  const add_manual = useCallback((id: string) => {
    set_manual_ids((prev) => {
      if (prev.has(id)) return prev;
      return new Set([...prev, id]);
    });
  }, []);

  // Remove a reference (from manual or auto)
  const remove_reference = useCallback(
    (id: string) => {
      // Remove from manual if present
      set_manual_ids((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      // If it's an auto reference, we can't remove it from auto_ids directly
      // (it will come back if the component is still selected)
      // So we track "blocked" auto refs that the user explicitly removed
      // For simplicity, just remove from the current selection
      if (auto_ids.has(id)) {
        // Can't block auto refs in this simple implementation
        // The reference will reappear if the component is reselected
        const new_selection = selected_reference_ids.filter((ref_id) => ref_id !== id);
        set_references(new_selection);
      }
    },
    [auto_ids, selected_reference_ids, set_references]
  );

  // Clear all manual references
  const clear_manual = useCallback(() => {
    set_manual_ids(new Set());
  }, []);

  return {
    auto_ids,
    manual_ids,
    add_manual,
    remove_reference,
    clear_manual,
  };
};
