"use client";

import { cn } from "@/lib/utils";

type ProcessingIndicatorProps = {
  status: "queued" | "processing";
  size?: "sm" | "md";
};

export const ProcessingIndicator = ({ status, size = "md" }: ProcessingIndicatorProps) => {
  const is_processing = status === "processing";
  const size_classes = size === "sm" ? "h-2 w-2" : "h-3 w-3";
  const ping_classes = size === "sm" ? "h-full w-full" : "h-full w-full";

  return (
    <span className={cn("relative flex", size_classes)}>
      {is_processing && (
        <span
          className={cn(
            "animate-ping absolute inline-flex rounded-full opacity-75",
            ping_classes,
            "bg-green-500"
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          size_classes,
          is_processing ? "bg-green-500" : "bg-amber-500"
        )}
      />
    </span>
  );
};
