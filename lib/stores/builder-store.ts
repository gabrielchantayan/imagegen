import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

import type { Component } from "@/lib/types/database";

type ResolutionStrategy = "use_first" | "use_last" | "combine";

type Subject = {
  id: string;
  selections: Record<string, Component[]>; // category_id -> components array
};

type GenerationSettings = {
  aspect_ratio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  resolution: "1080p" | "4K";
  image_count: 1 | 2 | 3 | 4;
  safety_override: boolean;
  google_search: boolean;
  show_inline_references: boolean;
};

type ConflictInfo = {
  id: string; // Unique identifier for this conflict
  field: string;
  values: { value: string; source: string }[]; // All conflicting values
  resolved_value: string; // The value after applying resolution
};

type BuilderState = {
  // Subjects (multi-subject support)
  subjects: Subject[];
  active_subject_id: string | null;

  // Shared selections (scene, background, camera, bans)
  shared_selections: Record<string, Component[]>;

  // Reference photo selection
  selected_reference_ids: string[];

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

  // Conflicts and resolutions
  conflicts: ConflictInfo[];
  conflict_resolutions: Record<string, ResolutionStrategy>;

  // Actions
  set_active_category: (category: string) => void;
  select_component: (category_id: string, component: Component) => void;
  deselect_component: (category_id: string, component_id: string) => void;
  clear_category: (category_id: string) => void;
  set_conflict_resolution: (
    conflict_id: string,
    resolution: ResolutionStrategy,
  ) => void;
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

  // Reference actions
  select_reference: (id: string) => void;
  deselect_reference: (id: string) => void;
  clear_references: () => void;
  set_references: (ids: string[]) => void;
  add_references: (ids: string[]) => void;
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
  show_inline_references: true,
};

// Categories that contribute to body/subject
const BODY_CATEGORIES = ["characters", "physical_traits", "jewelry"];

// Mapping for wardrobe piece categories to their field
const WARDROBE_PIECE_MAPPING: Record<string, string> = {
  wardrobe_tops: "top",
  wardrobe_bottoms: "bottom",
  wardrobe_footwear: "footwear",
};

// Mapping from category ID to prompt key
const SHARED_CATEGORY_MAPPING: Record<string, string> = {
  scenes: "scene",
  backgrounds: "background",
  camera: "camera",
  ban_lists: "ban",
};

// Hardcoded defaults
// const DEFAULT_LOOK = {
//   texture: "modern phone camera; mild JPEG artifacts",
//   color: "perfect white balance",
// };

const DEFAULT_LOOK = {};

const DEFAULT_STYLE = {
  authenticity: "imperfect candid moment",
};

type SubjectSections = {
  body: Record<string, unknown>;
  wardrobe: Record<string, unknown>;
  pose: Record<string, unknown>;
};

// Helper to combine string values intelligently
const combine_strings = (values: string[]): string => {
  // Remove duplicates and empty strings, then join
  const unique = [...new Set(values.filter(Boolean))];
  return unique.join("; ");
};

// Helper to combine object values recursively
const combine_objects = (
  objects: Record<string, unknown>[],
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const all_keys = new Set(objects.flatMap(Object.keys));

  for (const key of all_keys) {
    const values = objects
      .map((obj) => obj[key])
      .filter((v) => v !== undefined);
    if (values.length === 0) continue;

    if (values.every((v) => typeof v === "string")) {
      result[key] = combine_strings(values as string[]);
    } else if (
      values.every(
        (v) => typeof v === "object" && v !== null && !Array.isArray(v),
      )
    ) {
      result[key] = combine_objects(values as Record<string, unknown>[]);
    } else {
      // For mixed types or arrays, use last value
      result[key] = values[values.length - 1];
    }
  }

  return result;
};

// Apply resolution strategy to get final value
const apply_resolution = (
  values: { value: unknown; source: string }[],
  resolution: ResolutionStrategy,
): unknown => {
  if (values.length === 0) return undefined;
  if (values.length === 1) return values[0].value;

  switch (resolution) {
    case "use_first":
      return values[0].value;
    case "use_last":
      return values[values.length - 1].value;
    case "combine":
      if (values.every((v) => typeof v.value === "string")) {
        return combine_strings(values.map((v) => v.value as string));
      } else if (
        values.every(
          (v) =>
            typeof v.value === "object" &&
            v.value !== null &&
            !Array.isArray(v.value),
        )
      ) {
        return combine_objects(
          values.map((v) => v.value as Record<string, unknown>),
        );
      }
      // Fall back to last value for unsupported types
      return values[values.length - 1].value;
  }
};

