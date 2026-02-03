"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProcessingIndicator } from "./processing-indicator";
import { use_elapsed_time, format_elapsed_time } from "@/lib/hooks/use-elapsed-time";
import { Clock, Image, Search, Shield } from "lucide-react";
import type { QueueItemWithPosition } from "@/lib/repositories/queue";

type QueueItemCardProps = {
  item: QueueItemWithPosition;
};

export const QueueItemCard = ({ item }: QueueItemCardProps) => {
  const elapsed_seconds = use_elapsed_time(item.started_at);
  const waiting_seconds = use_elapsed_time(item.created_at);

  const prompt_summary = get_prompt_summary(item.prompt_json);
  const reference_count = item.reference_photo_ids?.length ?? 0;

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
