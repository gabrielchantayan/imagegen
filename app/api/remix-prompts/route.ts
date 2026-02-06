import { with_auth } from "@/lib/api-auth";
import { json_response, error_response } from "@/lib/api-helpers";
import { list_remix_prompts, create_remix_prompt } from "@/lib/repositories/remix-prompts";

export const GET = async () => {
  return with_auth(async () => {
    const prompts = list_remix_prompts();
    return json_response({ prompts });
  });
};

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const body = await request.json();

    if (!body.name || !body.instructions) {
      return error_response("name and instructions are required");
    }

    const prompt = create_remix_prompt({
      name: body.name,
      instructions: body.instructions,
    });

    return json_response(prompt, 201);
  });
};
