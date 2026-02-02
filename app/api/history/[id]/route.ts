import { NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import {
  get_generation_with_favorite,
  delete_generation,
} from "@/lib/repositories/generations";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export const GET = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const generation = get_generation_with_favorite(id);

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    return NextResponse.json(generation);
  });
};

export const DELETE = async (_request: Request, { params }: RouteParams) => {
  return with_auth(async () => {
    const { id } = await params;
    const deleted = await delete_generation(id);

    if (!deleted) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  });
};
