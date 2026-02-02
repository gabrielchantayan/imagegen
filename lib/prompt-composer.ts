/**
 * Prompt composition utilities for formatting and parsing JSON prompts
 */

/**
 * Format a prompt object as indented JSON for display
 */
export const format_prompt_json = (prompt: Record<string, unknown>): string => {
  return JSON.stringify(prompt, null, 2);
};

/**
 * Parse a JSON string back to a prompt object
 * Returns null if the JSON is invalid
 */
export const parse_prompt_json = (json: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

/**
 * Validate that a prompt has the required structure
 */
export const validate_prompt = (
  prompt: Record<string, unknown>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check for at least some content
  if (Object.keys(prompt).length === 0) {
    errors.push("Prompt is empty");
  }

  // Must have either subject, subjects, or scene
  const has_subject = "subject" in prompt || "subjects" in prompt;
  const has_scene = "scene" in prompt;

  if (!has_subject && !has_scene) {
    errors.push("Prompt must have at least a subject or scene");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const is_plain_object = (val: unknown): val is Record<string, unknown> => {
  return typeof val === "object" && val !== null && !Array.isArray(val);
};

/**
 * Deep equality check for array union merging
 */
const deep_equals = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => deep_equals(val, b[i]));
  }

  if (is_plain_object(a) && is_plain_object(b)) {
    const keys_a = Object.keys(a);
    const keys_b = Object.keys(b);
    if (keys_a.length !== keys_b.length) return false;
    return keys_a.every((key) => deep_equals(a[key], b[key]));
  }

  return false;
};

/**
 * Merge arrays as union (unique values only via deep comparison)
 */
const merge_arrays = (base: unknown[], override: unknown[]): unknown[] => {
  const result = [...base];
  for (const item of override) {
    if (!result.some((existing) => deep_equals(existing, item))) {
      result.push(item);
    }
  }
  return result;
};

/**
 * Deep merge helper - recursively merges objects with override taking precedence
 */
const deep_merge = (
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(override)) {
    const base_val = base[key];
    const override_val = override[key];

    // If both are plain objects, merge recursively
    if (is_plain_object(base_val) && is_plain_object(override_val)) {
      result[key] = deep_merge(
        base_val as Record<string, unknown>,
        override_val as Record<string, unknown>
      );
    } else if (Array.isArray(base_val) && Array.isArray(override_val)) {
      // Union merge for arrays
      result[key] = merge_arrays(base_val, override_val);
    } else {
      // Override takes precedence for primitives and type mismatches
      result[key] = override_val;
    }
  }

  return result;
};

/**
 * Merge two prompt objects with deep merge - override values take precedence
 */
export const merge_prompts = (
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> => {
  return deep_merge(base, override);
};

/**
 * Extract a summary of the prompt for display
 */
export const summarize_prompt = (prompt: Record<string, unknown>): string => {
  const parts: string[] = [];

  if ("subject" in prompt && typeof prompt.subject === "object" && prompt.subject) {
    const subject = prompt.subject as Record<string, unknown>;
    if ("name" in subject) {
      parts.push(String(subject.name));
    }
  }

  if ("subjects" in prompt && Array.isArray(prompt.subjects)) {
    const count = prompt.subjects.length;
    parts.push(`${count} subject${count > 1 ? "s" : ""}`);
  }

  if ("scene" in prompt) {
    parts.push("with scene");
  }

  if ("background" in prompt) {
    parts.push("with background");
  }

  return parts.join(" ") || "Empty prompt";
};
