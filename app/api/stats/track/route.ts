import { NextRequest, NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { track_component_usage } from "@/lib/repositories/stats";

export const POST = async (request: NextRequest) => {
  return with_auth(async () => {
    const body = await request.json();
    const { component_id } = body;

    if (!component_id || typeof component_id !== "string") {
      return NextResponse.json({ error: "component_id required" }, { status: 400 });
    }

    track_component_usage(component_id);

    return NextResponse.json({ success: true });
  });
};
