import { with_auth } from "@/lib/api-auth";
import { json_response } from "@/lib/api-helpers";
import { get_active_queue_items, get_queue_metrics } from "@/lib/repositories/queue";

export const GET = async () => {
  return with_auth(async () => {
    const items = get_active_queue_items();
    const metrics = get_queue_metrics();

    return json_response({
      items,
      metrics,
    });
  });
};
