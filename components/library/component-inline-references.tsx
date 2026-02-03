'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Label } from '@/components/ui/label';
import { ImagePlus, X, Loader2, Image } from 'lucide-react';
import { use_component_inline_references } from '@/lib/hooks/use-component-inline-references';

type ComponentInlineReferencesProps = {
  component_id: string | undefined;
  inline_references: string[];
  on_change: (updated_references: string[]) => void;
  on_error?: (message: string) => void;
};

export const ComponentInlineReferences = ({
  component_id,
  inline_references,
  on_change,
  on_error,
}: ComponentInlineReferencesProps) => {
  const {
    uploading,
    removing,
    upload_reference,
    remove_reference,
  } = use_component_inline_references({
    component_id,
    inline_references,
    on_change,
    on_error,
  });

  const on_drop = useCallback(
    (accepted_files: File[]) => {
      if (accepted_files.length > 0) {
        upload_reference(accepted_files[0]);
      }
    },
    [upload_reference]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: on_drop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'],
    },
    maxFiles: 1,
    multiple: false,
    disabled: uploading || !component_id,
  });

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Reference Images
      </Label>
      <p className="text-xs text-muted-foreground -mt-1">
        These images will auto-include when generating with this component
      </p>

      {/* Current references grid */}
      {inline_references.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {inline_references.map((image_path) => (
            <div
              key={image_path}
              className="group relative aspect-square rounded-lg overflow-hidden border bg-muted/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image_path}
                alt="Reference"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => remove_reference(image_path)}
                disabled={removing === image_path}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all"
              >
                {removing === image_path ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <X className="size-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload dropzone */}
      {component_id && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${uploading ? 'pointer-events-none opacity-60' : ''}
            ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <Loader2 className="size-5 text-muted-foreground animate-spin" />
                <p className="text-xs text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <ImagePlus className="size-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {isDragActive ? 'Drop image here' : 'Drop or click to add reference'}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {!component_id && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed bg-muted/20 text-muted-foreground">
          <Image className="size-4" />
          <span className="text-xs">Save the component first to add references</span>
        </div>
      )}
    </div>
  );
};
