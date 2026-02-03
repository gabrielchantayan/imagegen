import { with_auth } from "@/lib/api-auth";
import { json_response, not_found, success_response } from "@/lib/api-helpers";
import {
  get_generation_with_favorite,
  delete_generation,
} from "@/lib/repositories/generations";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const GET = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const generation = get_generation_with_favorite(id);

    if (!generation) {
      return not_found("Generation", id);
    }

    return json_response(generation);
  });
};

export const DELETE = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const deleted = await delete_generation(id);

    if (!deleted) {
      return not_found("Generation", id);
    }

    return success_response();
  });
};
