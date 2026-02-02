import { NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { get_generation, toggle_favorite } from "@/lib/repositories/generations";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const POST = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const generation = get_generation(id);

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    const favorited = toggle_favorite(id);

    return NextResponse.json({ favorited });
  });
};