type FieldValues = Map<string, { value: unknown; source: string }[]>;

const is_plain_object = (val: unknown): val is Record<string, unknown> => {
  return typeof val === "object" && val !== null && !Array.isArray(val);
};

/**
 * Recursively collect field values at all nesting levels
 * Uses dot-notation paths (e.g., "subject.hair", "subject.appearance.color")
 */
const collect_field_values_deep = (
  fields: FieldValues,
  data: Record<string, unknown>,
  source: string,
  path_prefix = "",
): void => {
  for (const [key, value] of Object.entries(data)) {
    const path = path_prefix ? `${path_prefix}.${key}` : key;

    if (is_plain_object(value)) {
      // Recurse into nested objects
      collect_field_values_deep(fields, value, source, path);
    } else {
      // Leaf value - collect it
      if (!fields.has(path)) {
        fields.set(path, []);
      }
      fields.get(path)!.push({ value, source });
    }
  }
};

/**
 * Set a value at a nested path in an object
 * e.g., set_nested(obj, "subject.hair", "long") sets obj.subject.hair = "long"
 */
const set_nested = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void => {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!is_plain_object(current[part])) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
};

/**
 * Resolve fields with deep conflict detection
 * Detects conflicts at leaf level and builds nested result structure
 */
const resolve_fields_deep = (
  fields: FieldValues,
  resolutions: Record<string, ResolutionStrategy>,
  section_prefix: string,
  conflicts: ConflictInfo[],
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [path, values] of fields) {
    const conflict_id = `${section_prefix}.${path}`;
    const resolution = resolutions[conflict_id] ?? "use_last";

    // Detect conflicts (more than one unique value)
    const unique_values = values.filter(
      (v, i, arr) =>
        arr.findIndex(
          (a) => JSON.stringify(a.value) === JSON.stringify(v.value),
        ) === i,
    );

    if (unique_values.length > 1) {
      const resolved_value = apply_resolution(values, resolution);
      conflicts.push({
        id: conflict_id,
        field: path.split(".").pop() ?? path,
        values: values.map((v) => ({
          value: String(v.value),
          source: v.source,
        })),
        resolved_value: String(resolved_value),
      });
      set_nested(result, path, resolved_value);
    } else {
      set_nested(result, path, values[values.length - 1].value);
    }
  }

  return result;

};

// Keep shallow version for backwards compatibility
const collect_field_values = (
  fields: FieldValues,
  data: Record<string, unknown>,
  source: string,
): void => {
  collect_field_values_deep(fields, data, source, "");
};

const resolve_fields = (
  fields: FieldValues,
  resolutions: Record<string, ResolutionStrategy>,
  section_prefix: string,
  conflicts: ConflictInfo[],
): Record<string, unknown> => {
  return resolve_fields_deep(fields, resolutions, section_prefix, conflicts);
};

const compose_subject_sections = (
  selections: Record<string, Component[]>,
  resolutions: Record<string, ResolutionStrategy>,
  conflicts: ConflictInfo[],
): SubjectSections => {
  const body_fields: FieldValues = new Map();
  const wardrobe_fields: FieldValues = new Map();
  const pose_fields: FieldValues = new Map();

  // Process body categories (characters, physical_traits, jewelry)
  for (const category_id of BODY_CATEGORIES) {
    const components = selections[category_id] ?? [];
    for (const component of components) {
      collect_field_values(body_fields, component.data, component.name);
    }
  }

  // Process wardrobe category (full wardrobe)
  const wardrobe_components = selections["wardrobe"] ?? [];
  for (const component of wardrobe_components) {
    collect_field_values(wardrobe_fields, component.data, component.name);
  }

  // Process wardrobe piece categories (override specific fields)
  for (const [category_id, field_name] of Object.entries(
    WARDROBE_PIECE_MAPPING,
  )) {
    const components = selections[category_id] ?? [];
    for (const component of components) {
      // If component has the specific field, use it; otherwise merge all data
      if (field_name in component.data) {
        collect_field_values(
          wardrobe_fields,
          { [field_name]: component.data[field_name] },
          component.name,
        );

        // For bottoms, also include belt if present
        if (category_id === "wardrobe_bottoms" && "belt" in component.data) {
          collect_field_values(
            wardrobe_fields,
            { belt: component.data["belt"] },
            component.name,
          );
        }
      } else {
        collect_field_values(wardrobe_fields, component.data, component.name);
      }
    }
  }

  // Process poses category
  const pose_components = selections["poses"] ?? [];
  for (const component of pose_components) {
    collect_field_values(pose_fields, component.data, component.name);
  }

  // Resolve all fields with their resolutions
  const body = resolve_fields(body_fields, resolutions, "body", conflicts);
  const wardrobe = resolve_fields(
    wardrobe_fields,
    resolutions,
    "wardrobe",
    conflicts,
  );
  const pose = resolve_fields(pose_fields, resolutions, "pose", conflicts);

  return { body, wardrobe, pose };
};

