import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

import { with_auth } from "@/lib/api-auth";
import { generate_id } from "@/lib/db";
import {
  list_references,
  create_reference,
  get_all_component_reference_defaults,
} from "@/lib/repositories/references";

const REFERENCES_DIR = path.join(process.cwd(), "public", "images", "references");

export const GET = async () => {
  return with_auth(async () => {
    const references = list_references();
    const component_defaults = get_all_component_reference_defaults();

    // Convert Map to object for JSON serialization
    const defaults_object: Record<string, string[]> = {};
    for (const [component_id, ref_ids] of component_defaults) {
      defaults_object[component_id] = ref_ids;
    }

    return NextResponse.json({
      references,
      component_defaults: defaults_object,
    });
  });
};

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const form_data = await request.formData();
    const file = form_data.get("file") as File | null;
    const name = form_data.get("name") as string | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Validate file type
    const valid_types = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!valid_types.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Create references directory if it doesn't exist
    await mkdir(REFERENCES_DIR, { recursive: true });

    // Generate filename and save file
    const ext = file.type.split("/")[1] || "png";
    const filename = `${generate_id()}.${ext}`;
    const file_path = path.join(REFERENCES_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(file_path, buffer);

    // Create database record
    const reference = create_reference({
      name: name.trim(),
      image_path: `/images/references/${filename}`,
      original_filename: file.name,
      mime_type: file.type,
    });

    return NextResponse.json(reference, { status: 201 });
  });
};
