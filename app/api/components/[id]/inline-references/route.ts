import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { with_auth } from "@/lib/api-auth";
import { get_component, update_component } from "@/lib/repositories/components";
import { generate_id } from "@/lib/db";

const INLINE_REFS_DIR = path.join(process.cwd(), "public", "images", "references", "components");

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

    return NextResponse.json({ inline_references: component.inline_references });
  });
};

export const POST = async (request: Request, { params }: Params) => {
  return with_auth(async () => {
    const { id } = await params;

    const component = get_component(id);
    if (!component) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }

    const form_data = await request.formData();
    const file = form_data.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // Validate file type
    const valid_types = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!valid_types.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Create directory if it doesn't exist
    await mkdir(INLINE_REFS_DIR, { recursive: true });

    // Generate filename: {component_id}-{timestamp}.{ext}
    const ext = file.type.split("/")[1] || "png";
    const filename = `${id}-${Date.now()}.${ext}`;
    const file_path = path.join(INLINE_REFS_DIR, filename);
    const public_path = `/images/references/components/${filename}`;

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(file_path, buffer);

    // Add path to component's inline_references array
    const updated_references = [...component.inline_references, public_path];
    update_component(id, { inline_references: updated_references });

    return NextResponse.json(
      { inline_references: updated_references, added_path: public_path },
      { status: 201 }
    );
  });
};
