import { useState, useCallback } from 'react';

type UseComponentInlineReferencesOptions = {
  component_id: string | undefined;
  inline_references: string[];
  on_change: (updated_references: string[]) => void;
  on_error?: (message: string) => void;
};

export const use_component_inline_references = ({
  component_id,
  inline_references,
  on_change,
  on_error,
}: UseComponentInlineReferencesOptions) => {
  const [uploading, set_uploading] = useState(false);
  const [removing, set_removing] = useState<string | null>(null);

  const upload_reference = useCallback(async (file: File) => {
    if (!component_id) return;

    set_uploading(true);
    try {
      const form_data = new FormData();
      form_data.append('file', file);

      const res = await fetch(`/api/components/${component_id}/inline-references`, {
        method: 'POST',
        body: form_data,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      on_change(data.inline_references);
    } catch (err) {
      on_error?.(err instanceof Error ? err.message : 'Failed to upload reference');
    } finally {
      set_uploading(false);
    }
  }, [component_id, on_change, on_error]);

  const remove_reference = useCallback(async (image_path: string) => {
    if (!component_id) return;

    set_removing(image_path);
    try {
      const res = await fetch(`/api/components/${component_id}/inline-references${image_path}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }

      const data = await res.json();
      on_change(data.inline_references);
    } catch (err) {
      on_error?.(err instanceof Error ? err.message : 'Failed to remove reference');
    } finally {
      set_removing(null);
    }
  }, [component_id, on_change, on_error]);

  return {
    uploading,
    removing,
    inline_references,
    upload_reference,
    remove_reference,
  };
};
