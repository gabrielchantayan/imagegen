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
    <div className="h-full flex gap-4 p-4">
      {/* Left: Upload area */}
      <div className="w-1/2 flex flex-col">
        <div
          {...getRootProps()}
          className={`flex-1 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          {preview ? (
            <div className="relative w-full h-full p-4">
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="text-center p-8">
              <Upload className="size-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {isDragActive
                  ? "Drop the image here..."
                  : "Drag and drop an image, or click to select"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Max 10MB. JPEG, PNG, WebP, GIF
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={handle_analyze}
            disabled={!file || analyzing}
            className="flex-1"
          >
            {analyzing ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze"
            )}
          </Button>
          <Button variant="outline" onClick={handle_clear} disabled={!file}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Right: Results */}
      <div className="w-1/2 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Analysis Result</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0">
            {error && <p className="text-destructive mb-4">{error}</p>}

            {result ? (
              <>
                <Textarea
                  value={JSON.stringify(result, null, 2)}
                  readOnly
                  className="flex-1 font-mono text-xs resize-none"
                />
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => on_save_as_presets(result)}
                    className="flex-1"
                  >
                    Save as Presets
                  </Button>
                  <Button variant="outline" onClick={handle_copy}>
                    <Copy className="size-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {analyzing ? (
                  <div className="text-center">
                    <Loader2 className="size-8 animate-spin mx-auto mb-2" />
                    <p>Analyzing image...</p>
                  </div>
                ) : (
                  <p>Upload and analyze an image to see results</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
