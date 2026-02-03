import { NextRequest } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { error_response, json_response } from "@/lib/api-helpers";
import { get_components_by_ids } from "@/lib/repositories/components";

export const POST = async (request: NextRequest) => {
  return with_auth(async () => {
    const body = await request.json();
    const ids = body.ids;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error_response("ids array required");
    }

    const components = get_components_by_ids(ids);
    
    return json_response({ components });
  });
};
