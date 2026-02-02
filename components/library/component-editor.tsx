'use client';

import { useState, useEffect } from 'react';
import { jsonrepair } from 'jsonrepair';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wrench } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
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

  const handle_repair = () => {
    try {
      const repaired = jsonrepair(json_data);
      set_json_data(repaired);
      set_json_error('');
    } catch {
      set_json_error('Could not repair JSON');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={on_open_change}>
      <AlertDialogContent className="max-w-4xl p-0 overflow-hidden border-0 shadow-2xl">
        <div className="flex flex-col h-[600px]">
           {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-background z-10">
            <div>
               <AlertDialogTitle className="text-lg font-semibold tracking-tight">
                {title}
               </AlertDialogTitle>
               <p className="text-sm text-muted-foreground mt-1">
                 {is_editing ? "Modify existing component properties" : "Define a new component for your library"}
               </p>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
             {/* Left: Metadata */}
            <div className="w-5/12 border-r bg-muted/10 p-6 space-y-6 overflow-y-auto">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => set_name(e.target.value)}
                  placeholder="e.g., Red Silk Dress"
                  className="bg-background"
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="description" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => set_description(e.target.value)}
                  placeholder="A brief description of this component..."
                  className="bg-background min-h-[120px] resize-none"
                />
              </div>
            </div>

            {/* Right: JSON Data */}
            <div className="w-7/12 flex flex-col p-0">
               <div className="px-6 py-3 border-b bg-muted/5 flex items-center justify-between">
                  <Label htmlFor="data" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">JSON Configuration</Label>
                   {json_error && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                      <p className="text-xs font-medium text-destructive">{json_error}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handle_repair}
                        className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Wrench className="size-3 mr-1" />
                        Auto-fix
                      </Button>
                    </div>
                  )}
               </div>
              <div className="flex-1 relative">
                <Textarea
                  id="data"
                  value={json_data}
                  onChange={(e) => {
                    set_json_data(e.target.value);
                    set_json_error('');
                  }}
                  className="absolute inset-0 w-full h-full font-mono text-sm resize-none border-0 rounded-none focus-visible:ring-0 p-6 leading-relaxed"
                  placeholder="{}"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
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
    </AlertDialog>
  );
};
