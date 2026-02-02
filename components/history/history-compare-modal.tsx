"use client";

import { useState } from "react";
import Image from "next/image";
import { X, MoveHorizontal, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { GenerationWithFavorite } from "@/lib/types/database";

type HistoryCompareModalProps = {
  open: boolean;
  items: [GenerationWithFavorite, GenerationWithFavorite];
  on_close: () => void;
};

type ViewMode = "side-by-side" | "overlay";

export const HistoryCompareModal = ({
  open,
  items,
  on_close,
}: HistoryCompareModalProps) => {
  const [view_mode, set_view_mode] = useState<ViewMode>("side-by-side");
  const [slider_position, set_slider_position] = useState(50);

  if (!open) return null;

  const [left, right] = items;

  // Simple JSON diff - highlight differences
  const get_prompt_diff = () => {
    const left_json = left.prompt_json;
    const right_json = right.prompt_json;

    const all_keys = new Set([
      ...Object.keys(left_json),
      ...Object.keys(right_json),
    ]);

    const diffs: { key: string; left: string; right: string; is_different: boolean }[] = [];

    for (const key of all_keys) {
      const left_val = JSON.stringify(left_json[key], null, 2) || "(none)";
      const right_val = JSON.stringify(right_json[key], null, 2) || "(none)";
      diffs.push({
        key,
        left: left_val,
        right: right_val,
        is_different: left_val !== right_val,
      });
    }

    return diffs;
  };

  const diffs = get_prompt_diff();
  const difference_count = diffs.filter((d) => d.is_different).length;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold">Compare Images</h2>
          <span className="text-sm text-muted-foreground">
            {difference_count} difference{difference_count !== 1 ? "s" : ""} found
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={view_mode === "side-by-side" ? "default" : "outline"}
            size="sm"
            onClick={() => set_view_mode("side-by-side")}
          >
            <MoveHorizontal className="size-4 mr-2" />
            Side by Side
          </Button>
          <Button
            variant={view_mode === "overlay" ? "default" : "outline"}
            size="sm"
            onClick={() => set_view_mode("overlay")}
          >
            <Layers className="size-4 mr-2" />
            Overlay
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="ghost" size="icon" onClick={on_close}>
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Images */}
        <div className="flex-1 flex">
          {view_mode === "side-by-side" ? (
            <>
              <div className="flex-1 relative border-r">
                {left.image_path && (
                  <Image
                    src={left.image_path}
                    alt=""
                    fill
                    className="object-contain p-4"
                  />
                )}
                <div className="absolute bottom-4 left-4 px-2 py-1 bg-background/80 rounded text-xs">
                  {new Date(left.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex-1 relative">
                {right.image_path && (
                  <Image
                    src={right.image_path}
                    alt=""
                    fill
                    className="object-contain p-4"
                  />
                )}
                <div className="absolute bottom-4 right-4 px-2 py-1 bg-background/80 rounded text-xs">
                  {new Date(right.created_at).toLocaleString()}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 relative">
              {/* Right image (background) */}
              {right.image_path && (
                <Image
                  src={right.image_path}
                  alt=""
                  fill
                  className="object-contain p-4"
                />
              )}

              {/* Left image with clip */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - slider_position}% 0 0)` }}
              >
                {left.image_path && (
                  <Image
                    src={left.image_path}
                    alt=""
                    fill
                    className="object-contain p-4"
                  />
                )}
              </div>

              {/* Slider */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary cursor-ew-resize"
                style={{ left: `${slider_position}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <MoveHorizontal className="size-4 text-primary-foreground" />
                </div>
              </div>

              {/* Slider interaction area */}
              <input
                type="range"
                min="0"
                max="100"
                value={slider_position}
                onChange={(e) => set_slider_position(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
              />
            </div>
          )}
        </div>

        {/* Prompt diff sidebar */}
        <div className="w-80 border-l overflow-y-auto">
          <div className="p-4">
            <h3 className="font-medium mb-4">Prompt Differences</h3>

            <div className="space-y-4">
              {diffs.map((diff) => (
                <div
                  key={diff.key}
                  className={`p-3 rounded-lg ${
                    diff.is_different ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-medium">{diff.key}</span>
                    {diff.is_different && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">Changed</span>
                    )}
                  </div>

                  {diff.is_different ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Left</span>
                        <pre className="text-xs overflow-auto max-h-20 bg-background p-2 rounded">
                          {diff.left}
                        </pre>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Right</span>
                        <pre className="text-xs overflow-auto max-h-20 bg-background p-2 rounded">
                          {diff.right}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <pre className="text-xs overflow-auto max-h-20 text-muted-foreground">
                      {diff.left}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
