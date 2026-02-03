'use client';

import { useState, useEffect, useMemo } from 'react';
import { jsonrepair } from 'jsonrepair';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Wrench, Sparkles, Send, User, Plus, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { ReferencePickerModal } from '@/components/references/reference-picker-modal';
import {
  use_references,
  attach_reference_api,
  detach_reference_api,
} from '@/lib/hooks/use-references';
import type { Component, Category } from '@/lib/types/database';
import { cn } from '@/lib/utils';

const REFERENCE_CATEGORIES = ['characters', 'physical_traits'];

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
  
  // Magic Edit State
  const [magic_instructions, set_magic_instructions] = useState('');
  const [magic_loading, set_magic_loading] = useState(false);
  const [magic_error, set_magic_error] = useState('');
  const [magic_open, set_magic_open] = useState(false);

  // Reference Linking State
  const [picker_open, set_picker_open] = useState(false);
  const [reference_saving, set_reference_saving] = useState(false);
  const { references, component_defaults, mutate: mutate_references } = use_references();

  const category_id = component?.category_id ?? category?.id ?? '';
  const supports_references = REFERENCE_CATEGORIES.includes(category_id);

  const linked_reference_ids = useMemo(() => {
    if (!component?.id) return [];
    return component_defaults[component.id] ?? [];
  }, [component?.id, component_defaults]);

  const linked_references = useMemo(() => {
    return references.filter((ref) => linked_reference_ids.includes(ref.id));
  }, [references, linked_reference_ids]);

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

  const handle_save_references = async (new_ids: string[]) => {
    if (!component?.id) return;

    set_reference_saving(true);
    try {
      const current_ids = new Set(linked_reference_ids);
      const new_id_set = new Set(new_ids);

      // Detach removed references
      for (const id of current_ids) {
        if (!new_id_set.has(id)) {
          await detach_reference_api(component.id, id);
        }
      }

      // Attach new references
      for (const id of new_id_set) {
        if (!current_ids.has(id)) {
          await attach_reference_api(component.id, id);
        }
      }

      await mutate_references();
    } catch (err) {
      set_json_error(err instanceof Error ? err.message : 'Failed to update references');
    } finally {
      set_reference_saving(false);
    }
  };

  const handle_remove_reference = async (reference_id: string) => {
    if (!component?.id) return;

    set_reference_saving(true);
    try {
      await detach_reference_api(component.id, reference_id);
      await mutate_references();
    } catch (err) {
      set_json_error(err instanceof Error ? err.message : 'Failed to remove reference');
    } finally {
      set_reference_saving(false);
    }
  };

  const handle_magic_edit = async () => {
    if (!magic_instructions.trim()) return;

    set_magic_loading(true);
    set_magic_error('');

    try {
      let current_json;
      try {
        current_json = JSON.parse(json_data);
      } catch {
        // Try to repair before sending if invalid
        try {
          current_json = JSON.parse(jsonrepair(json_data));
        } catch {
          set_magic_error('Invalid current JSON');
          set_magic_loading(false);
          return;
        }
      }

      const res = await fetch('/api/components/magic-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_json,
          instructions: magic_instructions,
          category_name: category?.name || component?.category_id || 'Component',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Magic edit failed');
      }

      if (data.json) {
        set_json_data(JSON.stringify(data.json, null, 2));
        set_json_error('');
        set_magic_open(false);
        set_magic_instructions('');
      }
    } catch (error) {
      set_magic_error(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      set_magic_loading(false);
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

              {/* Reference Linking - only for characters and physical_traits */}
              {supports_references && is_editing && (
                <div className="space-y-3">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Face References
                  </Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Linked references will auto-select when this component is used
                  </p>

                  {linked_references.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {linked_references.map((ref) => (
                        <div
                          key={ref.id}
                          className="group relative flex items-center gap-2 p-1.5 pr-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="size-8 rounded overflow-hidden shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ref.image_path}
                              alt={ref.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-xs font-medium truncate max-w-[80px]">
                            {ref.name}
                          </span>
                          <button
                            onClick={() => handle_remove_reference(ref.id)}
                            disabled={reference_saving}
                            className="size-4 rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed bg-muted/20 text-muted-foreground">
                      <User className="size-4" />
                      <span className="text-xs">No references linked</span>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => set_picker_open(true)}
                    disabled={reference_saving}
                    className="w-full"
                  >
                    {reference_saving ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="size-4 mr-2" />
                    )}
                    {linked_references.length > 0 ? 'Edit References' : 'Link References'}
                  </Button>
                </div>
              )}
            </div>

            {/* Right: JSON Data */}
            <div className="w-7/12 flex flex-col p-0">
               <div className="px-6 py-3 border-b bg-muted/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="data" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">JSON Configuration</Label>
                    
                    <Popover open={magic_open} onOpenChange={set_magic_open}>
                      <PopoverTrigger className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "h-6 px-2 text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                      )}>
                        <Sparkles className="size-3 mr-1" />
                        Magic Edit
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-3 bg-muted/20 border-b">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <Sparkles className="size-4 text-indigo-500" />
                            AI Magic Edit
                          </h4>
                        </div>
                        <div className="p-3 space-y-3">
                          <Textarea
                            placeholder="Describe changes (e.g., 'Make the hair longer and red', 'Add gold trim to the dress')..."
                            value={magic_instructions}
                            onChange={(e) => set_magic_instructions(e.target.value)}
                            className="min-h-[80px] resize-none text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handle_magic_edit();
                              }
                            }}
                          />
                          {magic_error && (
                            <p className="text-xs text-destructive">{magic_error}</p>
                          )}
                          <div className="flex justify-end">
                            <Button 
                              size="sm" 
                              onClick={handle_magic_edit} 
                              disabled={magic_loading || !magic_instructions.trim()}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8"
                            >
                              {magic_loading ? (
                                <Loader2 className="size-3 animate-spin mr-1" />
                              ) : (
                                <Send className="size-3 mr-1" />
                              )}
                              Apply
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

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

      {/* Reference Picker Modal */}
      {supports_references && is_editing && (
        <ReferencePickerModal
          open={picker_open}
          on_open_change={set_picker_open}
          selected_ids={linked_reference_ids}
          on_save={handle_save_references}
          title={`Link References to ${component?.name}`}
        />
      )}
    </AlertDialog>
  );
};
