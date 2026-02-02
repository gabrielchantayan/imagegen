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

    const generation = create_generation(body.prompt_json);

    const queue_item = enqueue(body.prompt_json, generation.id);

    const { position } = get_queue_status(queue_item.id);

    process_queue().catch(console.error);

    return NextResponse.json(
      {
        queue_id: queue_item.id,
        generation_id: generation.id,
        position: position || 1,
        status: queue_item.status,
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
