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
    <div className="h-full flex flex-col p-4">
      {/* View mode toggle */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant={view_mode === "visual" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => set_view_mode("visual")}
        >
          <Eye className="size-4 mr-1.5" />
          Visual
        </Button>
        <Button
          variant={view_mode === "raw" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => set_view_mode("raw")}
        >
          <Code className="size-4 mr-1.5" />
          Raw
        </Button>
        {conflicts.length > 0 && (
          <span className="text-xs text-amber-500 ml-auto">
            {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Visual view with inline conflict resolution */}
      {view_mode === "visual" && (
        <div className="flex-1 overflow-hidden">
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
        <>
          <Textarea
            value={edited_json}
            onChange={(e) => handle_json_change(e.target.value)}
            className={`flex-1 font-mono text-sm resize-none ${
              json_error ? "border-destructive" : ""
            }`}
            placeholder="{}"
          />
          {json_error && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-destructive">{json_error}</p>
              <Button variant="outline" size="sm" onClick={handle_repair}>
                <Wrench className="size-3 mr-1" />
                Repair
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
