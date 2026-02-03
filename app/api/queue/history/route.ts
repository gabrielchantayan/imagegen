import { with_auth } from "@/lib/api-auth";
import { json_response } from "@/lib/api-helpers";
import { get_queue_history } from "@/lib/repositories/queue";

export const GET = async (request: Request) => {
  return with_auth(async () => {
    const { searchParams } = new URL(request.url);

    const status_param = searchParams.get("status");
    const status_filter = status_param === "completed" || status_param === "failed"
      ? status_param
      : "all";

    const result = get_queue_history({
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      status_filter,
    });

    return json_response(result);
  });
};
