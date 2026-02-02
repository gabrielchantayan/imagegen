"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

import type { ConflictInfo, ResolutionStrategy } from "@/lib/stores/builder-store";

type ConflictResolverProps = {
  conflict: ConflictInfo;
  resolution: ResolutionStrategy;
  on_change: (resolution: ResolutionStrategy) => void;
};

const RESOLUTION_LABELS: Record<ResolutionStrategy, string> = {
  use_first: "Use first",
  use_last: "Use last",
  combine: "Combine",
};

export const ConflictResolver = ({
  conflict,
  resolution,
  on_change,
}: ConflictResolverProps) => {
  return (
    <Alert variant="warning" className="py-3">
      <AlertTriangle className="size-4" />
      <AlertDescription className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <span>
            <strong>{conflict.field}</strong>: {conflict.values.length} conflicting values
          </span>
          <Select value={resolution} onValueChange={(v) => on_change(v as ResolutionStrategy)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="use_first">{RESOLUTION_LABELS.use_first}</SelectItem>
              <SelectItem value="use_last">{RESOLUTION_LABELS.use_last}</SelectItem>
              <SelectItem value="combine">{RESOLUTION_LABELS.combine}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs space-y-1">
          {conflict.values.map((v, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-muted-foreground">{v.source}:</span>
              <span className="truncate">&ldquo;{v.value}&rdquo;</span>
            </div>
          ))}
        </div>
        <div className="text-xs border-t pt-2 mt-1">
          <span className="text-muted-foreground">Result: </span>
          <span className="font-medium">&ldquo;{conflict.resolved_value}&rdquo;</span>
        </div>
      </AlertDescription>
    </Alert>
  );
};
