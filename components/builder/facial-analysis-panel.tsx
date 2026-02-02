"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Loader2, ArrowLeft, Save } from "lucide-react";
import Image from "next/image";
import { create_component_api } from "@/lib/hooks/use-components";

type FacialAnalysisPanelProps = {
  on_back: () => void;
  on_save: () => void;
};

export const FacialAnalysisPanel = ({
  on_back,
  on_save,
}: FacialAnalysisPanelProps) => {
  const [file, set_file] = useState<File | null>(null);
  const [preview, set_preview] = useState<string | null>(null);
  const [analyzing, set_analyzing] = useState(false);
  const [saving, set_saving] = useState(false);
  const [result, set_result] = useState<Record<string, unknown> | null>(null);
  const [result_text, set_result_text] = useState<string>("");
  const [error, set_error] = useState<string | null>(null);
  const [component_name, set_component_name] = useState("");

  const on_drop = useCallback((accepted_files: File[]) => {
    const dropped_file = accepted_files[0];
    if (dropped_file) {
      set_file(dropped_file);
      set_preview(URL.createObjectURL(dropped_file));
      set_result(null);
      set_result_text("");
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

      const res = await fetch("/api/analyze/facial", {
        method: "POST",
        body: form_data,
      });

      const data = await res.json();

      if (data.success) {
        set_result(data.data);
        set_result_text(JSON.stringify(data.data, null, 2));
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
    set_result_text("");
    set_error(null);
    set_component_name("");
  };

  const handle_save = async () => {
    if (!result_text || !component_name.trim()) return;

    set_saving(true);
    set_error(null);

    try {
      // Parse the potentially edited JSON
      const parsed_data = JSON.parse(result_text);

      await create_component_api({
        category_id: "physical_traits",
        name: component_name.trim(),
        description: "Created from facial analysis",
        data: parsed_data,
      });

      on_save();
    } catch (e) {
      if (e instanceof SyntaxError) {
        set_error("Invalid JSON in result");
      } else {
        set_error(e instanceof Error ? e.message : "Failed to save component");
      }
    } finally {
      set_saving(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" onClick={on_back}>
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <h2 className="text-lg font-semibold">Facial Analysis</h2>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-4 min-h-0">
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
                    ? "Drop the face image here..."
                    : "Drag and drop a face image, or click to select"}
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
                "Analyze Face"
              )}
            </Button>
            <Button variant="outline" onClick={handle_clear} disabled={!file}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="w-1/2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Analysis Result</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              {error && <p className="text-destructive mb-4">{error}</p>}

              {result ? (
                <>
                  <Textarea
                    value={result_text}
                    onChange={(e) => set_result_text(e.target.value)}
                    className="flex-1 font-mono text-xs resize-none min-h-0"
                  />
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="component-name">Component Name</Label>
                      <Input
                        id="component-name"
                        placeholder="Enter a name for this component..."
                        value={component_name}
                        onChange={(e) => set_component_name(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handle_save}
                      disabled={!component_name.trim() || saving}
                      className="w-full"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="size-4 mr-2" />
                          Save as Physical Traits
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  {analyzing ? (
                    <div className="text-center">
                      <Loader2 className="size-8 animate-spin mx-auto mb-2" />
                      <p>Analyzing face...</p>
                    </div>
                  ) : (
                    <p>Upload and analyze a face image to see results</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
