"use client";

import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QueueMetricsBar } from "./queue-metrics-bar";
import { QueueList } from "./queue-list";
import { QueueHistory } from "./queue-history";
import { use_queue_dashboard } from "@/lib/hooks/use-queue-dashboard";
import { Layers, History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolbarSlots } from "@/components/shared/toolbar-slots";

export const QueueDashboard = () => {
  const { processing_items, queued_items, metrics, is_loading, mutate } = use_queue_dashboard();

  const left_slot = useMemo(() => (
    <h1 className="text-lg font-semibold">Queue Dashboard</h1>
  ), []);

  const right_slot = useMemo(() => (
    <Button variant="outline" size="sm" onClick={() => mutate()} disabled={is_loading}>
      <RefreshCw className={`size-4 mr-2 ${is_loading ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  ), [mutate, is_loading]);

  return (
    <div className="h-full overflow-auto bg-background">
      <ToolbarSlots left={left_slot} right={right_slot} />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <QueueMetricsBar metrics={metrics} />

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Layers className="size-4" />
              Active Queue
              {(processing_items.length + queued_items.length) > 0 && (
                <span className="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-xs">
                  {processing_items.length + queued_items.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="size-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <QueueList
              processing_items={processing_items}
              queued_items={queued_items}
              on_item_delete={() => mutate()}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <QueueHistory />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
