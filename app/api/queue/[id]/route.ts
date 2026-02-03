import { with_auth } from "@/lib/api-auth";
import { json_response, error_response } from "@/lib/api-helpers";
import { delete_queue_item } from "@/lib/queue";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const DELETE = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const result = delete_queue_item(id);

    if (!result.success) {
      return error_response(result.error ?? "Failed to delete queue item", 400);
    }

    return json_response({ success: true });
  });
};
