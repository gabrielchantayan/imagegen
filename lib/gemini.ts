import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ImageSize = "1K" | "2K" | "4K";

export type ReferenceImage = {
  data: Buffer;
  mime_type: string;
};

export type GenerationOptions = {
  aspect_ratio?: AspectRatio;
  image_size?: ImageSize;
  number_of_images?: number;
  safety_override?: boolean;
  use_google_search?: boolean;
  reference_images?: ReferenceImage[];
};

export type GenerationResult = {
  success: boolean;
  images?: Buffer[];
  mime_type?: string;
  text_response?: string;
  error?: string;
};

export const generate_image = async (
  prompt: Record<string, unknown>,
  options: GenerationOptions = {}
): Promise<GenerationResult> => {
  try {
    const model_name = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp-image-generation";

    const image_config: Record<string, unknown> = {};

    if (options.aspect_ratio) {
      image_config.aspectRatio = options.aspect_ratio;
    }

    if (options.image_size) {
      image_config.imageSize = options.image_size;
    }

    if (options.number_of_images) {
      image_config.numberOfImages = options.number_of_images;
    }

    const generation_config: Record<string, unknown> = {
      responseModalities: ["IMAGE", "TEXT"],
    };

    if (Object.keys(image_config).length > 0) {
      generation_config.imageConfig = image_config;
    }

    const prompt_text = format_prompt_for_gemini(prompt);

    // Build content parts: reference images first, then text prompt
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

    // Add reference images if provided
    if (options.reference_images && options.reference_images.length > 0) {
      for (const ref_image of options.reference_images) {
        parts.push({
          inlineData: {
            data: ref_image.data.toString("base64"),
            mimeType: ref_image.mime_type,
          },
        });
      }
    }

    // Add text prompt
    parts.push({ text: prompt_text });

    const result = await genAI.models.generateContent({
      model: model_name,
      contents: [{ role: "user", parts }],
      config: generation_config,
    });

    const images: Buffer[] = [];
    let mime_type = "image/png";
    let text_response = "";

    for (const candidate of result.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        // Log thinking chain for debugging
        if (part.thought && part.text) {
          console.log("[Gemini Thinking]", part.text);
        }

        if (part.inlineData) {
          images.push(Buffer.from(part.inlineData.data!, "base64"));
          mime_type = part.inlineData.mimeType || mime_type;
        }
        if (part.text) {
          text_response += part.text;
        }
      }
    }

    if (images.length === 0) {
      return {
        success: false,
        text_response,
        error: "No images generated. API response: " + text_response,
      };
    }

    return {
      success: true,
      images,
      mime_type,
      text_response,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
};

const format_prompt_for_gemini = (prompt: Record<string, unknown>): string => {
  return JSON.stringify(prompt, null, 2);
};

export type FaceSwapResult = {
  success: boolean;
  image?: Buffer;
  mime_type?: string;
  error?: string;
};

export const face_swap_edit = async (
  base_image: Buffer,
  base_mime_type: string,
  reference_image: Buffer,
  reference_mime_type: string
): Promise<FaceSwapResult> => {
  try {
    const model_name = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp-image-generation";

    const parts = [
      {
        inlineData: {
          data: reference_image.toString("base64"),
          mimeType: reference_mime_type,
        },
      },
      {
        inlineData: {
          data: base_image.toString("base64"),
          mimeType: base_mime_type,
        },
      },
      {
        text: `Using the first image as a face reference, seamlessly replace the face of the person in the second image. The replacement should:

- Match the facial structure, features, and likeness from the reference photo
- Preserve the skin tone from the second image (it may be tanned, have body paint, or other intentional changes)
- Preserve the exact pose, body position, expression, and head angle from the second image
- Maintain all lighting, shadows, and color grading from the second image
- Keep all clothing, accessories, background, and composition unchanged
- Blend naturally at face boundaries with no visible seams or artifacts

Only the facial features should change. Everything else must remain identical to the second image.`,
      },
    ];

    const result = await genAI.models.generateContent({
      model: model_name,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    for (const candidate of result.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          return {
            success: true,
            image: Buffer.from(part.inlineData.data!, "base64"),
            mime_type: part.inlineData.mimeType || "image/png",
          };
        }
      }
    }

    return {
      success: false,
      error: "Face swap did not return an image",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
};
