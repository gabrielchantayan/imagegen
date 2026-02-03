"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { use_references } from "@/lib/hooks/use-references";
import { Loader2, Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReferencePhoto } from "@/lib/types/database";

type ReferencePickerModalProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
  selected_ids: string[];
  on_save: (ids: string[]) => void;
  title?: string;
};

export const ReferencePickerModal = ({
  open,
  on_open_change,
  selected_ids,
  on_save,
  title = "Link References",
}: ReferencePickerModalProps) => {
  const { references, is_loading } = use_references();
  const [search, set_search] = useState("");
  const [local_selection, set_local_selection] = useState<Set<string>>(
    new Set(selected_ids)
  );

  // Sync local selection when modal opens
  const handle_open_change = (new_open: boolean) => {
    if (new_open) {
      set_local_selection(new Set(selected_ids));
      set_search("");
    }
    on_open_change(new_open);
  };

  const toggle_selection = (id: string) => {
    set_local_selection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handle_save = () => {
    on_save([...local_selection]);
    on_open_change(false);
  };

  const filtered_references = useMemo(() => {
    if (!search.trim()) return references;
    const lower = search.toLowerCase();
    return references.filter((ref) => ref.name.toLowerCase().includes(lower));
  }, [references, search]);

  const selection_changed = useMemo(() => {
    const original = new Set(selected_ids);
    if (original.size !== local_selection.size) return true;
    for (const id of local_selection) {
      if (!original.has(id)) return true;
    }
    return false;
  }, [selected_ids, local_selection]);

  return (
    <AlertDialog open={open} onOpenChange={handle_open_change}>
      <AlertDialogContent className="sm:max-w-[700px] max-h-[80vh] p-0 overflow-hidden border-0 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-background shrink-0">
          <AlertDialogTitle className="text-lg font-semibold tracking-tight">
            {title}
          </AlertDialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Select face references to link with this component
          </p>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b shrink-0">
          <Input
            placeholder="Search references..."
            value={search}
            onChange={(e) => set_search(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {is_loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered_references.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="size-8 text-muted-foreground" />
              </div>
              <p className="font-medium">
                {search ? "No matches found" : "No references available"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {search
                  ? `No references match "${search}"`
                  : "Upload face references first"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filtered_references.map((ref) => (
                <ReferencePickerCard
                  key={ref.id}
                  reference={ref}
                  is_selected={local_selection.has(ref.id)}
                  on_toggle={() => toggle_selection(ref.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/5 shrink-0 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {local_selection.size} selected
          </span>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => on_open_change(false)}>
              Cancel
            </Button>
            <Button onClick={handle_save} disabled={!selection_changed}>
              Save
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

type ReferencePickerCardProps = {
  reference: ReferencePhoto;
  is_selected: boolean;
  on_toggle: () => void;
};

const ReferencePickerCard = ({
  reference,
  is_selected,
  on_toggle,
}: ReferencePickerCardProps) => {
  return (
    <button
      onClick={on_toggle}
      className={cn(
        "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all bg-muted",
        "hover:ring-2 hover:ring-primary/50 hover:ring-offset-1",
        is_selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-transparent hover:border-primary/30"
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={reference.image_path}
        alt={reference.name}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
      />

      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-1.5 right-1.5 size-5 rounded-full flex items-center justify-center transition-all",
          is_selected
            ? "bg-primary text-primary-foreground"
            : "bg-black/50 text-white/70 opacity-0 group-hover:opacity-100"
        )}
      >
        {is_selected && <Check className="size-3" />}
      </div>

      {/* Name overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 pt-6">
        <p className="text-xs font-medium text-white truncate">
          {reference.name}
        </p>
      </div>

      {/* Selected overlay */}
      {is_selected && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
      )}
    </button>
  );
};
