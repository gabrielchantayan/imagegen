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
      <div className="h-full w-full relative bg-muted/20 group">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <img
            src={last_generated_image}
            alt="Generated image"
            className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
          />
        </div>
        
        {/* Floating Controls Overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border/50 p-1.5 rounded-full opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
          <a
            href={last_generated_image}
            download
            className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="size-4 mr-2" />
            Download
          </a>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-9 px-4 rounded-full hover:bg-background/80"
            disabled
          >
            <RefreshCw className="size-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </div>
    );
  }

  if (last_generated_image) {
    return (
      <div className="h-full w-full relative bg-muted/20 group">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <img
            src={last_generated_image}
            alt="Generated image"
            className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
          />
        </div>
        
        {/* Floating Controls Overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border/50 p-1.5 rounded-full opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
          <a
            href={last_generated_image}
            download
            className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors shadow-sm"
          >
            <Download className="size-4 mr-2" />
            Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
      <div className="p-6 rounded-full bg-muted/30 mb-4">
        <ImageIcon className="size-8 opacity-50" />
      </div>
      <p className="font-medium text-foreground">No image generated</p>
      <p className="text-sm mt-1 max-w-[200px] text-center opacity-70">
        Build your prompt and hit Generate to see the magic happen
      </p>
    </div>
  );
};