const compose_prompt = (
  subjects: Subject[],
  shared_selections: Record<string, Component[]>,
  resolutions: Record<string, ResolutionStrategy>,
): { prompt: Record<string, unknown>; conflicts: ConflictInfo[] } => {
  const conflicts: ConflictInfo[] = [];
  const prompt: Record<string, unknown> = {};

  // Build subject sections
  const subject_sections: SubjectSections[] = [];

  for (const subject of subjects) {
    const sections = compose_subject_sections(
      subject.selections,
      resolutions,
      conflicts,
    );
    if (
      Object.keys(sections.body).length > 0 ||
      Object.keys(sections.wardrobe).length > 0 ||
      Object.keys(sections.pose).length > 0
    ) {
      subject_sections.push(sections);
    }
  }

  // Set subject(s) based on count
  if (subject_sections.length === 1) {
    // Single subject: body goes to "subject", wardrobe and pose are top-level
    const { body, wardrobe, pose } = subject_sections[0];
    if (Object.keys(body).length > 0) {
      prompt.subject = body;
    }
    if (Object.keys(wardrobe).length > 0) {
      prompt.wardrobe = wardrobe;
    }
    if (Object.keys(pose).length > 0) {
      prompt.pose = pose;
    }
  } else if (subject_sections.length > 1) {
    // Multiple subjects: each has nested body, wardrobe, pose
    prompt.subjects = subject_sections.map(({ body, wardrobe, pose }) => {
      const subject_obj: Record<string, unknown> = {};
      if (Object.keys(body).length > 0) {
        subject_obj.body = body;
      }
      if (Object.keys(wardrobe).length > 0) {
        subject_obj.wardrobe = wardrobe;
      }
      if (Object.keys(pose).length > 0) {
        subject_obj.pose = pose;
      }
      return subject_obj;
    });
  }

  // Apply shared selections - merge multiple components per category
  for (const [category_id, components] of Object.entries(shared_selections)) {
    if (!components || components.length === 0) continue;

    const prompt_key = SHARED_CATEGORY_MAPPING[category_id] || category_id;

    if (components.length === 1) {
      const component = components[0];
      if (
        typeof component.data === "object" &&
        !Array.isArray(component.data)
      ) {
        const data_keys = Object.keys(component.data);
        if (
          data_keys.length === 1 &&
          typeof component.data[data_keys[0]] === "string"
        ) {
          prompt[prompt_key] = component.data[data_keys[0]];
        } else {
          prompt[prompt_key] = component.data;
        }
      } else {
        prompt[prompt_key] = component.data;
      }
    } else {
      // Multiple components - collect and resolve fields
      const shared_fields: FieldValues = new Map();
      for (const component of components) {
        if (
          typeof component.data === "object" &&
          !Array.isArray(component.data)
        ) {
          collect_field_values(shared_fields, component.data, component.name);
        }
      }
      const resolved = resolve_fields(
        shared_fields,
        resolutions,
        `shared.${category_id}`,
        conflicts,
      );
      if (Object.keys(resolved).length > 0) {
        prompt[prompt_key] = resolved;
      }
    }
  }

  // Add hardcoded defaults (only if we have any subject data)
  if (subject_sections.length > 0) {
    prompt.look = DEFAULT_LOOK;
    prompt.style = DEFAULT_STYLE;
  }

  return { prompt, conflicts };
};

