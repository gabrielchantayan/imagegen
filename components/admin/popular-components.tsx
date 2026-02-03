"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import type { PopularComponent } from "@/lib/repositories/stats";

type PopularComponentsProps = {
  components: PopularComponent[];
};

const CATEGORY_LABELS: Record<string, string> = {
  characters: "Character",
  physical_traits: "Traits",
  jewelry: "Jewelry",
  wardrobe: "Wardrobe",
  wardrobe_tops: "Top",
  wardrobe_bottoms: "Bottom",
  wardrobe_footwear: "Footwear",
  poses: "Pose",
  scenes: "Scene",
  backgrounds: "Background",
  camera: "Camera",
  ban_lists: "Ban List",
};

export const PopularComponents = ({ components }: PopularComponentsProps) => {
  if (components.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Popular Components</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No usage data yet.</p>
        </CardContent>
      </Card>
    );
  }

  const max_usage = Math.max(...components.map((c) => c.usage_count));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Popular Components</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {components.map((component, index) => {
            const usage_percent = (component.usage_count / max_usage) * 100;
            return (
              <div key={component.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm min-w-[24px]">#{index + 1}</span>
                    <span className="font-medium text-sm truncate max-w-[200px]">
                      {component.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 font-normal">
                      {CATEGORY_LABELS[component.category_id] || component.category_id}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {component.usage_count}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/80 rounded-full"
                    style={{ width: `${usage_percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

