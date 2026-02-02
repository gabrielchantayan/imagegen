"use client";

import { use_builder_store } from "@/lib/stores/builder-store";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Download, RefreshCw } from "lucide-react";

export const ImagePreview = () => {
  const last_generated_image = use_builder_store((s) => s.last_generated_image);
  const generation_status = use_builder_store((s) => s.generation_status);
  const generation_error = use_builder_store((s) => s.generation_error);
  const queue_position = use_builder_store((s) => s.queue_position);

  if (generation_status === "queued") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <div className="animate-pulse mb-4 text-lg">Queued</div>
        {queue_position !== null && (
          <p className="text-sm">Position {queue_position} in queue</p>
        )}
      </div>
    );
  }

  if (generation_status === "generating") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="size-12 animate-spin mb-4" />
        <p>Generating image...</p>
      </div>
    );
  }

  if (generation_status === "failed" && generation_error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="text-destructive text-center">
          <p className="font-medium mb-2">Generation failed</p>
          <p className="text-sm text-muted-foreground">{generation_error}</p>
        </div>
      </div>
    );
  }

  if (generation_status === "completed" && last_generated_image) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex-1 flex items-center justify-center relative">
          <img
            src={last_generated_image}
            alt="Generated image"
            className="max-h-full max-w-full object-contain rounded-lg"
          />
        </div>
        <div className="flex justify-center gap-2 mt-4">
          <a
            href={last_generated_image}
            download
            className="inline-flex items-center justify-center h-8 gap-1.5 px-2.5 rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground text-sm font-medium transition-all"
          >
            <Download className="size-4" />
            Download
          </a>
          <Button variant="outline" disabled>
            <RefreshCw className="size-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </div>
    );
  }

  if (last_generated_image) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex-1 flex items-center justify-center relative">
          <img
            src={last_generated_image}
            alt="Generated image"
            className="max-h-full max-w-full object-contain rounded-lg"
          />
        </div>
        <div className="flex justify-center gap-2 mt-4">
          <a
            href={last_generated_image}
            download
            className="inline-flex items-center justify-center h-8 gap-1.5 px-2.5 rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground text-sm font-medium transition-all"
          >
            <Download className="size-4" />
            Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
      <ImageIcon className="size-12 mb-4" />
      <p>No image generated yet</p>
      <p className="text-sm">Select components and click Generate</p>
    </div>
  );
};
