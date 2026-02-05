import { with_auth } from "@/lib/api-auth";
import { error_response, success_response } from "@/lib/api-helpers";
import { get_db } from "@/lib/db";

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  return with_auth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { tag, category } = body;

    if (!tag || typeof tag !== "string") {
      return error_response("Tag is required");
    }

    const db = get_db();

    // Check if exists to avoid duplicates
    const existing = db.prepare(
      "SELECT 1 FROM generation_tags WHERE generation_id = ? AND tag = ?"
    ).get(id, tag);

    if (existing) {
       return success_response({ message: "Tag already exists" });
    }

    const tag_category = (category && typeof category === "string") ? category : "user";

    const result = db.prepare(
      "INSERT INTO generation_tags (generation_id, tag, category) VALUES (?, ?, ?)"
    ).run(id, tag, tag_category);

    return success_response({
      tag: {
        id: Number(result.lastInsertRowid),
        generation_id: id,
        tag,
        category: tag_category
      }
    });
  });
};

export const DELETE = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  return with_auth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { tag } = body;

    if (!tag || typeof tag !== "string") {
      return error_response("Tag is required");
    }

    const db = get_db();
    db.prepare(
      "DELETE FROM generation_tags WHERE generation_id = ? AND tag = ?"
    ).run(id, tag);

    return success_response();
  });
};
