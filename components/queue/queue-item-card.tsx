"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ProcessingIndicator } from "./processing-indicator";
import { use_elapsed_time, format_elapsed_time } from "@/lib/hooks/use-elapsed-time";
import { Clock, Image, Search, Shield, RefreshCw, AlertTriangle, X } from "lucide-react";
import type { QueueItemWithPosition } from "@/lib/repositories/queue";

type QueueItemCardProps = {
  item: QueueItemWithPosition;
  on_delete?: () => void;
};

export const QueueItemCard = ({ item, on_delete }: QueueItemCardProps) => {
  const [is_deleting, set_is_deleting] = useState(false);
  const [dialog_open, set_dialog_open] = useState(false);
  const elapsed_seconds = use_elapsed_time(item.started_at);
  const waiting_seconds = use_elapsed_time(item.created_at);

  const prompt_summary = get_prompt_summary(item.prompt_json);
  const reference_count = item.reference_photo_ids?.length ?? 0;

  const handle_delete = async () => {
    set_is_deleting(true);
    try {
      const response = await fetch(`/api/queue/${item.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        set_dialog_open(false);
        on_delete?.();
      }
    } finally {
      set_is_deleting(false);
    }
  };

  return (
    <Card size="sm">
      <CardContent className="py-0">
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <ProcessingIndicator status={item.status as "queued" | "processing"} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {item.status === "processing" ? (
                <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                  Processing
                </Badge>
              ) : (
                <Badge variant="secondary">
                  Position #{item.position}
                </Badge>
              )}

              {item.google_search && (
                <Badge variant="outline" className="gap-1">
                  <Search className="size-3" />
                  Search
                </Badge>
              )}

              {item.safety_override && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30">
                  <Shield className="size-3" />
                  Override
                </Badge>
              )}

              {item.status === "processing" && item.used_fallback && !item.face_swap_failed && (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30">
                  <RefreshCw className="size-3" />
                  Fallback
                </Badge>
              )}

              {item.status === "processing" && item.face_swap_failed && (
                <Badge variant="outline" className="gap-1 text-red-600 border-red-500/30">
                  <AlertTriangle className="size-3" />
                  Swap Failed
                </Badge>
              )}
            </div>

            <p className="text-sm text-foreground truncate mb-2">
              {prompt_summary}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {item.status === "processing" ? (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {format_elapsed_time(elapsed_seconds)} elapsed
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {format_elapsed_time(waiting_seconds)} waiting
                </span>
              )}

              {reference_count > 0 && (
                <span className="flex items-center gap-1">
                  <Image className="size-3" />
                  {reference_count} reference{reference_count > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <AlertDialog open={dialog_open} onOpenChange={set_dialog_open}>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                />
              }
            >
              <X className="size-4" />
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel generation?</AlertDialogTitle>
                <AlertDialogDescription>
                  {item.status === "processing"
                    ? "This will stop the generation in progress. The API call may still complete but the result will be discarded."
                    : "This will remove the item from the queue."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={is_deleting}>
                  Keep
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handle_delete}
                  disabled={is_deleting}
                >
                  {is_deleting ? "Cancelling..." : "Cancel"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

const get_prompt_summary = (prompt_json: Record<string, unknown>): string => {
  const prompt = prompt_json.prompt as string | undefined;
  if (prompt) {
    return prompt.length > 100 ? prompt.slice(0, 100) + "..." : prompt;
  }

  // Try to extract from composed prompt structure
  const values = Object.values(prompt_json);
  const text_values = values
    .filter((v): v is string => typeof v === "string")
    .join(" ");

  if (text_values) {
    return text_values.length > 100 ? text_values.slice(0, 100) + "..." : text_values;
  }

  return "No prompt text";
};
