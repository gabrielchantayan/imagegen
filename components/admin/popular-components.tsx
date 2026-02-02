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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Components</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {components.map((component, index) => (
            <div key={component.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-6">#{index + 1}</span>
                <div>
                  <p className="font-medium">{component.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORY_LABELS[component.category_id] || component.category_id}
                  </Badge>
                </div>
              </div>
              <span className="text-muted-foreground">{component.usage_count} uses</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
