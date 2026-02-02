import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Component } from "@/lib/types/database";

type Subject = {
  id: string;
  selections: Record<string, Component | null>; // category_id -> component
};

type GenerationSettings = {
  aspect_ratio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  resolution: "1080p" | "4K";
  image_count: 1 | 2 | 3 | 4;
  safety_override: boolean;
  google_search: boolean;
};

type ConflictInfo = {
  field: string;
  existing_value: string;
  new_value: string;
  source: string; // Component name that would override
};

type BuilderState = {
  // Subjects (multi-subject support)
  subjects: Subject[];
  active_subject_id: string | null;

  // Shared selections (scene, background, camera, bans)
  shared_selections: Record<string, Component | null>;

  // Active category in UI
  active_category: string;

  // Composed JSON (computed)
  composed_prompt: Record<string, unknown> | null;

  // Generation
  settings: GenerationSettings;
  last_generated_image: string | null;
  generation_status: "idle" | "queued" | "generating" | "completed" | "failed";
  generation_error: string | null;
  queue_position: number | null;

  // Conflicts
  conflicts: ConflictInfo[];

  // Actions
  set_active_category: (category: string) => void;
  select_component: (category_id: string, component: Component | null) => void;
  add_subject: () => void;
  remove_subject: (subject_id: string) => void;
  set_active_subject: (subject_id: string) => void;
  update_settings: (settings: Partial<GenerationSettings>) => void;
  clear_builder: () => void;
  load_prompt: (prompt: Record<string, unknown>) => void;
  set_generation_status: (status: BuilderState["generation_status"]) => void;
  set_last_generated_image: (path: string | null) => void;
  set_queue_position: (position: number | null) => void;
  set_generation_error: (error: string | null) => void;
};

const SHARED_CATEGORIES = ["scenes", "backgrounds", "camera", "ban_lists"];

