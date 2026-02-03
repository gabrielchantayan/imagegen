import { with_auth } from "@/lib/api-auth";
import { json_response, error_response } from "@/lib/api-helpers";
import { list_prompts, create_prompt } from "@/lib/repositories/prompts";

export const GET = async (request: Request) => {
  return with_auth(async () => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const prompts = list_prompts({ search });

    return json_response({ prompts });
  });
};

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const body = await request.json();

    if (!body.name || !body.prompt_json) {
      return error_response("name and prompt_json are required");
    }

    if (typeof body.prompt_json !== "object") {
      return error_response("prompt_json must be an object");
    }

    const prompt = create_prompt({
      name: body.name,
      description: body.description,
      prompt_json: body.prompt_json,
    });

    return json_response(prompt, 201);
  });
};
