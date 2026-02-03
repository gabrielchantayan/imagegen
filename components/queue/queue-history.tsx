"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { use_queue_history } from "@/lib/hooks/use-queue-history";
import { format_duration } from "@/lib/hooks/use-elapsed-time";
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, Image, RefreshCw, AlertTriangle } from "lucide-react";

type StatusFilter = "all" | "completed" | "failed";

export const QueueHistory = () => {
  const [page, set_page] = useState(1);
  const [status_filter, set_status_filter] = useState<StatusFilter>("all");

  const { items, total, total_pages, is_loading } = use_queue_history(page, status_filter);

  const handle_filter_change = (value: string | null) => {
    if (value) {
      set_status_filter(value as StatusFilter);
      set_page(1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <Select value={status_filter} onValueChange={handle_filter_change}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <span className="text-sm text-muted-foreground">
          {total} total items
        </span>
      </div>

      {is_loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium mb-1">No history yet</p>
          <p className="text-sm">Completed and failed generations will appear here</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-2 px-4 font-medium">Status</th>
                <th className="text-left py-2 px-4 font-medium">Prompt</th>
                <th className="text-left py-2 px-4 font-medium">Duration</th>
                <th className="text-left py-2 px-4 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1">
                      {item.status === "completed" ? (
                        <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30 gap-1 w-fit">
                          <CheckCircle className="size-3" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1 w-fit">
                          <XCircle className="size-3" />
                          Failed
                        </Badge>
                      )}
                      {item.used_fallback && !item.face_swap_failed && (
                        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30 w-fit text-xs">
                          <RefreshCw className="size-3" />
                          Face Swapped
                        </Badge>
                      )}
                      {item.face_swap_failed && (
                        <Badge variant="outline" className="gap-1 text-red-600 border-red-500/30 w-fit text-xs">
                          <AlertTriangle className="size-3" />
                          Swap Failed
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-[300px]">
                    <p className="truncate text-foreground">
                      {get_prompt_summary(item.prompt_json)}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {format_duration(item.duration_seconds)}
                  </td>
                  <td className="py-3 px-4">
                    {item.status === "completed" && item.image_path ? (
                      <div className="flex items-center gap-2">
                        <Image className="size-4 text-muted-foreground" />
                        <a
                          href={item.image_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View
                        </a>
                      </div>
                    ) : item.status === "failed" ? (
                      <span className="text-destructive text-xs">Generation failed</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total_pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => set_page(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => set_page(page + 1)}
            disabled={page >= total_pages}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

const get_prompt_summary = (prompt_json: Record<string, unknown>): string => {
  const prompt = prompt_json.prompt as string | undefined;
  if (prompt) {
    return prompt.length > 80 ? prompt.slice(0, 80) + "..." : prompt;
  }

  const values = Object.values(prompt_json);
  const text_values = values
    .filter((v): v is string => typeof v === "string")
    .join(" ");

  if (text_values) {
    return text_values.length > 80 ? text_values.slice(0, 80) + "..." : text_values;
  }

  return "No prompt text";
};
