import { NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { get_component } from "@/lib/repositories/components";
import {
  detach_reference_from_component,
  get_component_default_references,
} from "@/lib/repositories/references";

type Params = {
  params: Promise<{ id: string; refId: string }>;
};

export const DELETE = async (_request: Request, { params }: Params) => {
  return with_auth(async () => {
    const { id, refId } = await params;

    const component = get_component(id);
    if (!component) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }

    const detached = detach_reference_from_component(id, refId);

    if (!detached) {
      return NextResponse.json(
        { error: "Reference not attached to component" },
        { status: 404 }
      );
    }

    const references = get_component_default_references(id);

    return NextResponse.json({ references });
  });
};
