'use client';

import { useState } from 'react';
import { jsonrepair } from 'jsonrepair';
import { Button, buttonVariants } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type MagicEditPopoverProps = {
  current_json: string;
  category_name: string;
  on_json_update: (json: string) => void;
};

export const MagicEditPopover = ({
  current_json,
  category_name,
  on_json_update,
}: MagicEditPopoverProps) => {
  const [open, set_open] = useState(false);
  const [instructions, set_instructions] = useState('');
  const [loading, set_loading] = useState(false);
  const [error, set_error] = useState('');

  const handle_submit = async () => {
    if (!instructions.trim()) return;

    set_loading(true);
    set_error('');

    try {
      let parsed_json;
      try {
        parsed_json = JSON.parse(current_json);
      } catch {
        try {
          parsed_json = JSON.parse(jsonrepair(current_json));
        } catch {
          set_error('Invalid current JSON');
          set_loading(false);
          return;
        }
      }

      const res = await fetch('/api/components/magic-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_json: parsed_json,
          instructions,
          category_name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Magic edit failed');
      }

      if (data.json) {
        on_json_update(JSON.stringify(data.json, null, 2));
        set_open(false);
        set_instructions('');
      }
    } catch (err) {
      set_error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      set_loading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={set_open}>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'h-6 px-2 text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50'
        )}
      >
        <Sparkles className="size-3 mr-1" />
        Magic Edit
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 bg-muted/20 border-b">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-500" />
            AI Magic Edit
          </h4>
        </div>
        <div className="p-3 space-y-3">
          <Textarea
            placeholder="Describe changes (e.g., 'Make the hair longer and red', 'Add gold trim to the dress')..."
            value={instructions}
            onChange={(e) => set_instructions(e.target.value)}
            className="min-h-[80px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handle_submit();
              }
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handle_submit}
              disabled={loading || !instructions.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8"
            >
              {loading ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Send className="size-3 mr-1" />
              )}
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
