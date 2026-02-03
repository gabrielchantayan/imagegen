import { useState, useMemo, useCallback } from 'react';
import {
  use_references,
  attach_reference_api,
  detach_reference_api,
} from '@/lib/hooks/use-references';

type UseComponentReferencesOptions = {
  component_id: string | undefined;
  on_error?: (message: string) => void;
};

export const use_component_references = ({
  component_id,
  on_error,
}: UseComponentReferencesOptions) => {
  const [picker_open, set_picker_open] = useState(false);
  const [saving, set_saving] = useState(false);

  const { references, component_defaults, mutate: mutate_references } = use_references();

  const linked_reference_ids = useMemo(() => {
    if (!component_id) return [];
    return component_defaults[component_id] ?? [];
  }, [component_id, component_defaults]);

  const linked_references = useMemo(() => {
    return references.filter((ref) => linked_reference_ids.includes(ref.id));
  }, [references, linked_reference_ids]);

  const save_references = useCallback(async (new_ids: string[]) => {
    if (!component_id) return;

    set_saving(true);
    try {
      const current_ids = new Set(linked_reference_ids);
      const new_id_set = new Set(new_ids);

      for (const id of current_ids) {
        if (!new_id_set.has(id)) {
          await detach_reference_api(component_id, id);
        }
      }

      for (const id of new_id_set) {
        if (!current_ids.has(id)) {
          await attach_reference_api(component_id, id);
        }
      }

      await mutate_references();
    } catch (err) {
      on_error?.(err instanceof Error ? err.message : 'Failed to update references');
    } finally {
      set_saving(false);
    }
  }, [component_id, linked_reference_ids, mutate_references, on_error]);

  const remove_reference = useCallback(async (reference_id: string) => {
    if (!component_id) return;

    set_saving(true);
    try {
      await detach_reference_api(component_id, reference_id);
      await mutate_references();
    } catch (err) {
      on_error?.(err instanceof Error ? err.message : 'Failed to remove reference');
    } finally {
      set_saving(false);
    }
  }, [component_id, mutate_references, on_error]);

  return {
    picker_open,
    set_picker_open,
    saving,
    linked_reference_ids,
    linked_references,
    save_references,
    remove_reference,
  };
};
