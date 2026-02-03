import { with_auth } from "@/lib/api-auth";
import { error_response, server_error_response, success_response } from "@/lib/api-helpers";
import { analyze_image } from "@/lib/analyze";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export const POST = async (request: Request) => {
  return with_auth(async () => {
    const form_data = await request.formData();
    const file = form_data.get("image") as File | null;

    if (!file) {
      return error_response("No image provided");
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return error_response("Invalid file type. Allowed: JPEG, PNG, WebP, GIF, AVIF");
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return error_response("File too large. Maximum size: 10MB");
    }

    // Convert to buffer
    const array_buffer = await file.arrayBuffer();
    const buffer = Buffer.from(array_buffer);

    // Analyze
    const result = await analyze_image(buffer, file.type);

    if (!result.success) {
      return server_error_response(result.error);
    }

    return success_response({ data: result.data });
  });
};
