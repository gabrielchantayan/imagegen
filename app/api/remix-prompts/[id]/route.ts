import { with_auth } from "@/lib/api-auth";
import { json_response, not_found, success_response } from "@/lib/api-helpers";
import {
  get_remix_prompt,
  update_remix_prompt,
  delete_remix_prompt,
} from "@/lib/repositories/remix-prompts";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const GET = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const prompt = get_remix_prompt(id);

    if (!prompt) {
      return not_found("Remix prompt", id);
    }

    return json_response(prompt);
  });
};

export const PUT = async (request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const body = await request.json();

    const prompt = update_remix_prompt(id, {
      name: body.name,
      instructions: body.instructions,
    });

    if (!prompt) {
      return not_found("Remix prompt", id);
    }

    return json_response(prompt);
  });
};

export const DELETE = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const deleted = delete_remix_prompt(id);

    if (!deleted) {
      return not_found("Remix prompt", id);
    }

    return success_response();
  });
};
