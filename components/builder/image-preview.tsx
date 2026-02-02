"use client";

import { use_builder_store } from "@/lib/stores/builder-store";
import { ImageIcon, Loader2 } from "lucide-react";

export const ImagePreview = () => {
  const last_generated_image = use_builder_store((s) => s.last_generated_image);
  const generation_status = use_builder_store((s) => s.generation_status);
  const generation_error = use_builder_store((s) => s.generation_error);

  if (generation_status === "generating") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="size-12 animate-spin mb-4" />
        <p>Generating image...</p>
      </div>
    );
  }

  if (generation_error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="text-destructive text-center">
          <p className="font-medium mb-2">Generation failed</p>
          <p className="text-sm text-muted-foreground">{generation_error}</p>
        </div>
      </div>
    );
  }

  if (last_generated_image) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <img
          src={last_generated_image}
          alt="Generated image"
          className="max-h-full max-w-full object-contain rounded-lg"
        />
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
