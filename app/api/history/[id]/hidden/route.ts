import { with_auth } from "@/lib/api-auth";
import { json_response, not_found } from "@/lib/api-helpers";
import { get_generation, toggle_hidden } from "@/lib/repositories/generations";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const POST = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const generation = get_generation(id);

    if (!generation) {
      return not_found("Generation", id);
    }

    const hidden = toggle_hidden(id);

    return json_response({ hidden });
  });
};
