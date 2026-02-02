import { NextResponse } from "next/server";
import { with_auth } from "@/lib/api-auth";
import { enqueue, get_queue_status } from "@/lib/queue";
import { create_generation } from "@/lib/repositories/generations";
import { process_queue } from "@/lib/generation-processor";

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const body = await request.json();

    if (!body.prompt_json || typeof body.prompt_json !== "object") {
      return NextResponse.json({ error: "prompt_json is required" }, { status: 400 });
    }

    const count = Math.min(Math.max(1, Number(body.options?.count || 1)), 4);
    const results = [];

    // Enqueue multiple generations
    for (let i = 0; i < count; i++) {
      const generation = create_generation(body.prompt_json);
      const queue_item = enqueue(body.prompt_json, generation.id);
      results.push({
        queue_id: queue_item.id,
        generation_id: generation.id,
        status: queue_item.status,
      });
    }

    // Trigger processing
    process_queue().catch(console.error);
    
    // Return the first item's details for immediate feedback, but include all IDs
    const first = results[0];
    const { position } = get_queue_status(first.queue_id);

    return NextResponse.json(
      {
        queue_id: first.queue_id,
        generation_id: first.generation_id,
        position: position || 1,
        status: first.status,
        batch: results, // Return all items for client handling
      },
      { status: 202 }
    );
  });
};

export const GET = async () => {
  return with_auth(async () => {
    const status = get_queue_status();
    return NextResponse.json(status);
  });
};
