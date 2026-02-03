import { readFile } from "fs/promises";
import path from "path";

import { get_next_in_queue, update_queue_status } from "./queue";
import { update_generation, get_generation } from "./repositories/generations";
import { create_tags_for_generation } from "./repositories/tags";
import { get_references_by_ids } from "./repositories/references";
import { generate_image, face_swap_edit, type ReferenceImage } from "./gemini";
import { save_image } from "./image-storage";

let processing = false;

const load_reference_images = async (reference_photo_ids: string[]): Promise<ReferenceImage[]> => {
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
    } catch {
      console.error(`Failed to load reference image: ${ref.image_path}`);
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

const load_inline_references = async (inline_reference_paths: string[]): Promise<ReferenceImage[]> => {
  const images: ReferenceImage[] = [];

  for (const image_path of inline_reference_paths) {
    try {
      const file_path = path.join(process.cwd(), "public", image_path);
      const data = await readFile(file_path);
      images.push({
        data,
        mime_type: get_mime_type_from_path(image_path),
      });
    } catch {
      console.error(`Failed to load inline reference image: ${image_path}`);
    }
  }

  return images;
};

export const process_queue = async (): Promise<void> => {
  if (processing) return;
  processing = true;

  try {
    while (true) {
      const item = get_next_in_queue();
      if (!item) break;

      update_queue_status(item.id, "processing", { started_at: true });

      if (item.generation_id) {
        update_generation(item.generation_id, { status: "generating" });
      }

      try {
        // Load reference images if any (face references)
        let reference_images: ReferenceImage[] = [];
        if (item.reference_photo_ids && item.reference_photo_ids.length > 0) {
          reference_images = await load_reference_images(item.reference_photo_ids);
        }

        // Load inline reference images from components
        if (item.inline_reference_paths && item.inline_reference_paths.length > 0) {
          const inline_refs = await load_inline_references(item.inline_reference_paths);
          reference_images = [...reference_images, ...inline_refs];
        }

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
          console.log("Generation with reference failed, attempting fallback...");

          // Try generation without references
          const base_result = await generate_image(item.prompt_json, {
            aspect_ratio: "3:4",
            image_size: "4K",
            use_google_search: item.google_search,
            safety_override: item.safety_override,
          });

          if (base_result.success && base_result.images && base_result.images.length > 0) {
            // Attempt face swap with first reference
            const swap_result = await face_swap_edit(
              base_result.images[0],
              base_result.mime_type!,
              reference_images[0].data,
              reference_images[0].mime_type
            );

            if (swap_result.success && swap_result.image) {
              // Save the pre-swap image before using the swapped one
              pre_swap_image_path = await save_image(base_result.images[0], base_result.mime_type!);
              console.log("[generation-processor] Face swap succeeded, saved pre-swap image:", pre_swap_image_path);
              console.log(`[generation-processor] Base image size: ${base_result.images[0].length}, Swapped image size: ${swap_result.image.length}`);

              result = {
                success: true,
                images: [swap_result.image],
                mime_type: swap_result.mime_type,
                text_response: base_result.text_response,
              };
              used_fallback = true;
            } else {
              // Face swap failed, use base image anyway
              console.log("[generation-processor] Face swap failed, using base image");
              result = base_result;
              used_fallback = true;
              face_swap_failed = true;
            }
          }
        }

        if (result.success && result.images && result.images.length > 0) {
          const image_path = await save_image(result.images[0], result.mime_type!);

          if (item.generation_id) {
            console.log("[generation-processor] Saving generation:", {
              id: item.generation_id,
              used_fallback,
              face_swap_failed,
              pre_swap_image_path: pre_swap_image_path || "none",
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
        } else {
          if (item.generation_id) {
            update_generation(item.generation_id, {
              status: "failed",
              error_message: result.error,
              api_response_text: result.text_response,
              completed_at: true,
            });
          }

          update_queue_status(item.id, "failed", { completed_at: true });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        if (item.generation_id) {
          update_generation(item.generation_id, {
            status: "failed",
            error_message: message,
            completed_at: true,
          });
        }

        update_queue_status(item.id, "failed", { completed_at: true });
      }
    }
  } finally {
    processing = false;
  }
};
