"use client";

import { Star } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type HistoryFiltersProps = {
  favorites_only: boolean;
  on_favorites_only_change: (value: boolean) => void;
  search: string;
  on_search_change: (value: string) => void;
};

export const HistoryFilters = ({
  favorites_only,
  on_favorites_only_change,
  search,
  on_search_change,
}: HistoryFiltersProps) => {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Input
        placeholder="Search prompts..."
        value={search}
        onChange={(e) => on_search_change(e.target.value)}
        className="max-w-xs"
      />

      <Button
        variant={favorites_only ? "default" : "outline"}
        onClick={() => on_favorites_only_change(!favorites_only)}
      >
        <Star className={`w-4 h-4 mr-2 ${favorites_only ? "fill-current" : ""}`} />
        Favorites
      </Button>
    </div>
  );
};
