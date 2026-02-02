import { NextResponse } from "next/server";
import { with_auth } from "@/lib/api-auth";
import { get_generation } from "@/lib/repositories/generations";

export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  return with_auth(async () => {
    const { id } = await params;
    const generation = get_generation(id);

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    const response: Record<string, unknown> = {
      status: generation.status,
    };

    if (generation.status === "completed" && generation.image_path) {
      response.image_path = generation.image_path;
    }

    if (generation.status === "failed" && generation.error_message) {
      response.error = generation.error_message;
    }

    return NextResponse.json(response);
  });
};
