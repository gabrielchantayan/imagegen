'use client';

import { useState, useEffect, useCallback } from 'react';
import { jsonrepair } from 'jsonrepair';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { ReferencePickerModal } from '@/components/references/reference-picker-modal';
import { use_component_references } from '@/lib/hooks/use-component-references';
import { ComponentEditorForm } from './component-editor-form';
import { ComponentReferencesSection } from './component-references-section';
import type { Component, Category } from '@/lib/types/database';

const REFERENCE_CATEGORIES = ['characters', 'physical_traits'];

type ComponentEditorProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  component?: Component;
  category?: Category;
  on_save: (data: {
    name: string;
    description: string;
    data: Record<string, unknown>;
  }) => Promise<void>;
  on_delete?: () => Promise<void>;
};

export const ComponentEditor = ({
  open,
  on_open_change,
  component,
  category,
  on_save,
  on_delete,
}: ComponentEditorProps) => {
  const [name, set_name] = useState('');
  const [description, set_description] = useState('');
  const [json_data, set_json_data] = useState('{}');
  const [json_error, set_json_error] = useState('');
  const [saving, set_saving] = useState(false);

  const category_id = component?.category_id ?? category?.id ?? '';
  const supports_references = REFERENCE_CATEGORIES.includes(category_id);
  const is_editing = !!component;
  const title = is_editing ? `Edit ${component.name}` : `New ${category?.name}`;
  const category_name = category?.name || component?.category_id || 'Component';

  const {
    picker_open,
    set_picker_open,
    saving: reference_saving,
    linked_reference_ids,
    linked_references,
    save_references,
    remove_reference,
  } = use_component_references({
    component_id: component?.id,
    on_error: set_json_error,
  });

  useEffect(() => {
    if (open) {
      set_name(component?.name ?? '');
      set_description(component?.description ?? '');
      set_json_data(component ? JSON.stringify(component.data, null, 2) : '{}');
      set_json_error('');
      set_saving(false);
    }
  }, [open, component]);

  const handle_save = useCallback(async () => {
    let parsed_data: Record<string, unknown>;
    try {
      parsed_data = JSON.parse(json_data);
    } catch {
      set_json_error('Invalid JSON');
      return;
    }

    set_saving(true);
    try {
      await on_save({ name, description, data: parsed_data });
      on_open_change(false);
    } catch (err) {
      set_json_error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      set_saving(false);
    }
  }, [json_data, name, description, on_save, on_open_change]);

  const handle_delete = useCallback(async () => {
    if (!on_delete) return;
    set_saving(true);
    try {
      await on_delete();
      on_open_change(false);
    } catch (err) {
      set_json_error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      set_saving(false);
    }
  }, [on_delete, on_open_change]);

  const handle_repair = useCallback(() => {
    try {
      const repaired = jsonrepair(json_data);
      set_json_data(repaired);
      set_json_error('');
    } catch {
      set_json_error('Could not repair JSON');
    }
  }, [json_data]);

  const handle_json_change = useCallback((json: string) => {
    set_json_data(json);
    set_json_error('');
  }, []);

  return (
    <AlertDialog open={open} onOpenChange={on_open_change}>
      <AlertDialogContent className="max-w-4xl p-0 overflow-hidden border-0 shadow-2xl">
        <div className="flex flex-col h-[600px]">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-background z-10">
            <div>
              <AlertDialogTitle className="text-lg font-semibold tracking-tight">
                {title}
              </AlertDialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {is_editing
                  ? 'Modify existing component properties'
                  : 'Define a new component for your library'}
              </p>
            </div>
          </div>

          <ComponentEditorForm
            name={name}
            description={description}
            json_data={json_data}
            json_error={json_error}
            on_name_change={set_name}
            on_description_change={set_description}
            on_json_change={handle_json_change}
            on_json_repair={handle_repair}
            category_name={category_name}
          >
            {supports_references && is_editing && (
              <ComponentReferencesSection
                linked_references={linked_references}
                on_attach={() => set_picker_open(true)}
                on_detach={remove_reference}
                reference_saving={reference_saving}
              />
            )}
          </ComponentEditorForm>

          <div className="px-6 py-4 border-t bg-muted/5 flex items-center justify-end gap-3">
            {is_editing && on_delete && (
              <Button
                variant="ghost"
                onClick={handle_delete}
                disabled={saving}
                className="mr-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Delete Component
              </Button>
            )}
            <Button variant="outline" onClick={() => on_open_change(false)}>
              Cancel
            </Button>
            <Button onClick={handle_save} disabled={saving || !name}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 animate-spin size-4" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </AlertDialogContent>

      {supports_references && is_editing && (
        <ReferencePickerModal
          open={picker_open}
          on_open_change={set_picker_open}
          selected_ids={linked_reference_ids}
          on_save={save_references}
          title={`Link References to ${component?.name}`}
        />
      )}
    </AlertDialog>
  );
};
