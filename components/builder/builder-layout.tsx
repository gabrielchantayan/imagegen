"use client";

import { useState, useEffect, useRef } from "react";

import { use_builder_store } from "@/lib/stores/builder-store";
import { ReferenceSyncProvider } from "./reference-sync-provider";
import { CategorySidebar } from "./category-sidebar";
import { ComponentGrid } from "./component-grid";
import { JsonPreview } from "./json-preview";
import { ImagePreview } from "./image-preview";
import { BuilderToolbar } from "./builder-toolbar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, ImageIcon } from "lucide-react";

export const BuilderLayout = () => {
  const [preview_tab, set_preview_tab] = useState<"json" | "image">("json");
  const generation_status = use_builder_store((s) => s.generation_status);
  const last_generated_image = use_builder_store((s) => s.last_generated_image);
  const last_switched_image_ref = useRef<string | null>(null);

  // Auto-switch to image tab when generation completes (only once per new image)
  useEffect(() => {
    if (
      generation_status === "completed" &&
      last_generated_image &&
      last_generated_image !== last_switched_image_ref.current
    ) {
      last_switched_image_ref.current = last_generated_image;
      set_preview_tab("image");
    }
  }, [generation_status, last_generated_image]);

  return (
    <ReferenceSyncProvider>
      <div className="h-full flex flex-col">
        <BuilderToolbar />

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <CategorySidebar className="w-48 border-r shrink-0" />

          {/* Main content */}
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Component selection */}
            <ResizablePanel defaultSize={55} minSize={30}>
              <ComponentGrid />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Preview area */}
            <ResizablePanel defaultSize={45} minSize={25}>
              <Tabs
                value={preview_tab}
                onValueChange={(v) => set_preview_tab(v as "json" | "image")}
                className="h-full flex flex-col"
              >
                <TabsList className="mx-4 mt-2 shrink-0">
                  <TabsTrigger value="json">
                    <Code className="size-4 mr-2" />
                    JSON Preview
                  </TabsTrigger>
                  <TabsTrigger value="image">
                    <ImageIcon className="size-4 mr-2" />
                    Generated Image
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="json" className="flex-1 min-h-0">
                  <JsonPreview />
                </TabsContent>

                <TabsContent value="image" className="flex-1 min-h-0">
                  <ImagePreview />
                </TabsContent>
              </Tabs>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </ReferenceSyncProvider>
  );
};
