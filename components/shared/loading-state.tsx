import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingStateProps = {
  message?: string;
  size?: "sm" | "md" | "lg";
};

const size_classes = {
  sm: "size-6",
  md: "size-10",
  lg: "size-14",
} as const;

export function LoadingState({ message, size = "md" }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <Loader2
        className={cn(
          "animate-spin text-primary mb-4",
          size_classes[size]
        )}
      />
      {message && (
        <p className="font-medium text-foreground">{message}</p>
      )}
    </div>
  );
}
