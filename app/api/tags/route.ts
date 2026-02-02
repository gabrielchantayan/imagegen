import { NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { get_all_tags_with_counts, get_tags_by_category } from "@/lib/repositories/tags";

export const GET = async (request: Request) => {
  return with_auth(async () => {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const tags = category
      ? get_tags_by_category(category)
      : get_all_tags_with_counts();

    return NextResponse.json({ tags });
  });
};
