"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

import type { ConflictInfo } from "@/lib/stores/builder-store";

type ConflictWarningProps = {
  conflict: ConflictInfo;
};

export const ConflictWarning = ({ conflict }: ConflictWarningProps) => {
  // Display first two conflicting values for summary
  const first_value = conflict.values[0];
  const last_value = conflict.values[conflict.values.length - 1];

  return (
    <Alert variant="warning">
      <AlertTriangle className="size-4" />
      <AlertDescription>
        <strong>Conflict:</strong> Field &ldquo;{conflict.field}&rdquo; has value &ldquo;
        {first_value?.value}&rdquo; but &ldquo;{last_value?.source}&rdquo; sets it to &ldquo;
        {last_value?.value}&rdquo;. Using: &ldquo;{conflict.resolved_value}&rdquo;.
      </AlertDescription>
    </Alert>
  );
};
