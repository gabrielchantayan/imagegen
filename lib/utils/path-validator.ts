import path from "path";
import fs from "fs";

// Allowed base directories for reference images (relative to process.cwd())
const ALLOWED_DIRECTORIES = ["public/images", "public/references"] as const;

export type PathValidationResult = {
  valid: boolean;
  normalized_path?: string;
  error?: string;
};

/**
 * Validates that a reference path is safe and within allowed directories.
 * Prevents path traversal attacks like "../../etc/passwd".
 *
 * @param reference_path - The path to validate (should be relative, e.g., "images/generated/foo.png")
 * @returns Validation result with normalized path or error message
 */
export const validate_reference_path = (reference_path: string): PathValidationResult => {
  if (!reference_path || typeof reference_path !== "string") {
    return { valid: false, error: "Reference path is required" };
  }

  // Remove leading slash if present (paths should be relative to public/)
  const cleaned_path = reference_path.replace(/^\/+/, "");

  // Check for obvious traversal attempts
  if (
    cleaned_path.includes("..") ||
    cleaned_path.includes("\\") ||
    cleaned_path.startsWith("/")
  ) {
    return { valid: false, error: "Invalid path: traversal patterns detected" };
  }

  // Normalize and resolve the full path
  const public_dir = path.join(process.cwd(), "public");
  const full_path = path.resolve(public_dir, cleaned_path);

  // Ensure the resolved path is still within the public directory
  if (!full_path.startsWith(public_dir + path.sep) && full_path !== public_dir) {
    return { valid: false, error: "Invalid path: outside allowed directory" };
  }

  // Check if the path is within one of the allowed subdirectories
  const relative_to_cwd = path.relative(process.cwd(), full_path);
  const is_allowed = ALLOWED_DIRECTORIES.some((dir) =>
    relative_to_cwd.startsWith(dir + path.sep) || relative_to_cwd.startsWith(dir)
  );

  if (!is_allowed) {
    return {
      valid: false,
      error: `Invalid path: must be within ${ALLOWED_DIRECTORIES.join(" or ")}`,
    };
  }

  // Return the cleaned path relative to public/
  return { valid: true, normalized_path: cleaned_path };
};

/**
 * Validates multiple reference paths.
 *
 * @param paths - Array of paths to validate
 * @returns Array of validation results
 */
export const validate_reference_paths = (
  paths: string[]
): { valid: boolean; results: PathValidationResult[] } => {
  const results = paths.map(validate_reference_path);
  const all_valid = results.every((r) => r.valid);
  return { valid: all_valid, results };
};

/**
 * Checks if a file exists at the given path (after validation).
 *
 * @param reference_path - The validated path relative to public/
 * @returns True if file exists
 */
export const reference_file_exists = (reference_path: string): boolean => {
  const validation = validate_reference_path(reference_path);
  if (!validation.valid) return false;

  const full_path = path.join(process.cwd(), "public", validation.normalized_path!);
  return fs.existsSync(full_path);
};

/**
 * Sanitizes a path for safe logging (removes sensitive info).
 */
export const sanitize_path_for_log = (reference_path: string): string => {
  // Only show the last two path components for privacy
  const parts = reference_path.split("/").filter(Boolean);
  if (parts.length <= 2) return reference_path;
  return ".../" + parts.slice(-2).join("/");
};
