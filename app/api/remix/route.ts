import { with_auth } from "@/lib/api-auth";
import { json_response, error_response, not_found } from "@/lib/api-helpers";
import { transaction } from "@/lib/db";
import { enqueue, get_queue_status } from "@/lib/queue";
import { create_generation, get_generation, update_generation_image } from "@/lib/repositories/generations";
import { process_queue } from "@/lib/generation-processor";

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const body = await request.json();

    const source_id = body.source_id as string | undefined;
    const edit_instructions = body.edit_instructions as string | undefined;
    const mode = body.mode as "fork" | "replace" | undefined;
    const safety_override = body.safety_override as boolean | undefined;

    if (!source_id) {
      return error_response("source_id is required");
    }

    if (!edit_instructions || edit_instructions.trim() === "") {
      return error_response("edit_instructions is required");
    }

    if (mode && mode !== "fork" && mode !== "replace") {
      return error_response("mode must be 'fork' or 'replace'");
    }

    const source_gen = get_generation(source_id);
    if (!source_gen) {
      return not_found("Generation", source_id);
    }

    if (!source_gen.image_path) {
      return error_response("Source generation has no image");
    }

    const effective_mode = mode || "fork";

    if (effective_mode === "fork") {
      // Create new generation with parent_id set
      const result = transaction(() => {
        const generation = create_generation(
          source_gen.prompt_json,
          source_gen.reference_photo_ids || undefined,
          source_gen.components_used || undefined,
          source_gen.inline_reference_paths || undefined,
          {
            parent_id: source_id,
            edit_instructions: edit_instructions.trim(),
          }
        );

        const queue_item = enqueue(source_gen.prompt_json, generation.id, {
          remix_source_id: source_id,
          edit_instructions: edit_instructions.trim(),
          safety_override,
        });

        return { generation, queue_item };
      });

      // Trigger processing
      process_queue().catch(console.error);

      const { position } = get_queue_status(result.queue_item.id);

      return json_response(
        {
          queue_id: result.queue_item.id,
          generation_id: result.generation.id,
          position: position || 1,
          status: result.queue_item.status,
          mode: "fork",
        },
        202
      );
    } else {
      // Replace mode: enqueue with remix info, but no new generation yet
      // The processor will update the existing generation
      const result = transaction(() => {
        // Create a temporary generation record that will be merged into the original
        const generation = create_generation(
          source_gen.prompt_json,
          source_gen.reference_photo_ids || undefined,
          source_gen.components_used || undefined,
          source_gen.inline_reference_paths || undefined,
          {
            parent_id: undefined, // No parent for replace mode
            edit_instructions: edit_instructions.trim(),
          }
        );

        const queue_item = enqueue(source_gen.prompt_json, generation.id, {
          remix_source_id: source_id,
          edit_instructions: edit_instructions.trim(),
          safety_override,
        });

        return { generation, queue_item };
      });

      // Trigger processing
      process_queue().catch(console.error);

      const { position } = get_queue_status(result.queue_item.id);

      return json_response(
        {
          queue_id: result.queue_item.id,
          generation_id: result.generation.id,
          original_id: source_id,
          position: position || 1,
          status: result.queue_item.status,
          mode: "replace",
        },
        202
      );
    }
  });
};
