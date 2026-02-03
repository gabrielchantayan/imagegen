import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  message: string;
  on_retry?: () => void;
};

export function ErrorState({ message, on_retry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
        <AlertCircle className="size-6 text-destructive" />
      </div>
      <p className="text-destructive font-medium">{message}</p>
      {on_retry && (
        <Button
          variant="outline"
          onClick={on_retry}
          className="mt-4"
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
