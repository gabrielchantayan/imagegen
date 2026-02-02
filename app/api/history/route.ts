import { NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { list_generations_with_favorites } from "@/lib/repositories/generations";

export const GET = async (request: Request) => {
  return with_auth(async () => {
    const { searchParams } = new URL(request.url);

    const result = list_generations_with_favorites({
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "24"),
      favorites_only: searchParams.get("favorites") === "true",
      search: searchParams.get("search") || undefined,
    });

    return NextResponse.json(result);
  });
};
