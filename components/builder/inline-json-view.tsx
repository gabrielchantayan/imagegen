"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";

import type { ConflictInfo, ResolutionStrategy } from "@/lib/stores/builder-store";

type InlineJsonViewProps = {
  data: Record<string, unknown> | null;
  conflicts: ConflictInfo[];
  resolutions: Record<string, ResolutionStrategy>;
  on_resolution_change: (conflict_id: string, resolution: ResolutionStrategy) => void;
};

type JsonNodeProps = {
  value: unknown;
  path: string;
  indent: number;
  conflicts: Map<string, ConflictInfo>;
  resolutions: Record<string, ResolutionStrategy>;
  on_resolution_change: (conflict_id: string, resolution: ResolutionStrategy) => void;
  is_last: boolean;
};

const INDENT_SIZE = 2;

const ConflictIndicator = ({
  conflict,
  resolution,
  on_change,
}: {
  conflict: ConflictInfo;
  resolution: ResolutionStrategy;
  on_change: (resolution: ResolutionStrategy) => void;
}) => {
  return (
    <span className="inline-flex items-center gap-1 ml-2">
      <Tooltip>
        <TooltipTrigger className="text-amber-500 cursor-help">
          <AlertTriangle className="size-3.5 inline" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs space-y-1">
            <p className="font-medium text-background">Conflicting values:</p>
            {conflict.values.map((v, i) => (
              <div key={i} className="flex gap-1">
                <span className="text-background/70">{v.source}:</span>
                <span className="truncate text-background">&ldquo;{v.value}&rdquo;</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
      <Select value={resolution} onValueChange={(v) => on_change(v as ResolutionStrategy)}>
        <SelectTrigger className="h-5 text-xs px-1.5 py-0 w-auto gap-1 border-amber-500/50 bg-amber-500/10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="use_first">First</SelectItem>
          <SelectItem value="use_last">Last</SelectItem>
          <SelectItem value="combine">Combine</SelectItem>
        </SelectContent>
      </Select>
    </span>
  );
};

const JsonNode = ({
  value,
  path,
  indent,
  conflicts,
  resolutions,
  on_resolution_change,
  is_last,
}: JsonNodeProps) => {
  const spaces = " ".repeat(indent * INDENT_SIZE);
  const comma = is_last ? "" : ",";

  // Check if this path has a conflict
  const conflict = conflicts.get(path);

  if (value === null) {
    return (
      <span>
        <span className="text-muted-foreground italic">null</span>
        {comma}
      </span>
    );
  }

  if (typeof value === "string") {
    return (
      <span>
        <span className="text-foreground">&quot;{value}&quot;</span>
        {conflict && (
          <ConflictIndicator
            conflict={conflict}
            resolution={resolutions[conflict.id] ?? "use_last"}
            on_change={(r) => on_resolution_change(conflict.id, r)}
          />
        )}
        {comma}
      </span>
    );
  }

  if (typeof value === "number") {
    return (
      <span>
        <span className="text-primary">{value}</span>
        {comma}
      </span>
    );
  }

  if (typeof value === "boolean") {
    return (
      <span>
        <span className="text-primary">{value ? "true" : "false"}</span>
        {comma}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span>{"[]"}{comma}</span>;
    }

    return (
      <span>
        {"[\n"}
        {value.map((item, i) => (
          <span key={i}>
            {spaces}{"  "}
            <JsonNode
              value={item}
              path={`${path}[${i}]`}
              indent={indent + 1}
              conflicts={conflicts}
              resolutions={resolutions}
              on_resolution_change={on_resolution_change}
              is_last={i === value.length - 1}
            />
            {"\n"}
          </span>
        ))}
        {spaces}{"]"}{comma}
      </span>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span>{"{}"}{comma}</span>;
    }

    return (
      <span>
        {"{\n"}
        {entries.map(([key, val], i) => {
          const child_path = path ? `${path}.${key}` : key;
          return (
            <span key={key}>
              {spaces}{"  "}
              <span className="text-muted-foreground">&quot;{key}&quot;</span>
              {": "}
              <JsonNode
                value={val}
                path={child_path}
                indent={indent + 1}
                conflicts={conflicts}
                resolutions={resolutions}
                on_resolution_change={on_resolution_change}
                is_last={i === entries.length - 1}
              />
              {"\n"}
            </span>
          );
        })}
        {spaces}{"}"}{comma}
      </span>
    );
  }

  return <span>{String(value)}{comma}</span>;
};

export const InlineJsonView = ({
  data,
  conflicts,
  resolutions,
  on_resolution_change,
}: InlineJsonViewProps) => {
  // Build a map of field paths to conflicts for quick lookup
  const conflict_map = new Map<string, ConflictInfo>();
  for (const conflict of conflicts) {
    // Convert conflict.id (e.g., "body.hair") to the path format used in JSON
    // The conflict.id format is "section.field", we need to map to JSON paths
    const parts = conflict.id.split(".");
    if (parts.length === 2) {
      const [section, field] = parts;
      // Map section names to JSON structure
      if (section === "body") {
        conflict_map.set(`subject.${field}`, conflict);
      } else if (section === "wardrobe") {
        conflict_map.set(`wardrobe.${field}`, conflict);
      } else if (section === "pose") {
        conflict_map.set(`pose.${field}`, conflict);
      } else if (section.startsWith("shared.")) {
        const shared_key = section.replace("shared.", "");
        conflict_map.set(`${shared_key}.${field}`, conflict);
      }
    }
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Select components to build your prompt
      </div>
    );
  }

  return (
    <div className="font-mono text-sm leading-relaxed overflow-auto h-full p-4 bg-muted/30 rounded-md border whitespace-pre-wrap break-words">
      <JsonNode
        value={data}
        path=""
        indent={0}
        conflicts={conflict_map}
        resolutions={resolutions}
        on_resolution_change={on_resolution_change}
        is_last={true}
      />
    </div>
  );
};
