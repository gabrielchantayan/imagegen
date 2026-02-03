"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  use_references,
  delete_reference_api,
  update_reference_api,
} from "@/lib/hooks/use-references";
import { Loader2, Trash2, Pencil, Check, X, Plus, User } from "lucide-react";
import type { ReferencePhoto } from "@/lib/types/database";

type ReferenceManagerModalProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  on_upload_click: () => void;
};

export const ReferenceManagerModal = ({
  open,
  on_open_change,
  on_upload_click,
}: ReferenceManagerModalProps) => {
  const { references, is_loading, mutate } = use_references();
  const [editing_id, set_editing_id] = useState<string | null>(null);
  const [editing_name, set_editing_name] = useState("");
  const [deleting_id, set_deleting_id] = useState<string | null>(null);
  const [error, set_error] = useState<string | null>(null);

  const start_edit = (ref: ReferencePhoto) => {
    set_editing_id(ref.id);
    set_editing_name(ref.name);
    set_error(null);
  };

  const cancel_edit = () => {
    set_editing_id(null);
    set_editing_name("");
  };

  const save_edit = async () => {
    if (!editing_id || !editing_name.trim()) return;

    try {
      await update_reference_api(editing_id, editing_name.trim());
      mutate();
      cancel_edit();
    } catch (err) {
      set_error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handle_delete = async (id: string) => {
    set_deleting_id(id);
    set_error(null);

    try {
      await delete_reference_api(id);
      mutate();
    } catch (err) {
      set_error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      set_deleting_id(null);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={on_open_change}>
      <AlertDialogContent className="sm:max-w-[600px] max-h-[80vh] p-0 overflow-hidden border-0 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-background shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <AlertDialogTitle className="text-lg font-semibold tracking-tight">
                Manage References
              </AlertDialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {references.length} reference photo{references.length !== 1 && "s"}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                on_open_change(false);
                on_upload_click();
              }}
            >
              <Plus className="size-4 mr-1" />
              Add New
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
              {error}
            </div>
          )}

          {is_loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : references.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="size-8 text-muted-foreground" />
              </div>
              <p className="font-medium">No reference photos yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload face references for consistent character generation
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  on_open_change(false);
                  on_upload_click();
                }}
              >
                <Plus className="size-4 mr-2" />
                Upload First Reference
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center gap-4 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="size-16 rounded-lg overflow-hidden shrink-0 border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ref.image_path}
                      alt={ref.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {editing_id === ref.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editing_name}
                          onChange={(e) => set_editing_name(e.target.value)}
                          className="h-8 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") save_edit();
                            if (e.key === "Escape") cancel_edit();
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={save_edit}
                        >
                          <Check className="size-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0"
                          onClick={cancel_edit}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium truncate">{ref.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ref.original_filename || "Unknown file"}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {editing_id !== ref.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => start_edit(ref)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handle_delete(ref.id)}
                        disabled={deleting_id === ref.id}
                      >
                        {deleting_id === ref.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/5 shrink-0">
          <Button variant="outline" onClick={() => on_open_change(false)}>
            Close
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
