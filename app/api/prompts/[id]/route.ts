import { with_auth } from "@/lib/api-auth";
import { json_response, not_found, success_response } from "@/lib/api-helpers";
import {
  get_prompt,
  update_prompt,
  delete_prompt,
} from "@/lib/repositories/prompts";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const GET = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const prompt = get_prompt(id);

    if (!prompt) {
      return not_found("Prompt", id);
    }

    return json_response(prompt);
  });
};

export const PUT = async (request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const body = await request.json();

    const prompt = update_prompt(id, {
      name: body.name,
      description: body.description,
      prompt_json: body.prompt_json,
    });

    if (!prompt) {
      return not_found("Prompt", id);
    }

    return json_response(prompt);
  });
};

export const DELETE = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const deleted = delete_prompt(id);

    if (!deleted) {
      return not_found("Prompt", id);
    }

    return success_response();
  });
};
