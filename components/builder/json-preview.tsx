"use client";

import { useState, useEffect } from "react";

import { jsonrepair } from "jsonrepair";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { InlineJsonView } from "./inline-json-view";
import { use_builder_store } from "@/lib/stores/builder-store";
import { format_prompt_json, parse_prompt_json } from "@/lib/prompt-composer";
import { Code, Eye, Wrench } from "lucide-react";

import type { ResolutionStrategy } from "@/lib/stores/builder-store";

export const JsonPreview = () => {
  const composed_prompt = use_builder_store((s) => s.composed_prompt);
  const conflicts = use_builder_store((s) => s.conflicts);
  const conflict_resolutions = use_builder_store((s) => s.conflict_resolutions);
  const set_conflict_resolution = use_builder_store((s) => s.set_conflict_resolution);

  const [view_mode, set_view_mode] = useState<"visual" | "raw">("visual");
  const [edited_json, set_edited_json] = useState("");
  const [json_error, set_json_error] = useState("");

  // Sync composed prompt to editor
  useEffect(() => {
    if (composed_prompt) {
      set_edited_json(format_prompt_json(composed_prompt));
      set_json_error("");
    } else {
      set_edited_json("{}");
    }
  }, [composed_prompt]);

  const handle_json_change = (value: string) => {
    set_edited_json(value);

    // Validate JSON
    const parsed = parse_prompt_json(value);
    if (parsed === null) {
      set_json_error("Invalid JSON");
    } else {
      set_json_error("");
    }
  };

  const handle_repair = () => {
    try {
      const repaired = jsonrepair(edited_json);
      set_edited_json(repaired);
      set_json_error("");
    } catch {
      set_json_error("Could not repair JSON");
    }
  };

  const handle_resolution_change = (conflict_id: string, resolution: ResolutionStrategy) => {
    set_conflict_resolution(conflict_id, resolution);
  };

  return (
    <div className="h-full flex flex-col p-4 bg-muted/5">
      {/* View mode toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-muted p-1 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => set_view_mode("visual")}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${
              view_mode === "visual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            }`}
          >
            <Eye className="size-3.5 mr-1.5" />
            Visual
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => set_view_mode("raw")}
            className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${
              view_mode === "raw"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-transparent"
            }`}
          >
            <Code className="size-3.5 mr-1.5" />
            Raw JSON
          </Button>
        </div>

        {conflicts.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Visual view with inline conflict resolution */}
      {view_mode === "visual" && (
        <div className="flex-1 overflow-hidden rounded-lg border bg-card shadow-sm">
          <InlineJsonView
            data={composed_prompt}
            conflicts={conflicts}
            resolutions={conflict_resolutions}
            on_resolution_change={handle_resolution_change}
          />
        </div>
      )}

      {/* Raw JSON editor */}
      {view_mode === "raw" && (
        <div className="flex-1 flex flex-col min-h-0">
          <Textarea
            value={edited_json}
            onChange={(e) => handle_json_change(e.target.value)}
            className={`flex-1 font-mono text-sm leading-relaxed resize-none bg-card p-4 rounded-lg border shadow-sm focus-visible:ring-1 ${
              json_error ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
            placeholder="{}"
            spellCheck={false}
          />
          {json_error && (
            <div className="mt-3 flex items-center justify-between p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-xs font-medium text-destructive flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-destructive" />
                {json_error}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handle_repair}
                className="h-7 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              >
                <Wrench className="size-3 mr-1.5" />
                Auto-fix
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
