"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DailyGenerations } from "@/lib/repositories/stats";

type GenerationChartProps = {
  data: DailyGenerations[];
};

export const GenerationChart = ({ data }: GenerationChartProps) => {
  const [view, set_view] = useState<"count" | "cost">("count");

  // Filter out days with 0 data at the start to clean up the chart if needed, 
  // but usually keeping the full range is better for context.
  
  const max_value = Math.max(
    ...data.map((d) => (view === "count" ? d.count : d.estimated_cost)),
    view === "count" ? 5 : 1 // Minimum scale
  );

  return (
    <Card className="col-span-1 lg:col-span-2 overflow-visible">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">Activity History</CardTitle>
        <Tabs
          value={view}
          onValueChange={(v) => set_view(v as "count" | "cost")}
          className="w-[200px]"
        >
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="count" className="text-xs">Generations</TabsTrigger>
            <TabsTrigger value="cost" className="text-xs">Cost</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="overflow-visible">
        <div className="h-[300px] w-full flex items-end justify-between gap-1 pt-6">
          {data.map((day, i) => {
            const value = view === "count" ? day.count : day.estimated_cost;
            const height_percent = (value / max_value) * 100;
            
            // For cost view, we just show one bar. For count, we stack success/fail.
            const success_val = day.success;
            // const failed_val = day.failed; 
            // Proportion of success within the total count
            const success_ratio = day.count > 0 ? day.success / day.count : 0;
            
            const success_height = view === "count" ? height_percent * success_ratio : height_percent;
            const failed_height = view === "count" ? height_percent - success_height : 0;

            // Determine tooltip alignment based on index
            const is_left_edge = i < 5;
            const is_right_edge = i > data.length - 5;
            const tooltip_classes = `absolute bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none w-max
              ${is_left_edge ? "left-0" : is_right_edge ? "right-0" : "left-1/2 -translate-x-1/2"}`;

            return (
              <div
                key={day.date}
                className="group relative flex-1 flex flex-col justify-end h-full hover:bg-muted/50 rounded-sm transition-colors"
              >
                {/* Tooltip */}
                <div className={tooltip_classes}>
                  <div className="bg-popover text-popover-foreground text-xs rounded-md shadow-md border px-3 py-2 whitespace-nowrap">
                    <div className="font-semibold mb-1">
                      {new Date(day.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    {view === "count" ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-primary" />
                          <span>Success: {day.success}</span>
                        </div>
                        {day.failed > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full bg-destructive" />
                            <span>Failed: {day.failed}</span>
                          </div>
                        )}
                        <div className="pt-1 mt-1 border-t text-muted-foreground">
                          Total: {day.count}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 font-mono">
                        <div className="size-2 rounded-full bg-green-500" />
                        <span>${day.estimated_cost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bars */}
                <div className="w-full px-0.5 flex flex-col justify-end h-full">
                  {/* Failed portion (top) */}
                  {failed_height > 0 && (
                    <div
                      style={{ height: `${failed_height}%` }}
                      className="w-full bg-destructive/50 rounded-t-sm"
                    />
                  )}
                  {/* Success portion (bottom) */}
                  {success_height > 0 && (
                    <div
                      style={{ height: `${success_height}%` }}
                      className={`w-full ${
                        view === "count" ? "bg-primary" : "bg-green-500/80"
                      } ${failed_height === 0 ? "rounded-t-sm" : ""}`}
                    />
                  )}
                  {/* Empty state line if 0 */}
                  {value === 0 && (
                    <div className="h-[2px] w-full bg-muted-foreground/10 rounded-full" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex justify-between mt-4 px-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          <span>
            {new Date(data[0]?.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span>Today</span>
        </div>
      </CardContent>
    </Card>
  );
};