export const use_builder_store = create<BuilderState>()(
  persist(
    (set, get) => {
      const recompute_prompt = () => {
        const state = get();
        const { prompt, conflicts } = compose_prompt(
          state.subjects,
          state.shared_selections,
          state.conflict_resolutions,
        );
        set({
          composed_prompt: Object.keys(prompt).length > 0 ? prompt : null,
          conflicts,
        });
      };

      const initial_subject = create_empty_subject();

      return {
        subjects: [initial_subject],
        active_subject_id: initial_subject.id,
        shared_selections: {},
        selected_reference_ids: [],
        active_category: "characters",
        composed_prompt: null,
        settings: DEFAULT_SETTINGS,
        last_generated_image: null,
        generation_status: "idle",
        generation_error: null,
        queue_position: null,
        conflicts: [],
        conflict_resolutions: {},

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
            // Shared selection - toggle: add if not present, remove if present
            const current = state.shared_selections[category_id] ?? [];
            const exists = current.some((c) => c.id === component.id);
            const updated = exists
              ? current.filter((c) => c.id !== component.id)
              : [...current, component];

            set({
              shared_selections: {
                ...state.shared_selections,
                [category_id]: updated,
              },
            });
          } else {
            // Subject-specific selection - toggle behavior
            const subject_id = state.active_subject_id || state.subjects[0]?.id;
            if (!subject_id) return;

            set({
              subjects: state.subjects.map((s) => {
                if (s.id !== subject_id) return s;

                const current = s.selections[category_id] ?? [];
                const exists = current.some((c) => c.id === component.id);
                const updated = exists
                  ? current.filter((c) => c.id !== component.id)
                  : [...current, component];

                return {
                  ...s,
                  selections: { ...s.selections, [category_id]: updated },
                };
              }),
            });
          }

          // Recompute prompt and conflicts
          recompute_prompt();

          // Track usage for stats (only when adding)
          const current_selection = SHARED_CATEGORIES.includes(category_id)
            ? (state.shared_selections[category_id] ?? [])
            : (state.subjects.find((s) => s.id === state.active_subject_id)
                ?.selections[category_id] ?? []);

          if (!current_selection.some((c) => c.id === component.id)) {
            fetch("/api/stats/track", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ component_id: component.id }),
            }).catch(() => {
              // Silent fail - tracking is non-critical
            });
          }
        },

        deselect_component: (category_id, component_id) => {
          const state = get();

          if (SHARED_CATEGORIES.includes(category_id)) {
            const current = state.shared_selections[category_id] ?? [];
            set({
              shared_selections: {
                ...state.shared_selections,
                [category_id]: current.filter((c) => c.id !== component_id),
              },
            });
          } else {
            const subject_id = state.active_subject_id || state.subjects[0]?.id;
            if (!subject_id) return;

            set({
              subjects: state.subjects.map((s) => {
                if (s.id !== subject_id) return s;
                const current = s.selections[category_id] ?? [];
                return {
                  ...s,
                  selections: {
                    ...s.selections,
                    [category_id]: current.filter((c) => c.id !== component_id),
                  },
                };
              }),
            });
          }

          recompute_prompt();
        },

        clear_category: (category_id) => {
          const state = get();

          if (SHARED_CATEGORIES.includes(category_id)) {
            set({
              shared_selections: {
                ...state.shared_selections,
                [category_id]: [],
              },
            });
          } else {
            const subject_id = state.active_subject_id || state.subjects[0]?.id;
            if (!subject_id) return;

            set({
              subjects: state.subjects.map((s) =>
                s.id === subject_id
                  ? { ...s, selections: { ...s.selections, [category_id]: [] } }
                  : s,
              ),
            });
          }

          recompute_prompt();
        },

        set_conflict_resolution: (conflict_id, resolution) => {
          set((state) => ({
            conflict_resolutions: {
              ...state.conflict_resolutions,
              [conflict_id]: resolution,
            },
          }));
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
            const new_subjects = state.subjects.filter(
              (s) => s.id !== subject_id,
            );
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
            selected_reference_ids: [],
            composed_prompt: null,
            conflicts: [],
            conflict_resolutions: {},
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

        // Reference actions
        select_reference: (id) => {
          set((state) => {
            if (state.selected_reference_ids.includes(id)) {
              return state;
            }
            return {
              selected_reference_ids: [...state.selected_reference_ids, id],
            };
          });
        },

        deselect_reference: (id) => {
          set((state) => ({
            selected_reference_ids: state.selected_reference_ids.filter(
              (ref_id) => ref_id !== id,
            ),
          }));
        },

        clear_references: () => {
          set({ selected_reference_ids: [] });
        },

        set_references: (ids) => {
          set({ selected_reference_ids: ids });
        },

        add_references: (ids) => {
          set((state) => {
            const new_ids = ids.filter(
              (id) => !state.selected_reference_ids.includes(id),
            );
            if (new_ids.length === 0) return state;
            return {
              selected_reference_ids: [...state.selected_reference_ids, ...new_ids],
            };
          });
        },
      };
    },
    {
      name: "prompt-builder-storage",
      version: 3,
      partialize: (state) => ({
        subjects: state.subjects,
        shared_selections: state.shared_selections,
        selected_reference_ids: state.selected_reference_ids,
        settings: state.settings,
        active_subject_id: state.active_subject_id,
        conflict_resolutions: state.conflict_resolutions,
      }),
      migrate: (persisted_state, version) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = persisted_state as any;

        if (version < 2) {
          // Migrate from single selection to array
          // Convert subjects.selections from Record<string, Component | null> to Record<string, Component[]>
          if (state.subjects) {
            state.subjects = state.subjects.map(
              (subject: {
                id: string;
                selections: Record<string, unknown>;
              }) => ({
                ...subject,
                selections: Object.fromEntries(
                  Object.entries(subject.selections || {}).map(
                    ([key, value]) => [key, value ? [value] : []],
                  ),
                ),
              }),
            );
          }

          // Convert shared_selections from Record<string, Component | null> to Record<string, Component[]>
          if (state.shared_selections) {
            state.shared_selections = Object.fromEntries(
              Object.entries(state.shared_selections).map(([key, value]) => [
                key,
                value ? [value] : [],
              ]),
            );
          }

          // Initialize conflict_resolutions if not present
          if (!state.conflict_resolutions) {
            state.conflict_resolutions = {};
          }
        }

        if (version < 3) {
          // Initialize selected_reference_ids if not present
          if (!state.selected_reference_ids) {
            state.selected_reference_ids = [];
          }
        }

        return state as BuilderState;
      },
    },
  ),
);

