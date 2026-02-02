"use client";

import { useState, useEffect } from "react";

import { Textarea } from "@/components/ui/textarea";
import { ConflictWarning } from "./conflict-warning";
import { use_builder_store } from "@/lib/stores/builder-store";
import { format_prompt_json, parse_prompt_json } from "@/lib/prompt-composer";

export const JsonPreview = () => {
  const composed_prompt = use_builder_store((s) => s.composed_prompt);
  const conflicts = use_builder_store((s) => s.conflicts);

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

  return (
    <div className="h-full flex flex-col p-4">
      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="mb-4 space-y-2">
          {conflicts.map((conflict, i) => (
            <ConflictWarning key={i} conflict={conflict} />
          ))}
        </div>
      )}

      {/* JSON editor */}
      <Textarea
        value={edited_json}
        onChange={(e) => handle_json_change(e.target.value)}
        className={`flex-1 font-mono text-sm resize-none ${
          json_error ? "border-destructive" : ""
        }`}
        placeholder="{}"
      />

      {json_error && <p className="mt-2 text-sm text-destructive">{json_error}</p>}
    </div>
  );
};
