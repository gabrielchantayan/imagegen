"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { upload_reference, use_references } from "@/lib/hooks/use-references";
import { Loader2, Upload, X, ImageIcon } from "lucide-react";

type ReferenceUploadModalProps = {
  open: boolean;
  on_open_change: (open: boolean) => void;
};

export const ReferenceUploadModal = ({
  open,
  on_open_change,
}: ReferenceUploadModalProps) => {
  const [file, set_file] = useState<File | null>(null);
  const [preview, set_preview] = useState<string | null>(null);
  const [name, set_name] = useState("");
  const [uploading, set_uploading] = useState(false);
  const [error, set_error] = useState<string | null>(null);

  const { mutate } = use_references();

  const on_drop = useCallback((accepted_files: File[]) => {
    if (accepted_files.length > 0) {
      const dropped_file = accepted_files[0];
      set_file(dropped_file);
      set_preview(URL.createObjectURL(dropped_file));
      // Suggest name from filename
      const suggested_name = dropped_file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ");
      set_name(suggested_name);
      set_error(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: on_drop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handle_upload = async () => {
    if (!file || !name.trim()) return;

    set_uploading(true);
    set_error(null);

    try {
      await upload_reference(file, name.trim());
      mutate();
      handle_close();
    } catch (err) {
      set_error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      set_uploading(false);
    }
  };

  const handle_close = () => {
    set_file(null);
    set_preview(null);
    set_name("");
    set_error(null);
    on_open_change(false);
  };

  const clear_file = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    set_file(null);
    set_preview(null);
    set_name("");
  };

  return (
    <AlertDialog open={open} onOpenChange={handle_close}>
      <AlertDialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-0 shadow-2xl">
        <div className="flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-background">
            <AlertDialogTitle className="text-lg font-semibold tracking-tight">
              Upload Reference Photo
            </AlertDialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add a face reference for consistent character generation
            </p>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            {!file ? (
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                  ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                  }
                `}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                    <Upload className="size-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {isDragActive
                        ? "Drop the image here"
                        : "Drop an image or click to browse"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      JPG, PNG, WebP, GIF, or AVIF
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                <div className="relative rounded-xl overflow-hidden border bg-muted/20">
                  <div className="aspect-square max-w-[200px] mx-auto">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="size-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={clear_file}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Name input */}
                <div className="space-y-2">
                  <Label
                    htmlFor="refName"
                    className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    Reference Name
                  </Label>
                  <Input
                    id="refName"
                    value={name}
                    onChange={(e) => set_name(e.target.value)}
                    placeholder="e.g., Sarah - Main Character"
                    className="bg-background"
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-muted/5 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={handle_close}>
              Cancel
            </Button>
            <Button
              onClick={handle_upload}
              disabled={!file || !name.trim() || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="size-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
