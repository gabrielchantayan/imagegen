'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wrench } from 'lucide-react';
import { MagicEditPopover } from './magic-edit-popover';

type ComponentEditorFormProps = {
  name: string;
  description: string;
  json_data: string;
  json_error: string;
  on_name_change: (name: string) => void;
  on_description_change: (description: string) => void;
  on_json_change: (json: string) => void;
  on_json_repair: () => void;
  category_name: string;
  children?: React.ReactNode;
};

export const ComponentEditorForm = ({
  name,
  description,
  json_data,
  json_error,
  on_name_change,
  on_description_change,
  on_json_change,
  on_json_repair,
  category_name,
  children,
}: ComponentEditorFormProps) => {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Metadata */}
      <div className="w-5/12 border-r bg-muted/10 p-6 space-y-6 overflow-y-auto">
        <div className="space-y-3">
          <Label
            htmlFor="name"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => on_name_change(e.target.value)}
            placeholder="e.g., Red Silk Dress"
            className="bg-background"
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <Label
            htmlFor="description"
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Description
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => on_description_change(e.target.value)}
            placeholder="A brief description of this component..."
            className="bg-background min-h-[120px] resize-none"
          />
        </div>

        {/* References section passed as children */}
        {children}
      </div>

      {/* Right: JSON Data */}
      <div className="w-7/12 flex flex-col p-0">
        <div className="px-6 py-3 border-b bg-muted/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="data"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              JSON Configuration
            </Label>

            <MagicEditPopover
              current_json={json_data}
              category_name={category_name}
              on_json_update={on_json_change}
            />
          </div>

          {json_error && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
              <p className="text-xs font-medium text-destructive">{json_error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={on_json_repair}
                className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Wrench className="size-3 mr-1" />
                Auto-fix
              </Button>
            </div>
          )}
        </div>
        <div className="flex-1 relative">
          <Textarea
            id="data"
            value={json_data}
            onChange={(e) => on_json_change(e.target.value)}
            className="absolute inset-0 w-full h-full font-mono text-sm resize-none border-0 rounded-none focus-visible:ring-0 p-6 leading-relaxed"
            placeholder="{}"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};
