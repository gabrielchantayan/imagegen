import { NextResponse } from "next/server";
import {
  get_template_by_id,
  update_template,
  delete_template,
  export_template,
} from "@/lib/repositories/templates";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/templates/[id]
 * Get a single template (with optional export format)
 */
export const GET = async (request: Request, { params }: Params) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const is_export = searchParams.get("export") === "true";

    if (is_export) {
      const exported = export_template(id);
      if (!exported) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(exported);
    }

    const template = get_template_by_id(id);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
};

/**
 * PATCH /api/templates/[id]
 * Update a template
 */
export const PATCH = async (request: Request, { params }: Params) => {
  try {
    const { id } = await params;
    const body = await request.json();

    const template = update_template(id, {
      name: body.name,
      description: body.description,
      component_ids: body.component_ids,
      shared_component_ids: body.shared_component_ids,
      thumbnail_generation_id: body.thumbnail_generation_id,
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Failed to update template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/templates/[id]
 * Delete a template
 */
export const DELETE = async (_request: Request, { params }: Params) => {
  try {
    const { id } = await params;

    const deleted = delete_template(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
};
