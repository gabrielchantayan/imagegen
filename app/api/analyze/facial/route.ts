import { NextResponse } from "next/server";
import { with_auth } from "@/lib/api-auth";
import { analyze_facial } from "@/lib/analyze-facial";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const form_data = await request.formData();
    const file = form_data.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, AVIF",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      );
    }

    // Convert to buffer
    const array_buffer = await file.arrayBuffer();
    const buffer = Buffer.from(array_buffer);

    // Analyze
    const result = await analyze_facial(buffer, file.type);

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