const generate_subject_id = (): string => {
  return `subject-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
};

const create_empty_subject = (): Subject => {
  return {
    id: generate_subject_id(),
    selections: {},
  };
};

const DEFAULT_SETTINGS: GenerationSettings = {
  aspect_ratio: "3:4",
  resolution: "4K",
  image_count: 1,
  safety_override: false,
  google_search: false,
};

// Category order for merging components
const CATEGORY_ORDER = [
  "characters",
  "physical_traits",
  "jewelry",
  "wardrobe",
  "wardrobe_tops",
  "wardrobe_bottoms",
  "wardrobe_footwear",
  "poses",
];

// Mapping from category ID to prompt key
const SHARED_CATEGORY_MAPPING: Record<string, string> = {
  scenes: "scene",
  backgrounds: "background",
  camera: "camera",
  ban_lists: "ban",
};

const compose_prompt = (
  subjects: Subject[],
  shared_selections: Record<string, Component | null>
): { prompt: Record<string, unknown>; conflicts: ConflictInfo[] } => {
  const conflicts: ConflictInfo[] = [];
  const prompt: Record<string, unknown> = {};

  // Build subjects array
  const subject_data: Record<string, unknown>[] = [];

  for (const subject of subjects) {
    const subject_prompt: Record<string, unknown> = {};
    const processed_fields = new Map<string, { value: unknown; source: string }>();

    // Apply selections in order of category
    for (const category_id of CATEGORY_ORDER) {
      const component = subject.selections[category_id];
      if (!component) continue;

      // Merge component data into subject prompt
      for (const [key, value] of Object.entries(component.data)) {
        const existing = processed_fields.get(key);

        if (existing && JSON.stringify(existing.value) !== JSON.stringify(value)) {
          // Conflict detected
          conflicts.push({
            field: key,
            existing_value: String(existing.value),
            new_value: String(value),
            source: component.name,
          });
        }

        // Later selections override earlier ones
        subject_prompt[key] = value;
        processed_fields.set(key, { value, source: component.name });
      }
    }

    if (Object.keys(subject_prompt).length > 0) {
      subject_data.push(subject_prompt);
    }
  }

  // Set subject(s)
  if (subject_data.length === 1) {
    prompt.subject = subject_data[0];
  } else if (subject_data.length > 1) {
    prompt.subjects = subject_data;
  }

  // Apply shared selections
  for (const [category_id, component] of Object.entries(shared_selections)) {
    if (!component) continue;

    const prompt_key = SHARED_CATEGORY_MAPPING[category_id] || category_id;

    // Merge component data
    if (typeof component.data === "object" && !Array.isArray(component.data)) {
      for (const [key, value] of Object.entries(component.data)) {
        prompt[key] = value;
      }
    } else {
      prompt[prompt_key] = component.data;
    }
  }

  return { prompt, conflicts };
};

export const use_builder_store = create<BuilderState>()(
  persist(
    (set, get) => {
      const recompute_prompt = () => {
        const state = get();
        const { prompt, conflicts } = compose_prompt(state.subjects, state.shared_selections);
        set({ composed_prompt: Object.keys(prompt).length > 0 ? prompt : null, conflicts });
      };

      const initial_subject = create_empty_subject();

      return {
        subjects: [initial_subject],
        active_subject_id: initial_subject.id,
        shared_selections: {},
        active_category: "characters",
        composed_prompt: null,
        settings: DEFAULT_SETTINGS,
        last_generated_image: null,
        generation_status: "idle",
        generation_error: null,
        queue_position: null,
        conflicts: [],

        set_active_category: (category) => {
          set({ active_category: category });

          // Auto-select first subject if switching to subject-specific category
          const state = get();
          if (
            !SHARED_CATEGORIES.includes(category) &&
            !state.active_subject_id &&
            state.subjects.length > 0
          ) {
            set({ active_subject_id: state.subjects[0].id });
          }
        },

        select_component: (category_id, component) => {
          const state = get();

          if (SHARED_CATEGORIES.includes(category_id)) {
            // Shared selection
            set({
              shared_selections: {
                ...state.shared_selections,
                [category_id]: component,
              },
            });
          } else {
            // Subject-specific selection
            const subject_id = state.active_subject_id || state.subjects[0]?.id;
            if (!subject_id) return;

            set({
              subjects: state.subjects.map((s) =>
                s.id === subject_id
                  ? { ...s, selections: { ...s.selections, [category_id]: component } }
                  : s
              ),
            });
          }

          // Recompute prompt and conflicts
          recompute_prompt();
        },

        add_subject: () => {
          const new_subject = create_empty_subject();
          set((state) => ({
            subjects: [...state.subjects, new_subject],
            active_subject_id: new_subject.id,
          }));
        },

        remove_subject: (subject_id) => {
          set((state) => {
            const new_subjects = state.subjects.filter((s) => s.id !== subject_id);
            if (new_subjects.length === 0) {
              new_subjects.push(create_empty_subject());
            }
            return {
              subjects: new_subjects,
              active_subject_id:
                state.active_subject_id === subject_id
                  ? new_subjects[0].id
                  : state.active_subject_id,
            };
          });
          recompute_prompt();
        },

        set_active_subject: (subject_id) => {
          set({ active_subject_id: subject_id });
        },

        update_settings: (settings) => {
          set((state) => ({
            settings: { ...state.settings, ...settings },
          }));
        },

        clear_builder: () => {
          const new_subject = create_empty_subject();
          set({
            subjects: [new_subject],
            active_subject_id: new_subject.id,
            shared_selections: {},
            composed_prompt: null,
            conflicts: [],
            last_generated_image: null,
            generation_status: "idle",
            generation_error: null,
          });
        },

        load_prompt: (prompt) => {
          // Parse prompt JSON back into selections
          // This is complex - need to reverse the composition
          // For now, just set the raw prompt
          set({ composed_prompt: prompt });
        },

        set_generation_status: (status) => {
          set({ generation_status: status });
        },

        set_last_generated_image: (path) => {
          set({ last_generated_image: path });
        },

        set_queue_position: (position) => {
          set({ queue_position: position });
        },

        set_generation_error: (error) => {
          set({ generation_error: error });
        },
      };
    },
    {
      name: "prompt-builder-storage",
      partialize: (state) => ({
        subjects: state.subjects,
        shared_selections: state.shared_selections,
        settings: state.settings,
        active_subject_id: state.active_subject_id,
      }),
    }
  )
);

// Export types for use elsewhere
export type { Subject, GenerationSettings, ConflictInfo, BuilderState };

// Export constants
export { SHARED_CATEGORIES };
