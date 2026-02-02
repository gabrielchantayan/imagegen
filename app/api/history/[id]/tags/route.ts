
import { NextResponse } from "next/server";
import { with_auth } from "@/lib/api-auth";
import { get_db } from "@/lib/db";

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  return with_auth(async () => {
    const { id } = await params;
    const body = await request.json();
    const { tag } = body;

    if (!tag || typeof tag !== "string") {
      return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    const db = get_db();
    
    // Check if exists to avoid duplicates
    const existing = db.prepare(
      "SELECT 1 FROM generation_tags WHERE generation_id = ? AND tag = ?"
    ).get(id, tag);

    if (existing) {
       return NextResponse.json({ success: true, message: "Tag already exists" });
    }

    const result = db.prepare(
      "INSERT INTO generation_tags (generation_id, tag, category) VALUES (?, ?, 'user')"
    ).run(id, tag);

    return NextResponse.json({ 
      success: true, 
      tag: { 
        id: Number(result.lastInsertRowid), 
        generation_id: id, 
        tag, 
        category: 'user' 
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
      return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    const db = get_db();
    db.prepare(
      "DELETE FROM generation_tags WHERE generation_id = ? AND tag = ?"
    ).run(id, tag);

    return NextResponse.json({ success: true });
  });
};
