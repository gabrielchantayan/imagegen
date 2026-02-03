import { unlink } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { get_component, update_component } from "@/lib/repositories/components";

type Params = {
  params: Promise<{ id: string; path: string[] }>;
};

export const DELETE = async (_request: Request, { params }: Params) => {
  return with_auth(async () => {
    const { id, path: path_segments } = await params;

    const component = get_component(id);
    if (!component) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }

    // Reconstruct the public path from segments
    const image_path = "/" + path_segments.join("/");

    // Check if this path is in the component's inline_references
    if (!component.inline_references.includes(image_path)) {
      return NextResponse.json(
        { error: "Image not found in component's inline references" },
        { status: 404 }
      );
    }

    // Remove from disk
    const file_path = path.join(process.cwd(), "public", image_path);
    try {
      await unlink(file_path);
    } catch {
      // File may not exist, continue
    }

    // Remove from component's inline_references array
    const updated_references = component.inline_references.filter((p) => p !== image_path);
    update_component(id, { inline_references: updated_references });

    return NextResponse.json({ inline_references: updated_references });
  });
};
