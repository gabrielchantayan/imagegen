"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { use_builder_store } from "@/lib/stores/builder-store";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Check,
  Merge,
  MoreHorizontal,
} from "lucide-react";

import type { ConflictInfo, ResolutionStrategy } from "@/lib/stores/builder-store";

type ConflictItemProps = {
  conflict: ConflictInfo;
  current_resolution: ResolutionStrategy;
  on_resolution_change: (resolution: ResolutionStrategy) => void;
  on_apply_to_similar: (resolution: ResolutionStrategy) => void;
};

const RESOLUTION_LABELS: Record<ResolutionStrategy, string> = {
  use_first: "Use First",
  use_last: "Use Last",
  combine: "Combine All",
};

const RESOLUTION_DESCRIPTIONS: Record<ResolutionStrategy, string> = {
  use_first: "Use the first component's value",
  use_last: "Use the last component's value",
  combine: "Merge all values together",
};

const ConflictItem = ({
  conflict,
  current_resolution,
  on_resolution_change,
  on_apply_to_similar,
}: ConflictItemProps) => {
  const [is_open, set_is_open] = useState(true);

  // Parse the field path for display
  const field_path_parts = conflict.id.split(".");
  const field_name = conflict.field;
  const context = field_path_parts.slice(0, -1).join(" > ");

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <Collapsible open={is_open} onOpenChange={set_is_open}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger>
              <button
                type="button"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {is_open ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
                <AlertTriangle className="size-4 text-amber-500" />
                <div className="text-left">
                  <CardTitle className="text-sm font-medium">{field_name}</CardTitle>
                  {context && (
                    <p className="text-xs text-muted-foreground">{context}</p>
                  )}
                </div>
              </button>
            </CollapsibleTrigger>

            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="text-xs bg-amber-500/20 text-amber-700 border-amber-500/30"
              >
                {conflict.values.length} values
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => on_apply_to_similar("use_first")}>
                    Apply "Use First" to similar conflicts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => on_apply_to_similar("use_last")}>
                    Apply "Use Last" to similar conflicts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => on_apply_to_similar("combine")}>
                    Apply "Combine" to similar conflicts
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="space-y-3">
              {/* Conflicting values */}
              <div className="grid gap-2">
                {conflict.values.map((value, idx) => {
                  const is_selected =
                    (current_resolution === "use_first" && idx === 0) ||
                    (current_resolution === "use_last" && idx === conflict.values.length - 1);

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (idx === 0) {
                          on_resolution_change("use_first");
                        } else if (idx === conflict.values.length - 1) {
                          on_resolution_change("use_last");
                        }
                      }}
                      className={cn(
                        "flex items-start justify-between p-3 rounded-lg border text-left transition-all",
                        is_selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {value.source}
                          </span>
                          {idx === 0 && (
                            <Badge variant="outline" className="text-[10px] h-4">
                              First
                            </Badge>
                          )}
                          {idx === conflict.values.length - 1 && idx !== 0 && (
                            <Badge variant="outline" className="text-[10px] h-4">
                              Last
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-mono break-all">{value.value}</p>
                      </div>
                      {is_selected && (
                        <Check className="size-4 text-primary shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Resolution options */}
              <Separator />

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Resolution:</span>
                <div className="flex gap-1">
                  {(["use_first", "use_last", "combine"] as ResolutionStrategy[]).map(
                    (strategy) => (
                      <Tooltip key={strategy}>
                        <TooltipTrigger>
                          <Button
                            variant={current_resolution === strategy ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => on_resolution_change(strategy)}
                          >
                            {strategy === "combine" && (
                              <Merge className="size-3 mr-1" />
                            )}
                            {RESOLUTION_LABELS[strategy]}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          {RESOLUTION_DESCRIPTIONS[strategy]}
                        </TooltipContent>
                      </Tooltip>
                    )
                  )}
                </div>
              </div>

              {/* Resolved value preview */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">Resolved value:</p>
                <p className="text-sm font-mono">{conflict.resolved_value}</p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export const ConflictResolutionPanel = () => {
  const conflicts = use_builder_store((s) => s.conflicts);
  const conflict_resolutions = use_builder_store((s) => s.conflict_resolutions);
  const set_conflict_resolution = use_builder_store((s) => s.set_conflict_resolution);

  const [is_expanded, set_is_expanded] = useState(true);

  if (conflicts.length === 0) {
    return null;
  }

  // Group conflicts by their prefix (subject or shared category)
  const grouped_conflicts = conflicts.reduce(
    (acc, conflict) => {
      const prefix = conflict.id.split(".")[0];
      if (!acc[prefix]) {
        acc[prefix] = [];
      }
      acc[prefix].push(conflict);
      return acc;
    },
    {} as Record<string, ConflictInfo[]>
  );

  const handle_resolution_change = (conflict_id: string, resolution: ResolutionStrategy) => {
    set_conflict_resolution(conflict_id, resolution);
  };

  const handle_apply_to_similar = (
    conflict: ConflictInfo,
    resolution: ResolutionStrategy
  ) => {
    // Apply to all conflicts with the same field name
    const field_name = conflict.field;
    for (const c of conflicts) {
      if (c.field === field_name) {
        set_conflict_resolution(c.id, resolution);
      }
    }
  };

  const handle_resolve_all = (resolution: ResolutionStrategy) => {
    for (const conflict of conflicts) {
      set_conflict_resolution(conflict.id, resolution);
    }
  };

  return (
    <div className="border-t bg-amber-500/5">
      <Collapsible open={is_expanded} onOpenChange={set_is_expanded}>
        <CollapsibleTrigger>
          <button
            type="button"
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-500/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <span className="font-medium text-sm">
                {conflicts.length} Conflict{conflicts.length !== 1 ? "s" : ""} Detected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Resolve All
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handle_resolve_all("use_first")}>
                    Use First for All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handle_resolve_all("use_last")}>
                    Use Last for All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handle_resolve_all("combine")}>
                    Combine All
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {is_expanded ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 max-h-[400px] overflow-y-auto">
            {Object.entries(grouped_conflicts).map(([prefix, group_conflicts]) => (
              <div key={prefix}>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {prefix.replace("_", " ")}
                </h4>
                <div className="space-y-2">
                  {group_conflicts.map((conflict) => (
                    <ConflictItem
                      key={conflict.id}
                      conflict={conflict}
                      current_resolution={conflict_resolutions[conflict.id] ?? "use_last"}
                      on_resolution_change={(r) => handle_resolution_change(conflict.id, r)}
                      on_apply_to_similar={(r) => handle_apply_to_similar(conflict, r)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
