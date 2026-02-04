import { readFile } from "fs/promises";
import path from "path";

import { get_next_in_queue, update_queue_status } from "./queue";
import { update_generation, get_generation } from "./repositories/generations";
import { create_tags_for_generation } from "./repositories/tags";
import { get_references_by_ids } from "./repositories/references";
import { generate_image, face_swap_edit, remix_image, type ReferenceImage } from "./gemini";
import { save_image } from "./image-storage";
import {
  acquire_lock,
  release_lock,
  update_heartbeat,
  get_active_lock_count,
  HEARTBEAT_INTERVAL_MS,
} from "./queue-locks";
import { validate_reference_path } from "./utils/path-validator";
import { create_queue_logger, logger } from "./logger";

const MAX_CONCURRENT = 5;

const load_reference_images = async (
  reference_photo_ids: string[],
  log: ReturnType<typeof create_queue_logger>
): Promise<ReferenceImage[]> => {
  const references = get_references_by_ids(reference_photo_ids);
  const images: ReferenceImage[] = [];

  for (const ref of references) {
    try {
      const file_path = path.join(process.cwd(), "public", ref.image_path);
      const data = await readFile(file_path);
      images.push({
        data,
        mime_type: ref.mime_type,
      });
    } catch (err) {
      log.warn(`Failed to load reference image`, { path: ref.image_path }, err instanceof Error ? err : undefined);
    }
  }

  return images;
};

const get_mime_type_from_path = (image_path: string): string => {
  const ext = path.extname(image_path).toLowerCase();
  const mime_map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return mime_map[ext] || 'image/png';
};

const load_inline_references = async (
  inline_reference_paths: string[],
  log: ReturnType<typeof create_queue_logger>
): Promise<ReferenceImage[]> => {
  const images: ReferenceImage[] = [];

  for (const image_path of inline_reference_paths) {
    try {
      // Validate path to prevent path traversal attacks
      const validation = validate_reference_path(image_path);
      if (!validation.valid) {
        log.warn(`Invalid inline reference path rejected`, { path: image_path, error: validation.error });
        continue;
      }

      const file_path = path.join(process.cwd(), "public", validation.normalized_path!);
      const data = await readFile(file_path);
      images.push({
        data,
        mime_type: get_mime_type_from_path(validation.normalized_path!),
      });
    } catch (err) {
      log.warn(`Failed to load inline reference image`, { path: image_path }, err instanceof Error ? err : undefined);
    }
  }

  return images;
};

/**
 * Processes a single queue item with proper locking and heartbeat.
 * Returns true if processing succeeded, false otherwise.
 */
