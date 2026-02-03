import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon: LucideIcon;
  heading: string;
  description?: string;
  action?: { label: string; on_click: () => void };
};

export function EmptyState({
  icon: Icon,
  heading,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center animate-in fade-in duration-300">
      <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="size-8" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{heading}</h3>
      {description && <p className="max-w-xs mx-auto mb-6">{description}</p>}
      {action && (
        <Button onClick={action.on_click}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
