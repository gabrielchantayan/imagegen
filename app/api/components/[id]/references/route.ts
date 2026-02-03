import { NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { get_component } from "@/lib/repositories/components";
import {
  get_component_default_references,
  attach_reference_to_component,
  get_reference,
} from "@/lib/repositories/references";

type Params = {
  params: Promise<{ id: string }>;
};

export const GET = async (_request: Request, { params }: Params) => {
  return with_auth(async () => {
    const { id } = await params;
    const component = get_component(id);

    if (!component) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }

    const references = get_component_default_references(id);

    return NextResponse.json({ references });
  });
};

export const POST = async (request: Request, { params }: Params) => {
  return with_auth(async () => {
    const { id } = await params;
    const body = await request.json();

    if (!body.reference_photo_id) {
      return NextResponse.json(
        { error: "reference_photo_id is required" },
        { status: 400 }
      );
    }

    const component = get_component(id);
    if (!component) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }

    const reference = get_reference(body.reference_photo_id);
    if (!reference) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 });
    }

    const attached = attach_reference_to_component(id, body.reference_photo_id);

    if (!attached) {
      return NextResponse.json(
        { error: "Reference already attached to component" },
        { status: 409 }
      );
    }

    const references = get_component_default_references(id);

    return NextResponse.json({ references }, { status: 201 });
  });
};
