import { NextResponse } from "next/server";
import { with_auth } from "@/lib/api-auth";
import { generate_prompt, SUPPORTED_CATEGORIES } from "@/lib/generate-prompt";

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const body = await request.json();
    const { category, description } = body;

    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { success: false, error: "Category is required" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 }
      );
    }

    const trimmed_description = description.trim();
    if (!trimmed_description) {
      return NextResponse.json(
        { success: false, error: "Description cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmed_description.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Description too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    if (!SUPPORTED_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Unsupported category: ${category}` },
        { status: 400 }
      );
    }

    const result = await generate_prompt(category, trimmed_description);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  });
};
