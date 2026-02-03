"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QueueMetricsBar } from "./queue-metrics-bar";
import { QueueList } from "./queue-list";
import { QueueHistory } from "./queue-history";
import { use_queue_dashboard } from "@/lib/hooks/use-queue-dashboard";
import { Layers, History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const QueueDashboard = () => {
  const { processing_items, queued_items, metrics, is_loading, mutate } = use_queue_dashboard();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/builder" className="text-muted-foreground hover:text-foreground">
              <Button variant="ghost" size="sm">
                Back to Builder
              </Button>
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-xl font-semibold">Queue Dashboard</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={is_loading}>
            <RefreshCw className={`size-4 mr-2 ${is_loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

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
            <QueueList processing_items={processing_items} queued_items={queued_items} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <QueueHistory />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
