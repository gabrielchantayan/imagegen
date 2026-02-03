import { NextRequest } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { error_response, json_response } from "@/lib/api-helpers";
import { set_favorite, delete_generation } from "@/lib/repositories/generations";

type BatchAction = "favorite" | "unfavorite" | "delete";

type BatchRequest = {
  ids: string[];
  action: BatchAction;
};

export const POST = async (request: NextRequest) => {
  return with_auth(async () => {
    const body = (await request.json()) as BatchRequest;
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return error_response("ids array required");
    }

    if (!action || !["favorite", "unfavorite", "delete"].includes(action)) {
      return error_response("action must be 'favorite', 'unfavorite', or 'delete'");
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const id of ids) {
      try {
        if (action === "delete") {
          const success = await delete_generation(id);
          results.push({ id, success });
        } else {
          // Set favorite state directly based on the action
          set_favorite(id, action === "favorite");
          results.push({ id, success: true });
        }
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const success_count = results.filter((r) => r.success).length;
    const failed_count = results.filter((r) => !r.success).length;

    return json_response({
      action,
      total: ids.length,
      success_count,
      failed_count,
      results,
    });
  });
};
