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
 * Selection = (auto_ids - blocked_ids) ∪ manual_ids
 *
 * - Auto refs can be blocked by user (click to unselect)
 * - When a component is deselected, its refs are removed from both blocked_ids and manual_ids
 * - This ensures deselecting a component fully removes its linked refs
 */
export const use_reference_auto_sync = () => {
  const { component_defaults } = use_references();
  const subjects = use_builder_store((s) => s.subjects);
  const selected_reference_ids = use_builder_store((s) => s.selected_reference_ids);
  const set_references = use_builder_store((s) => s.set_references);

  // Track manually added reference IDs
  const [manual_ids, set_manual_ids] = useState<Set<string>>(new Set());

  // Track blocked auto reference IDs (user explicitly unselected these)
  const [blocked_ids, set_blocked_ids] = useState<Set<string>>(new Set());

  // Track previous auto_ids to detect when refs leave auto
  const prev_auto_ids = useRef<Set<string>>(new Set());

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

  // Sync selected references: (auto - blocked) + manual
  // Also handles cleanup when refs leave auto_ids (consolidated to avoid race conditions)
  useEffect(() => {
    // Skip first render to allow hydration of persisted state
    if (!is_initialized.current) {
      is_initialized.current = true;

      // Initialize prev_auto_ids on first render
      prev_auto_ids.current = auto_ids;

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

    // Detect refs that left auto_ids since last render
    const prev = prev_auto_ids.current;
    const refs_that_left: string[] = [];
    for (const id of prev) {
      if (!auto_ids.has(id)) {
        refs_that_left.push(id);
      }
    }
    prev_auto_ids.current = auto_ids;

    // Compute effective manual_ids and blocked_ids after cleanup
    // (do this inline to avoid race conditions with separate setState calls)
    let effective_manual = manual_ids;
    let effective_blocked = blocked_ids;
    let manual_changed = false;
    let blocked_changed = false;

    if (refs_that_left.length > 0) {
      // Clean manual_ids
      const manual_needs_update = refs_that_left.some((id) => manual_ids.has(id));
      if (manual_needs_update) {
        effective_manual = new Set(manual_ids);
        for (const id of refs_that_left) {
          effective_manual.delete(id);
        }
        manual_changed = true;
      }

      // Clean blocked_ids
      const blocked_needs_update = refs_that_left.some((id) => blocked_ids.has(id));
      if (blocked_needs_update) {
        effective_blocked = new Set(blocked_ids);
        for (const id of refs_that_left) {
          effective_blocked.delete(id);
        }
        blocked_changed = true;
      }
    }

    // Compute new selection using cleaned state: (auto - blocked) + manual
    const new_selection = new Set<string>();
    for (const id of auto_ids) {
      if (!effective_blocked.has(id)) {
        new_selection.add(id);
      }
    }
    for (const id of effective_manual) {
      new_selection.add(id);
    }
    const new_array = [...new_selection];

    // Only update if changed
    const current_set = new Set(selected_reference_ids);
    const has_changed =
      new_selection.size !== current_set.size ||
      new_array.some((id) => !current_set.has(id));

    if (has_changed) {
      set_references(new_array);
    }

    // Persist the cleaned state after selection update
    if (manual_changed) {
      set_manual_ids(effective_manual);
    }
    if (blocked_changed) {
      set_blocked_ids(effective_blocked);
    }
  }, [auto_ids, blocked_ids, manual_ids, set_references, selected_reference_ids]);

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
      if (auto_ids.has(id)) {
        // Auto ref: add to blocked_ids to prevent auto-selection
        set_blocked_ids((prev) => {
          if (prev.has(id)) return prev;
          return new Set([...prev, id]);
        });
      } else {
        // Manual ref: remove from manual_ids
        set_manual_ids((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [auto_ids]
  );

  // Clear all manual references
  const clear_manual = useCallback(() => {
    set_manual_ids(new Set());
  }, []);

  return {
    auto_ids,
    manual_ids,
    blocked_ids,
    add_manual,
    remove_reference,
    clear_manual,
  };
};
