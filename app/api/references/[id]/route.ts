import { NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import {
  get_reference,
  delete_reference,
  update_reference,
} from "@/lib/repositories/references";

type Params = {
  params: Promise<{ id: string }>;
};

export const GET = async (_request: Request, { params }: Params) => {
  return with_auth(async () => {
    const { id } = await params;
    const reference = get_reference(id);

    if (!reference) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    return NextResponse.json(reference);
  });
};

export const DELETE = async (_request: Request, { params }: Params) => {
  return with_auth(async () => {
    const { id } = await params;
    const deleted = await delete_reference(id);

    if (!deleted) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  });
};

export const PATCH = async (request: Request, { params }: Params) => {
  return with_auth(async () => {
    const { id } = await params;
    const body = await request.json();

    const reference = update_reference(id, {
      name: body.name,
    });

    if (!reference) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    return NextResponse.json(reference);
  });
};
