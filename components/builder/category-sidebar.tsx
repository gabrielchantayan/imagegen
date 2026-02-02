"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { use_components } from "@/lib/hooks/use-components";
import { use_builder_store, SHARED_CATEGORIES } from "@/lib/stores/builder-store";
import { cn } from "@/lib/utils";
import { ImageIcon, Loader2 } from "lucide-react";

type CategorySidebarProps = {
  className?: string;
};

export const CategorySidebar = ({ className }: CategorySidebarProps) => {
  const { categories, is_loading } = use_components();
  const active_category = use_builder_store((s) => s.active_category);
  const set_active_category = use_builder_store((s) => s.set_active_category);
  const subjects = use_builder_store((s) => s.subjects);
  const shared_selections = use_builder_store((s) => s.shared_selections);

  // Check if category has selections
  const has_selection = (category_id: string): boolean => {
    const is_shared = SHARED_CATEGORIES.includes(category_id);

    if (is_shared) {
      return !!shared_selections[category_id];
    }

    return subjects.some((s) => !!s.selections[category_id]);
  };

  if (is_loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col py-2", className)}>
      <div className="px-3 py-2">
        <h2 className="text-sm font-semibold">Categories</h2>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={active_category === category.id ? "secondary" : "ghost"}
            className={cn("w-full justify-start", has_selection(category.id) && "font-medium")}
            onClick={() => set_active_category(category.id)}
          >
            {has_selection(category.id) && (
              <span className="w-2 h-2 rounded-full bg-primary mr-2" />
            )}
            {category.name}
          </Button>
        ))}
      </nav>

      <Separator className="my-2" />

      <div className="px-2">
        <Button
          variant={active_category === "analyze" ? "secondary" : "ghost"}
          className="w-full justify-start"
          onClick={() => set_active_category("analyze")}
        >
          <ImageIcon className="size-4 mr-2" />
          Analyze Image
        </Button>
      </div>
    </div>
  );
};
