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

/**
 * Merge two prompt objects, with the second taking precedence
 */
export const merge_prompts = (
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> => {
  return { ...base, ...override };
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