const process_single_item = async (item: ReturnType<typeof get_next_in_queue>): Promise<boolean> => {
  if (!item) return false;

  const log = create_queue_logger(item.id, item.generation_id ?? undefined);

  // Try to acquire a lock on this item
  const lock = acquire_lock(item.id);
  if (!lock) {
    log.debug("Could not acquire lock, item already being processed");
    return false;
  }

  log.info("Processing started", { has_references: (item.reference_photo_ids?.length ?? 0) > 0 });

  // Set up heartbeat interval to keep the lock alive
  const heartbeat_timer = setInterval(() => {
    update_heartbeat(lock.id);
  }, HEARTBEAT_INTERVAL_MS);

  try {
    update_queue_status(item.id, "processing", { started_at: true });

    if (item.generation_id) {
      update_generation(item.generation_id, { status: "generating" });
    }

    // Load reference images if any (face references)
    let reference_images: ReferenceImage[] = [];
    if (item.reference_photo_ids && item.reference_photo_ids.length > 0) {
      reference_images = await load_reference_images(item.reference_photo_ids, log);
    }

    // Load inline reference images from components
    if (item.inline_reference_paths && item.inline_reference_paths.length > 0) {
      const inline_refs = await load_inline_references(item.inline_reference_paths, log);
      reference_images = [...reference_images, ...inline_refs];
    }

    // Handle remix: if this is a remix, process it differently
    if (item.remix_source_id && item.edit_instructions) {
      log.info("Processing as remix", { source_id: item.remix_source_id });

      const source_gen = get_generation(item.remix_source_id);
      if (!source_gen || !source_gen.image_path) {
        throw new Error("Remix source generation not found or has no image");
      }

      const source_image_path = path.join(process.cwd(), "public", source_gen.image_path);
      const source_image = await readFile(source_image_path);
      const source_mime_type = get_mime_type_from_path(source_gen.image_path);

      // Try remix with one retry on failure
      let remix_result = await remix_image(
        source_image,
        source_mime_type,
        item.edit_instructions,
        { safety_override: item.safety_override }
      );

      // Retry once if first attempt failed
      if (!remix_result.success) {
        log.info("Remix failed, retrying once", { error: remix_result.error });
        remix_result = await remix_image(
          source_image,
          source_mime_type,
          item.edit_instructions,
          { safety_override: item.safety_override }
        );
      }

      if (remix_result.success && remix_result.image) {
        const image_path = await save_image(remix_result.image, remix_result.mime_type!);

        if (item.generation_id) {
          log.info("Remix completed", { image_path });

          update_generation(item.generation_id, {
            status: "completed",
            image_path,
            api_response_text: undefined,
            completed_at: true,
          });
        }

        update_queue_status(item.id, "completed", { completed_at: true });
        return true;
      } else {
        log.error("Remix failed after retry", { error: remix_result.error });

        if (item.generation_id) {
          update_generation(item.generation_id, {
            status: "failed",
            error_message: remix_result.error,
            completed_at: true,
          });
        }

        update_queue_status(item.id, "failed", { completed_at: true });
        return false;
      }
    }

    log.debug("Calling Gemini API", { reference_count: reference_images.length });

    let result = await generate_image(item.prompt_json, {
      aspect_ratio: "3:4",
      image_size: "4K",
      reference_images: reference_images.length > 0 ? reference_images : undefined,
      use_google_search: item.google_search,
      safety_override: item.safety_override,
    });

    let used_fallback = false;
    let pre_swap_image_path: string | undefined;
    let face_swap_failed = false;

    // Fallback: if generation with references failed, try without and then face-swap
    if (!result.success && reference_images.length > 0) {
      log.info("Generation with reference failed, attempting fallback", { error: result.error });

      // Mark fallback immediately so polling UI can show status
      if (item.generation_id) {
        update_generation(item.generation_id, { used_fallback: true });
      }
      used_fallback = true;

      // Try generation without references
      const base_result = await generate_image(item.prompt_json, {
        aspect_ratio: "3:4",
        image_size: "4K",
        use_google_search: item.google_search,
        safety_override: item.safety_override,
      });

      if (base_result.success && base_result.images && base_result.images.length > 0) {
        log.debug("Base generation succeeded, attempting face swap");

        // Attempt face swap with first reference
        const swap_result = await face_swap_edit(
          base_result.images[0],
          base_result.mime_type!,
          reference_images[0].data,
          reference_images[0].mime_type,
          { aspect_ratio: "3:4", image_size: "4K" }
        );

        if (swap_result.success && swap_result.image) {
          // Save the pre-swap image before using the swapped one
          pre_swap_image_path = await save_image(base_result.images[0], base_result.mime_type!);
          log.info("Face swap succeeded", {
            pre_swap_image_path,
            base_size: base_result.images[0].length,
            swapped_size: swap_result.image.length,
          });

          result = {
            success: true,
            images: [swap_result.image],
            mime_type: swap_result.mime_type,
            text_response: base_result.text_response,
          };
        } else {
          // Face swap failed, use base image anyway
          log.warn("Face swap failed, using base image", { error: swap_result.error });
          result = base_result;
          face_swap_failed = true;
        }
      }
    }

    if (result.success && result.images && result.images.length > 0) {
      const image_path = await save_image(result.images[0], result.mime_type!);

      if (item.generation_id) {
        log.info("Generation completed", {
          image_path,
          used_fallback,
          face_swap_failed,
          pre_swap_image_path: pre_swap_image_path || null,
        });

        update_generation(item.generation_id, {
          status: "completed",
          image_path,
          pre_swap_image_path,
          api_response_text: result.text_response,
          completed_at: true,
          used_fallback,
          face_swap_failed,
        });

        // Extract and store tags for the generation
        try {
          const generation = get_generation(item.generation_id);
          create_tags_for_generation(
            item.generation_id,
            item.prompt_json,
            generation?.components_used
          );
        } catch {
          // Tag creation is non-critical, continue on error
        }
      }

      update_queue_status(item.id, "completed", { completed_at: true });
      return true;
    } else {
      log.error("Generation failed", { error: result.error });

      if (item.generation_id) {
        update_generation(item.generation_id, {
          status: "failed",
          error_message: result.error,
          api_response_text: result.text_response,
          completed_at: true,
        });
      }

      update_queue_status(item.id, "failed", { completed_at: true });
      return false;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error("Processing error", {}, err);

    if (item.generation_id) {
      update_generation(item.generation_id, {
        status: "failed",
        error_message: err.message,
        completed_at: true,
      });
    }

    update_queue_status(item.id, "failed", { completed_at: true });
    return false;
  } finally {
    // Clean up: stop heartbeat and release lock
    clearInterval(heartbeat_timer);
    release_lock(lock.id);
  }
};

/**
 * Processes the queue, handling multiple items concurrently up to MAX_CONCURRENT.
 * Uses database-based locking for crash safety.
 */
export const process_queue = async (): Promise<void> => {
  // Check how many items we're currently processing
  const current_count = get_active_lock_count();
  const available_slots = MAX_CONCURRENT - current_count;

  if (available_slots <= 0) {
    return;
  }

  // Collect items to process (up to available slots)
  const items_to_process: ReturnType<typeof get_next_in_queue>[] = [];
  for (let i = 0; i < available_slots; i++) {
    const item = get_next_in_queue();
    if (!item) break;

    // Double-check it's not already being processed
    const lock = acquire_lock(item.id);
    if (lock) {
      release_lock(lock.id); // Release immediately, we'll re-acquire in process_single_item
      items_to_process.push(item);
    }
  }

  if (items_to_process.length === 0) {
    return;
  }

  logger.debug(`Processing ${items_to_process.length} queue item(s)`, { count: items_to_process.length });

  // Process all items concurrently
  await Promise.all(items_to_process.map(process_single_item));
};
