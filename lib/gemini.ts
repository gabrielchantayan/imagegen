import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ImageSize = "1K" | "2K" | "4K";

export type GenerationOptions = {
  aspect_ratio?: AspectRatio;
  image_size?: ImageSize;
  number_of_images?: number;
  safety_override?: boolean;
  use_google_search?: boolean;
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

    const result = await genAI.models.generateContent({
      model: model_name,
      contents: [{ role: "user", parts: [{ text: prompt_text }] }],
      config: generation_config,
    });

    const images: Buffer[] = [];
    let mime_type = "image/png";
    let text_response = "";

    for (const candidate of result.candidates || []) {
      for (const part of candidate.content?.parts || []) {
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
