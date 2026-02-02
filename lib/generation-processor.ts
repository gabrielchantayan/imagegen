import { get_next_in_queue, update_queue_status } from "./queue";
import { update_generation } from "./repositories/generations";
import { generate_image } from "./gemini";
import { save_image } from "./image-storage";

let processing = false;

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
        const result = await generate_image(item.prompt_json);

        if (result.success && result.images && result.images.length > 0) {
          const image_path = await save_image(result.images[0], result.mime_type!);

          if (item.generation_id) {
            update_generation(item.generation_id, {
              status: "completed",
              image_path,
              api_response_text: result.text_response,
              completed_at: true,
            });
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
