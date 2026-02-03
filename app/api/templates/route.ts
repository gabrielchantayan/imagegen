import { NextResponse } from "next/server";
import {
  get_templates,
  create_template,
  import_template,
} from "@/lib/repositories/templates";

export const dynamic = "force-dynamic";

/**
 * GET /api/templates
 * List all templates
 */
export const GET = async () => {
  try {
    const templates = get_templates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
};

/**
 * POST /api/templates
 * Create a new template
 */
export const POST = async (request: Request) => {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.component_ids)) {
      return NextResponse.json(
        { error: "component_ids must be an array" },
        { status: 400 }
      );
    }

    // Check if this is an import (has exported_at field)
    const is_import = body.exported_at !== undefined;

    const template = is_import
      ? import_template({
          name: body.name,
          description: body.description,
          component_ids: body.component_ids,
          shared_component_ids: body.shared_component_ids ?? [],
        })
      : create_template({
          name: body.name,
          description: body.description,
          component_ids: body.component_ids,
          shared_component_ids: body.shared_component_ids ?? [],
          thumbnail_generation_id: body.thumbnail_generation_id,
        });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Failed to create template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
};
