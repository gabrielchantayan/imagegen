/**
 * Conflict Resolution Module
 *
 * Handles detection and resolution of conflicts when composing prompts
 * from multiple component selections. Supports deep nested object merging
 * with configurable resolution strategies.
 */

export type ResolutionStrategy = "use_first" | "use_last" | "combine";

export type ConflictInfo = {
  id: string; // Unique identifier for this conflict (e.g., "subject_0.hair")
  field: string; // The field name (leaf key)
  values: { value: string; source: string }[]; // All conflicting values
  resolved_value: string; // The value after applying resolution
};

export type FieldValue = {
  value: unknown;
  source: string;
};

export type FieldValues = Map<string, FieldValue[]>;

// Type guard for plain objects
export const is_plain_object = (val: unknown): val is Record<string, unknown> => {
  return typeof val === "object" && val !== null && !Array.isArray(val);
};

/**
 * Combines string values intelligently by removing duplicates and joining.
 */
export const combine_strings = (values: string[]): string => {
  const unique = [...new Set(values.filter(Boolean))];
  return unique.join("; ");
};

/**
 * Combines object values recursively, merging nested properties.
 */
export const combine_objects = (
  objects: Record<string, unknown>[]
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
    } else if (values.every((v) => is_plain_object(v))) {
      result[key] = combine_objects(values as Record<string, unknown>[]);
    } else {
      // For mixed types or arrays, use last value
      result[key] = values[values.length - 1];
    }
  }

  return result;
};

/**
 * Applies a resolution strategy to get the final value from multiple inputs.
 *
 * @param values - Array of values with their sources
 * @param resolution - The strategy to use for resolving conflicts
 * @param is_array_merge - If true, always combine values into an array
 */
export const apply_resolution = (
  values: FieldValue[],
  resolution: ResolutionStrategy,
  is_array_merge = false
): unknown => {
  if (values.length === 0) return undefined;
  if (values.length === 1) return values[0].value;

  // If this is an array field (like accessories), always combine
  if (is_array_merge) {
    const all_items: unknown[] = [];
    for (const v of values) {
      if (Array.isArray(v.value)) all_items.push(...v.value);
      else if (v.value) all_items.push(v.value);
    }
    // De-duplicate primitives
    const unique = [...new Set(all_items)];
    return unique;
  }

  switch (resolution) {
    case "use_first":
      return values[0].value;
    case "use_last":
      return values[values.length - 1].value;
    case "combine":
      if (values.every((v) => typeof v.value === "string")) {
        return combine_strings(values.map((v) => v.value as string));
      } else if (values.every((v) => is_plain_object(v.value))) {
        return combine_objects(
          values.map((v) => v.value as Record<string, unknown>)
        );
      }
      // Fall back to last value for unsupported types
      return values[values.length - 1].value;
  }
};

/**
 * Recursively collects field values at all nesting levels.
 * Uses dot-notation paths (e.g., "subject.hair", "subject.appearance.color").
 *
 * @param fields - The map to collect values into
 * @param data - The source data object
 * @param source - Name of the source component
 * @param path_prefix - Current path prefix for nested values
 */
export const collect_field_values_deep = (
  fields: FieldValues,
  data: Record<string, unknown>,
  source: string,
  path_prefix = ""
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
 * Sets a value at a nested path in an object.
 * e.g., set_nested(obj, "subject.hair", "long") sets obj.subject.hair = "long"
 *
 * @param obj - The target object
 * @param path - Dot-notation path
 * @param value - Value to set
 */
export const set_nested = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown
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
 * Fields that should always merge values into arrays rather than conflict.
 */
const ARRAY_MERGE_FIELDS = ["accessories", "negative_prompt"];

/**
 * Checks if a field path should use array merging instead of conflict resolution.
 */
const should_array_merge = (path: string): boolean => {
  return ARRAY_MERGE_FIELDS.some((field) => path.endsWith(field));
};

/**
 * Resolves fields with deep conflict detection.
 * Detects conflicts at leaf level and builds nested result structure.
 *
 * @param fields - Map of field paths to their values from different sources
 * @param resolutions - Map of conflict IDs to resolution strategies
 * @param section_prefix - Prefix for conflict IDs (e.g., "subject_0", "shared.scenes")
 * @param conflicts - Array to collect detected conflicts into
 * @returns Resolved object with all conflicts handled
 */
export const resolve_fields_deep = (
  fields: FieldValues,
  resolutions: Record<string, ResolutionStrategy>,
  section_prefix: string,
  conflicts: ConflictInfo[]
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [path, values] of fields) {
    const conflict_id = `${section_prefix}.${path}`;
    const resolution = resolutions[conflict_id] ?? "use_last";

    // Check if this is a field that should always merge arrays
    const is_array_merge = should_array_merge(path);

    // Detect conflicts (more than one unique value) - skip conflict for array merge types
    const unique_values = values.filter(
      (v, i, arr) =>
        arr.findIndex(
          (a) => JSON.stringify(a.value) === JSON.stringify(v.value)
        ) === i
    );

    if (unique_values.length > 1 && !is_array_merge) {
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
      // No conflict or it's an array merge
      const final_value = apply_resolution(values, resolution, is_array_merge);
      set_nested(result, path, final_value);
    }
  }

  return result;
};

/**
 * Alias for resolve_fields_deep for backwards compatibility.
 */
export const resolve_fields = resolve_fields_deep;

/**
 * Creates a new empty FieldValues map.
 */
export const create_field_values = (): FieldValues => new Map();

/**
 * Gets all unique sources that contributed to a FieldValues map.
 */
export const get_sources = (fields: FieldValues): string[] => {
  const sources = new Set<string>();
  for (const values of fields.values()) {
    for (const { source } of values) {
      sources.add(source);
    }
  }
  return [...sources];
};

/**
 * Checks if a FieldValues map has any conflicts (fields with multiple unique values).
 */
export const has_conflicts = (fields: FieldValues): boolean => {
  for (const [path, values] of fields) {
    if (should_array_merge(path)) continue;

    const unique_values = values.filter(
      (v, i, arr) =>
        arr.findIndex(
          (a) => JSON.stringify(a.value) === JSON.stringify(v.value)
        ) === i
    );

    if (unique_values.length > 1) {
      return true;
    }
  }
  return false;
};
