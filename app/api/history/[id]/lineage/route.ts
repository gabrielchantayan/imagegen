import { with_auth } from "@/lib/api-auth";
import { json_response, not_found } from "@/lib/api-helpers";
import { get_generation_lineage } from "@/lib/repositories/generations";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const GET = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const lineage = get_generation_lineage(id);

    if (!lineage) {
      return not_found("Generation", id);
    }

    return json_response(lineage);
  });
};
