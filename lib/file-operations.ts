import { unlink } from "fs/promises";
import path from "path";

/**
 * Constructs the full filesystem path to a file in the public directory.
 * @param relative_path - Path relative to the public directory (e.g., "images/gen-123.png")
 * @returns Full absolute path to the file
 */
export const get_public_file_path = (relative_path: string): string => {
  return path.join(process.cwd(), "public", relative_path);
};

/**
 * Safely deletes a file from the public directory.
 * @param relative_path - Path relative to the public directory (e.g., "images/gen-123.png")
 * @returns true if file was deleted, false if file was not found
 */
export const safe_delete_public_file = async (
  relative_path: string
): Promise<boolean> => {
  const file_path = get_public_file_path(relative_path);

  try {
    await unlink(file_path);
    return true;
  } catch (error) {
    // File not found or already deleted - this is expected behavior
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return false;
    }
    // Re-throw unexpected errors (permission issues, etc.)
    throw error;
  }
};
