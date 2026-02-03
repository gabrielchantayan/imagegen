"use client";

import { use_builder_store } from "@/lib/stores/builder-store";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Download, RefreshCw, AlertCircle, CreditCard, Ban, ServerCrash } from "lucide-react";

type ParsedError = {
  title: string;
  message: string;
  icon: "quota" | "blocked" | "server" | "generic";
};

const parse_generation_error = (error: string): ParsedError => {
  // Try to parse JSON error from Gemini API
  try {
    const parsed = JSON.parse(error);
    const code = parsed?.error?.code;
    const status = parsed?.error?.status;
    const message = parsed?.error?.message;

    // Quota exceeded (429 / RESOURCE_EXHAUSTED)
    if (code === 429 || status === "RESOURCE_EXHAUSTED") {
      return {
        title: "API Quota Exceeded",
        message: "The Gemini API quota has been reached. Please try again later or check the API billing settings.",
        icon: "quota",
      };
    }

    // Safety filter / blocked content
    if (status === "INVALID_ARGUMENT" || (message && message.toLowerCase().includes("safety"))) {
      return {
        title: "Content Blocked",
        message: "The request was blocked by content safety filters. Try adjusting your prompt.",
        icon: "blocked",
      };
    }

    // Permission / auth errors
    if (code === 403 || status === "PERMISSION_DENIED") {
      return {
        title: "API Access Denied",
        message: "The API key doesn't have permission for this operation. Check the API configuration.",
        icon: "server",
      };
    }

    // Server errors
    if (code >= 500 || status === "INTERNAL") {
      return {
        title: "Server Error",
        message: "The Gemini API encountered an error. Please try again.",
        icon: "server",
      };
    }

    // Use API message if available
    if (message) {
      return {
        title: "Generation Failed",
        message: message.length > 150 ? message.slice(0, 150) + "..." : message,
        icon: "generic",
      };
    }
  } catch {
    // Not JSON, check for common patterns
  }

  // Check for common error patterns in plain text
  if (error.toLowerCase().includes("quota") || error.includes("429")) {
    return {
      title: "API Quota Exceeded",
      message: "The Gemini API quota has been reached. Please try again later.",
      icon: "quota",
    };
  }

  if (error.toLowerCase().includes("safety") || error.toLowerCase().includes("blocked")) {
    return {
      title: "Content Blocked",
      message: "The request was blocked by content safety filters.",
      icon: "blocked",
    };
  }

  if (error.toLowerCase().includes("no images generated")) {
    return {
      title: "No Image Generated",
      message: "The API returned no images. Try a different prompt.",
      icon: "generic",
    };
  }

  // Default fallback
  return {
    title: "Generation Failed",
    message: error.length > 150 ? error.slice(0, 150) + "..." : error,
    icon: "generic",
  };
};

const ErrorIcon = ({ type }: { type: ParsedError["icon"] }) => {
  switch (type) {
    case "quota":
      return <CreditCard className="size-8 mb-3" />;
    case "blocked":
      return <Ban className="size-8 mb-3" />;
    case "server":
      return <ServerCrash className="size-8 mb-3" />;
    default:
      return <AlertCircle className="size-8 mb-3" />;
  }
};

export const ImagePreview = () => {
  const last_generated_image = use_builder_store((s) => s.last_generated_image);
  const generation_status = use_builder_store((s) => s.generation_status);
  const generation_error = use_builder_store((s) => s.generation_error);
  const queue_position = use_builder_store((s) => s.queue_position);

  if (generation_status === "queued") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
        <div className="relative mb-6">
          {/* Outer pulsing ring */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          {/* Queue icon */}
          <div className="relative p-4 rounded-full bg-primary/10 border border-primary/30">
            <div className="size-8 flex items-center justify-center font-bold text-primary text-lg">
              {queue_position ?? "?"}
            </div>
          </div>
        </div>
        <p className="font-medium text-foreground mb-1">In Queue</p>
        {queue_position !== null && (
          <p className="text-sm text-muted-foreground">
            Position {queue_position} of 5
          </p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-3 max-w-[200px] text-center">
          Your request is waiting to be processed
        </p>
      </div>
    );
  }

  if (generation_status === "generating") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/5">
        {/* Animated progress indicator */}
        <div className="relative mb-6">
          {/* Outer spinning ring */}
          <div className="absolute inset-[-4px] rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          {/* Inner content */}
          <div className="p-4 rounded-full bg-primary/10">
            <Loader2 className="size-8 text-primary animate-spin" />
          </div>
        </div>
        <p className="font-medium text-foreground mb-1">Generating</p>
        <p className="text-sm text-muted-foreground">Creating your image...</p>

        {/* Animated progress dots */}
        <div className="flex gap-1 mt-4">
          <div className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (generation_status === "failed" && generation_error) {
    const parsed = parse_generation_error(generation_error);
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="text-destructive/80 flex flex-col items-center text-center max-w-sm">
          <ErrorIcon type={parsed.icon} />
          <p className="font-semibold text-lg mb-2">{parsed.title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{parsed.message}</p>
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
