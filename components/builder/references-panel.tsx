"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { use_builder_store } from "@/lib/stores/builder-store";
import { use_references } from "@/lib/hooks/use-references";
import { use_reference_auto_sync } from "@/lib/hooks/use-reference-auto-sync";
import { ReferenceUploadModal } from "@/components/references/reference-upload-modal";
import { ReferenceManagerModal } from "@/components/references/reference-manager-modal";
import { Plus, Settings, X, Loader2, User, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReferencePhoto } from "@/lib/types/database";

export const ReferencesPanel = () => {
  const [upload_open, set_upload_open] = useState(false);
  const [manager_open, set_manager_open] = useState(false);
  const [search, set_search] = useState("");

  const { references, is_loading } = use_references();
  const selected_reference_ids = use_builder_store((s) => s.selected_reference_ids);
  const clear_references = use_builder_store((s) => s.clear_references);

  // Use auto-sync hook for automatic reference management
  const { auto_ids, manual_ids, add_manual, remove_reference, clear_manual } =
    use_reference_auto_sync();

  const handle_toggle = (id: string) => {
    if (selected_reference_ids.includes(id)) {
      remove_reference(id);
    } else {
      add_manual(id);
    }
  };

  const handle_clear_all = () => {
    clear_manual();
    clear_references();
  };

  // Filter references by search
  const filtered_references = references.filter((ref) =>
    ref.name.toLowerCase().includes(search.toLowerCase())
  );

  if (is_loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none p-4 pb-0 bg-background/80 backdrop-blur-sm z-10 sticky top-0">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search references..."
              value={search}
              onChange={(e) => set_search(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex-1 flex items-center justify-end gap-2">
            {selected_reference_ids.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <Badge variant="secondary" className="px-3 py-1">
                  {selected_reference_ids.length} selected
                  {auto_ids.size > 0 && (
                    <span className="ml-1 text-muted-foreground">
                      ({auto_ids.size} auto)
                    </span>
                  )}
                </Badge>
                {manual_ids.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handle_clear_all}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4 mr-1" />
                    Clear Manual
                  </Button>
                )}
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => set_manager_open(true)}
            >
              <Settings className="size-4 mr-2" />
              Manage
            </Button>

            <Button onClick={() => set_upload_open(true)}>
              <Plus className="size-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>
        <div className="h-px bg-border w-full" />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {filtered_references.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center animate-in fade-in duration-300">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              {search ? <User className="size-8" /> : <Plus className="size-8" />}
            </div>
            <h3 className="font-semibold text-lg mb-1">
              {search ? "No matches found" : "No reference photos yet"}
            </h3>
            <p className="max-w-xs mx-auto mb-6">
              {search
                ? `We couldn't find any references matching "${search}"`
                : "Upload face reference photos for consistent character generation."}
            </p>
            {search ? (
              <Button variant="outline" onClick={() => set_search("")}>
                Clear Search
              </Button>
            ) : (
              <Button onClick={() => set_upload_open(true)}>
                <Plus className="size-4 mr-2" />
                Upload First Reference
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered_references.map((ref) => (
              <ReferenceCard
                key={ref.id}
                reference={ref}
                is_selected={selected_reference_ids.includes(ref.id)}
                is_auto={auto_ids.has(ref.id)}
                on_toggle={() => handle_toggle(ref.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info bar */}
      {selected_reference_ids.length > 0 && (
        <div className="flex-none p-3 border-t bg-muted/30 text-sm text-muted-foreground">
          <User className="size-4 inline mr-2" />
          {selected_reference_ids.length} reference
          {selected_reference_ids.length !== 1 && "s"} will be used for generation
        </div>
      )}

      {/* Modals */}
      <ReferenceUploadModal open={upload_open} on_open_change={set_upload_open} />
      <ReferenceManagerModal
        open={manager_open}
        on_open_change={set_manager_open}
        on_upload_click={() => set_upload_open(true)}
      />
    </div>
  );
};

type ReferenceCardProps = {
  reference: ReferencePhoto;
  is_selected: boolean;
  is_auto: boolean;
  on_toggle: () => void;
};

const ReferenceCard = ({
  reference,
  is_selected,
  is_auto,
  on_toggle,
}: ReferenceCardProps) => {
  return (
    <button
      onClick={on_toggle}
      className={cn(
        "group relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-muted",
        "hover:ring-2 hover:ring-primary/50 hover:ring-offset-2",
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
          "absolute top-2 right-2 size-6 rounded-full flex items-center justify-center transition-all",
          is_selected
            ? "bg-primary text-primary-foreground"
            : "bg-black/50 text-white/70 opacity-0 group-hover:opacity-100"
        )}
      >
        {is_selected && <Check className="size-4" />}
      </div>

      {/* Auto badge */}
      {is_auto && is_selected && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-500/90 text-white text-[10px] font-medium">
          <Sparkles className="size-2.5" />
          Auto
        </div>
      )}

      {/* Name and info overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 pt-8">
        <p className="text-sm font-medium text-white truncate">{reference.name}</p>
        {is_auto && !is_selected && (
          <p className="text-xs text-white/70 mt-0.5">Linked to component</p>
        )}
      </div>

      {/* Selected overlay */}
      {is_selected && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
      )}
    </button>
  );
};
