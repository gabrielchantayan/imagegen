'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import type { Component, Category } from '@/lib/types/database';

type ComponentEditorProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  component?: Component;  // If editing existing
  category?: Category;    // If creating new
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

  // Reset form when component/open changes
  useEffect(() => {
    if (open) {
      set_name(component?.name ?? '');
      set_description(component?.description ?? '');
      set_json_data(component ? JSON.stringify(component.data, null, 2) : '{}');
      set_json_error('');
      set_saving(false);
    }
  }, [open, component]);

  const is_editing = !!component;
  const title = is_editing ? `Edit ${component.name}` : `New ${category?.name}`;

  const handle_save = async () => {
    // Validate JSON
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
  };

  const handle_delete = async () => {
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
  };

  return (
    <AlertDialog open={open} onOpenChange={on_open_change}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => set_name(e.target.value)}
              placeholder="Component name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => set_description(e.target.value)}
              placeholder="Brief description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data">JSON Data</Label>
            <Textarea
              id="data"
              value={json_data}
              onChange={(e) => {
                set_json_data(e.target.value);
                set_json_error('');
              }}
              className="font-mono text-sm min-h-[200px]"
              placeholder="{}"
            />
            {json_error && (
              <p className="text-sm text-destructive">{json_error}</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          {is_editing && on_delete && (
            <Button
              variant="destructive"
              onClick={handle_delete}
              disabled={saving}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => on_open_change(false)}>
            Cancel
          </Button>
          <Button onClick={handle_save} disabled={saving || !name}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
