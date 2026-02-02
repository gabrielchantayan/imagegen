"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

import type { ConflictInfo } from "@/lib/stores/builder-store";

type ConflictWarningProps = {
  conflict: ConflictInfo;
};

export const ConflictWarning = ({ conflict }: ConflictWarningProps) => {
  return (
    <Alert variant="warning">
      <AlertTriangle className="size-4" />
      <AlertDescription>
        <strong>Conflict:</strong> Field &ldquo;{conflict.field}&rdquo; has value &ldquo;
        {conflict.existing_value}&rdquo; but &ldquo;{conflict.source}&rdquo; sets it to &ldquo;
        {conflict.new_value}&rdquo;. The latter will be used.
      </AlertDescription>
    </Alert>
  );
};
