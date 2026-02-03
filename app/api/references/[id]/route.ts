import { with_auth } from "@/lib/api-auth";
import { json_response, not_found, success_response } from "@/lib/api-helpers";
import {
  get_reference,
  delete_reference,
  update_reference,
} from "@/lib/repositories/references";

type Params = {
  params: Promise<{ id: string }>;
};

export const GET = async (_request: Request, { params }: Params) => {
  return with_auth(async () => {
    const { id } = await params;
    const reference = get_reference(id);

    if (!reference) {
      return not_found("Reference", id);
    }

    return json_response(reference);
  });
};

export const DELETE = async (_request: Request, { params }: Params) => {
  return with_auth(async () => {
    const { id } = await params;
    const deleted = await delete_reference(id);

    if (!deleted) {
      return not_found("Reference", id);
    }

    return success_response();
  });
};

export const PATCH = async (request: Request, { params }: Params) => {
  return with_auth(async () => {
    const { id } = await params;
    const body = await request.json();

    const reference = update_reference(id, {
      name: body.name,
    });

    if (!reference) {
      return not_found("Reference", id);
    }

    return json_response(reference);
  });
};
