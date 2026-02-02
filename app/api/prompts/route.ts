import { NextResponse } from "next/server";
import { with_auth } from "@/lib/api-auth";
import { list_prompts, create_prompt } from "@/lib/repositories/prompts";

export const GET = async (request: Request) => {
  return with_auth(async () => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const prompts = list_prompts({ search });

    return NextResponse.json({ prompts });
  });
};

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const body = await request.json();

    if (!body.name || !body.prompt_json) {
      return NextResponse.json(
        { error: "name and prompt_json are required" },
        { status: 400 }
      );
    }

    if (typeof body.prompt_json !== "object") {
      return NextResponse.json(
        { error: "prompt_json must be an object" },
        { status: 400 }
      );
    }

    const prompt = create_prompt({
      name: body.name,
      description: body.description,
      prompt_json: body.prompt_json,
    });

    return NextResponse.json(prompt, { status: 201 });
  });
};
