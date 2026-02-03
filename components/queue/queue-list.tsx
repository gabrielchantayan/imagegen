"use client";

import { QueueItemCard } from "./queue-item-card";
import type { QueueItemWithPosition } from "@/lib/repositories/queue";

type QueueListProps = {
  processing_items: QueueItemWithPosition[];
  queued_items: QueueItemWithPosition[];
};

export const QueueList = ({ processing_items, queued_items }: QueueListProps) => {
  const has_items = processing_items.length > 0 || queued_items.length > 0;

  if (!has_items) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium mb-1">No items in queue</p>
        <p className="text-sm">Generate some images to see them here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {processing_items.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Processing ({processing_items.length})
          </h3>
          <div className="space-y-3">
            {processing_items.map((item) => (
              <QueueItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {queued_items.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Queued ({queued_items.length})
          </h3>
          <div className="space-y-3">
            {queued_items.map((item) => (
              <QueueItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
