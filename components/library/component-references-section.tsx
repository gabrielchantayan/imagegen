'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { User, Plus, X, Loader2 } from 'lucide-react';
import type { ReferencePhoto } from '@/lib/types/database';

type ComponentReferencesSectionProps = {
  linked_references: ReferencePhoto[];
  on_attach: () => void;
  on_detach: (reference_id: string) => void;
  reference_saving: boolean;
};

export const ComponentReferencesSection = ({
  linked_references,
  on_attach,
  on_detach,
  reference_saving,
}: ComponentReferencesSectionProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Face References
      </Label>
      <p className="text-xs text-muted-foreground -mt-1">
        Linked references will auto-select when this component is used
      </p>

      {linked_references.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {linked_references.map((ref) => (
            <div
              key={ref.id}
              className="group relative flex items-center gap-2 p-1.5 pr-2 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="size-8 rounded overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ref.image_path}
                  alt={ref.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xs font-medium truncate max-w-[80px]">
                {ref.name}
              </span>
              <button
                onClick={() => on_detach(ref.id)}
                disabled={reference_saving}
                className="size-4 rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed bg-muted/20 text-muted-foreground">
          <User className="size-4" />
          <span className="text-xs">No references linked</span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={on_attach}
        disabled={reference_saving}
        className="w-full"
      >
        {reference_saving ? (
          <Loader2 className="size-4 mr-2 animate-spin" />
        ) : (
          <Plus className="size-4 mr-2" />
        )}
        {linked_references.length > 0 ? 'Edit References' : 'Link References'}
      </Button>
    </div>
  );
};
