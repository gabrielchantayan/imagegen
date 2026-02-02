import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export type GenerationOptions = {
  aspect_ratio?: AspectRatio;
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

    const generation_config: Record<string, unknown> = {
      responseModalities: ["image", "text"],
    };

    if (options.aspect_ratio) {
      generation_config.aspectRatio = options.aspect_ratio;
    }

    if (options.number_of_images) {
      generation_config.numberOfImages = options.number_of_images;
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
