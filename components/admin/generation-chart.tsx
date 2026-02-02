"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { DailyGenerations } from "@/lib/repositories/stats";

type GenerationChartProps = {
  data: DailyGenerations[];
};

export const GenerationChart = ({ data }: GenerationChartProps) => {
  const max_count = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generation History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end gap-1">
          {data.map((day) => {
            const height = (day.count / max_count) * 100;
            const success_height = day.count > 0 ? (day.success / day.count) * height : 0;
            const failed_height = height - success_height;

            return (
              <div key={day.date} className="flex-1 flex flex-col justify-end group relative">
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap">
                    <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                    <div>{day.count} total</div>
                    <div className="text-green-500">{day.success} success</div>
                    <div className="text-red-500">{day.failed} failed</div>
                  </div>
                </div>

                <div className="w-full flex flex-col">
                  {day.failed > 0 && (
                    <div
                      className="bg-red-500/50 rounded-t"
                      style={{ height: `${failed_height}%` }}
                    />
                  )}
                  {day.success > 0 && (
                    <div
                      className={`bg-primary ${day.failed === 0 ? "rounded-t" : ""}`}
                      style={{ height: `${success_height}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{data[0] ? new Date(data[0].date).toLocaleDateString() : ""}</span>
          <span>Today</span>
        </div>
      </CardContent>
    </Card>
  );
};
