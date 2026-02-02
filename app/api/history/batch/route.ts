import { NextRequest, NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { toggle_favorite, delete_generation } from "@/lib/repositories/generations";

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
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    if (!action || !["favorite", "unfavorite", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'favorite', 'unfavorite', or 'delete'" },
        { status: 400 }
      );
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const id of ids) {
      try {
        if (action === "delete") {
          const success = await delete_generation(id);
          results.push({ id, success });
        } else {
          // For favorite/unfavorite, toggle_favorite returns the new state
          // We need to check current state and only toggle if needed
          const is_favorited = toggle_favorite(id);

          // If we wanted to favorite but it's now unfavorited, toggle back
          if (action === "favorite" && !is_favorited) {
            toggle_favorite(id);
            results.push({ id, success: true });
          } else if (action === "unfavorite" && is_favorited) {
            toggle_favorite(id);
            results.push({ id, success: true });
          } else {
            results.push({ id, success: true });
          }
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

    return NextResponse.json({
      action,
      total: ids.length,
      success_count,
      failed_count,
      results,
    });
  });
};
