"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Copy, Loader2 } from "lucide-react";
import Image from "next/image";

type AnalyzePanelProps = {
  on_save_as_presets: (data: Record<string, unknown>) => void;
};

export const AnalyzePanel = ({ on_save_as_presets }: AnalyzePanelProps) => {
  const [file, set_file] = useState<File | null>(null);
  const [preview, set_preview] = useState<string | null>(null);
  const [analyzing, set_analyzing] = useState(false);
  const [result, set_result] = useState<Record<string, unknown> | null>(null);
  const [error, set_error] = useState<string | null>(null);

  const on_drop = useCallback((accepted_files: File[]) => {
    const dropped_file = accepted_files[0];
    if (dropped_file) {
      set_file(dropped_file);
      set_preview(URL.createObjectURL(dropped_file));
      set_result(null);
      set_error(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: on_drop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const handle_analyze = async () => {
    if (!file) return;

    set_analyzing(true);
    set_error(null);

    try {
      const form_data = new FormData();
      form_data.append("image", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: form_data,
      });

      const data = await res.json();

      if (data.success) {
        set_result(data.data);
      } else {
        set_error(data.error || "Analysis failed");
      }
    } catch {
      set_error("Network error");
    } finally {
      set_analyzing(false);
    }
  };

  const handle_clear = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    set_file(null);
    set_preview(null);
    set_result(null);
    set_error(null);
  };

  const handle_copy = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    }
  };

  return (
    <div className="h-full flex gap-6 p-6 bg-muted/5">
      {/* Left: Upload area */}
      <div className="w-1/2 flex flex-col">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Analyze Image</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload an image to extract its prompt components
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`flex-1 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input {...getInputProps()} />
          {preview ? (
            <div className="relative w-full h-full p-6">
              <div className="relative w-full h-full rounded-lg overflow-hidden shadow-sm border bg-background/50">
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="text-center p-8">
              <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Upload className="size-8 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-foreground">
                {isDragActive ? "Drop image now" : "Click to upload"}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-2">
                or drag and drop here
              </p>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">
                JPEG, PNG, WEBP, GIF (MAX 10MB)
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handle_analyze}
            disabled={!file || analyzing}
            className="flex-1 h-10 shadow-sm"
          >
            {analyzing ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Start Analysis"
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={handle_clear} 
            disabled={!file}
            className="h-10 px-4"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Right: Results */}
      <div className="w-1/2 flex flex-col">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Results</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Extracted components will appear here
          </p>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-card rounded-xl border shadow-sm p-1">
          {error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                <X className="size-6 text-destructive" />
              </div>
              <p className="text-destructive font-medium">{error}</p>
            </div>
          ) : result ? (
            <>
              <Textarea
                value={JSON.stringify(result, null, 2)}
                readOnly
                className="flex-1 font-mono text-xs resize-none border-0 shadow-none focus-visible:ring-0 p-4 leading-relaxed"
              />
              <div className="p-3 border-t bg-muted/10 flex gap-2">
                <Button
                  onClick={() => on_save_as_presets(result)}
                  className="flex-1 h-9"
                >
                  Save as Presets
                </Button>
                <Button variant="outline" onClick={handle_copy} className="h-9 px-3">
                  <Copy className="size-4" />
                </Button>
              </div>
            </>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-lg m-1 border border-dashed border-muted-foreground/10">
              {analyzing ? (
                <div className="text-center">
                  <Loader2 className="size-10 animate-spin mx-auto mb-4 text-primary" />
                  <p className="font-medium text-foreground">Analyzing image details...</p>
                  <p className="text-sm opacity-70 mt-1">This may take a moment</p>
                </div>
              ) : (
                <div className="text-center max-w-[240px]">
                   <p className="text-sm">Upload an image to see the extracted JSON structure here</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