// Export types for use elsewhere
export type {
  Subject,
  GenerationSettings,
  ConflictInfo,
  BuilderState,
  ResolutionStrategy,
};

// Export constants
export { SHARED_CATEGORIES };

// Memoized selectors
export const use_builder_selections = () =>
  use_builder_store(
    useShallow((s) => ({
      subjects: s.subjects,
      active_subject_id: s.active_subject_id,
      shared_selections: s.shared_selections,
      active_category: s.active_category,
    }))
  );

export const use_builder_actions = () =>
  use_builder_store(
    useShallow((s) => ({
      select_component: s.select_component,
      deselect_component: s.deselect_component,
      clear_category: s.clear_category,
      set_active_category: s.set_active_category,
      add_subject: s.add_subject,
      remove_subject: s.remove_subject,
      set_active_subject: s.set_active_subject,
      clear_builder: s.clear_builder,
    }))
  );

export const use_builder_generation_state = () =>
  use_builder_store(
    useShallow((s) => ({
      composed_prompt: s.composed_prompt,
      settings: s.settings,
      generation_status: s.generation_status,
      generation_error: s.generation_error,
      queue_position: s.queue_position,
      last_generated_image: s.last_generated_image,
    }))
  );

export const use_builder_generation_actions = () =>
  use_builder_store(
    useShallow((s) => ({
      update_settings: s.update_settings,
      set_generation_status: s.set_generation_status,
      set_last_generated_image: s.set_last_generated_image,
      set_queue_position: s.set_queue_position,
      set_generation_error: s.set_generation_error,
    }))
  );

export const use_builder_references = () =>
  use_builder_store(
    useShallow((s) => ({
      selected_reference_ids: s.selected_reference_ids,
    }))
  );

export const use_builder_reference_actions = () =>
  use_builder_store(
    useShallow((s) => ({
      select_reference: s.select_reference,
      deselect_reference: s.deselect_reference,
      clear_references: s.clear_references,
      set_references: s.set_references,
      add_references: s.add_references,
    }))
  );

export const use_builder_conflicts = () =>
  use_builder_store(
    useShallow((s) => ({
      conflicts: s.conflicts,
      conflict_resolutions: s.conflict_resolutions,
    }))
  );

export const use_builder_conflict_actions = () =>
  use_builder_store(
    useShallow((s) => ({
      set_conflict_resolution: s.set_conflict_resolution,
    }))
  );
