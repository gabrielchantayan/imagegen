"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ComponentCard } from "@/components/library/component-card";
import { ComponentEditor } from "@/components/library/component-editor";
import { AnalyzePanel } from "./analyze-panel";
import { FacialAnalysisPanel } from "./facial-analysis-panel";
import { SavePresetsModal } from "./save-presets-modal";
import { GeneratePanel } from "./generate-panel";
import { ReferencesPanel } from "./references-panel";
import {
  use_components,
  create_component_api,
  update_component_api,
  delete_component_api,
} from "@/lib/hooks/use-components";
import { use_builder_store, SHARED_CATEGORIES } from "@/lib/stores/builder-store";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { Loader2, Plus, ScanFace, X } from "lucide-react";

import type { Component } from "@/lib/types/database";

export const ComponentGrid = () => {
  const active_category = use_builder_store((s) => s.active_category);
  const select_component = use_builder_store((s) => s.select_component);
  const clear_category = use_builder_store((s) => s.clear_category);
  const subjects = use_builder_store((s) => s.subjects);
  const active_subject_id = use_builder_store((s) => s.active_subject_id);
  const shared_selections = use_builder_store((s) => s.shared_selections);

  const { components, categories, is_loading, mutate } = use_components(active_category);
  const [search, set_search] = useState("");
  const [editor_open, set_editor_open] = useState(false);
  const [editing_component, set_editing_component] = useState<Component | null>(null);
  const [analysis_data, set_analysis_data] = useState<Record<string, unknown> | null>(null);
  const [save_presets_open, set_save_presets_open] = useState(false);
  const [show_facial_analysis, set_show_facial_analysis] = useState(false);

  // Handle "analyze" special category
  if (active_category === "analyze") {
    return (
      <>
        <AnalyzePanel
          on_save_as_presets={(data) => {
            set_analysis_data(data);
            set_save_presets_open(true);
          }}
        />
        {analysis_data && (
          <SavePresetsModal
            open={save_presets_open}
            on_open_change={set_save_presets_open}
            analysis_data={analysis_data}
          />
        )}
      </>
    );
  }

  // Handle "generate" special category
  if (active_category === "generate") {
    return <GeneratePanel />;
  }

  // Handle "references" special category
  if (active_category === "references") {
    return <ReferencesPanel />;
  }

  // Handle facial analysis panel for physical_traits category
  if (active_category === "physical_traits" && show_facial_analysis) {
    return (
      <FacialAnalysisPanel
        on_back={() => set_show_facial_analysis(false)}
        on_save={() => {
          mutate();
          set_show_facial_analysis(false);
        }}
      />
    );
  }

  // Get current selections for this category (now an array)
  const is_shared = SHARED_CATEGORIES.includes(active_category);
  const current_selections: Component[] = is_shared
    ? shared_selections[active_category] ?? []
    : subjects.find((s) => s.id === active_subject_id)?.selections[active_category] ?? [];

  // Create a map of component id -> selection order (1-based)
  const selection_order_map = new Map(
    current_selections.map((c, index) => [c.id, index + 1])
  );

  // Filter components by search
  const filtered_components = components.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const category = categories.find((c) => c.id === active_category);

  const handle_select = (component: Component) => {
    // Toggle selection (add or remove from array)
    select_component(active_category, component);
  };

  const handle_clear = () => {
    clear_category(active_category);
  };

  const handle_save = async (data: {
    name: string;
    description: string;
    data: Record<string, unknown>;
  }) => {
    if (editing_component) {
      await update_component_api(editing_component.id, data);
    } else {
      await create_component_api({
        category_id: active_category,
        ...data,
      });
    }
    mutate();
  };

  const handle_delete = async () => {
    if (editing_component) {
      await delete_component_api(editing_component.id);
      // Deselect if deleted component was selected
      if (current_selections.some((c) => c.id === editing_component.id)) {
        const deselect_component = use_builder_store.getState().deselect_component;
        deselect_component(active_category, editing_component.id);
      }
      mutate();
      set_editor_open(false);
      set_editing_component(null);
    }
  };

  if (is_loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none p-4 pb-0 bg-background/80 backdrop-blur-sm z-10 sticky top-0">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search components..."
              value={search}
              onChange={(e) => set_search(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex-1 flex items-center justify-end gap-2">
            {current_selections.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <Badge variant="secondary" className="px-3 py-1">
                  {current_selections.length} selected
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handle_clear}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4 mr-1" />
                  Clear
                </Button>
              </div>
            )}
            
            {active_category === "physical_traits" && (
              <Button
                variant="outline"
                onClick={() => set_show_facial_analysis(true)}
              >
                <ScanFace className="size-4 mr-2" />
                Analyze Face
              </Button>
            )}
            
            <Button
              onClick={() => {
                set_editing_component(null);
                set_editor_open(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Add New
            </Button>
          </div>
        </div>
        <div className="h-px bg-border w-full" />
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <ResponsiveMasonry
          columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3, 1200: 4 }}
        >
          <Masonry gutter="1rem">
            {filtered_components.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                selected={selection_order_map.has(component.id)}
                selection_order={selection_order_map.get(component.id)}
                on_select={() => handle_select(component)}
                on_edit={() => {
                  set_editing_component(component);
                  set_editor_open(true);
                }}
              />
            ))}
          </Masonry>
        </ResponsiveMasonry>

        {filtered_components.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-center animate-in fade-in duration-300">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
               {search ? <Loader2 className="size-8" /> : <Plus className="size-8" />}
            </div>
            <h3 className="font-semibold text-lg mb-1">
              {search ? "No matches found" : "No components yet"}
            </h3>
            <p className="max-w-xs mx-auto mb-6">
              {search 
                ? `We couldn't find any components matching "${search}"` 
                : "Create your first component to get started with this category."}
            </p>
            {search ? (
              <Button variant="outline" onClick={() => set_search("")}>
                Clear Search
              </Button>
            ) : (
              <Button
                onClick={() => {
                  set_editing_component(null);
                  set_editor_open(true);
                }}
              >
                <Plus className="size-4 mr-2" />
                Create Component
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Editor modal */}
      <ComponentEditor
        open={editor_open}
        on_open_change={set_editor_open}
        component={editing_component ?? undefined}
        category={category}
        on_save={handle_save}
        on_delete={editing_component ? handle_delete : undefined}
      />
    </div>
  );
};
