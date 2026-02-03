import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

import { extract_json_from_response } from "@/lib/gemini-response-parser";

const convert_to_supported_format = async (
  buffer: Buffer,
  mime_type: string
): Promise<{ buffer: Buffer; mime_type: string }> => {
  if (mime_type === "image/avif") {
    const converted = await sharp(buffer).png().toBuffer();
    return { buffer: converted, mime_type: "image/png" };
  }
  return { buffer, mime_type };
};

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const ANALYSIS_PROMPT = `You are an expert image analyst. Analyze the provided image and extract a detailed JSON description following this exact structure:

{
  "subject": {
    "description": "Overall description of the main subject",
    "ethnicity": "Observed or inferred ethnicity",
    "hair": "Hair description (color, style, length)",
    "skin": "Skin tone description",
    "body": "Body type description",
    "face": "Facial features description"
  },
  "wardrobe": {
    "top": "Upper body clothing description",
    "bottom": "Lower body clothing description",
    "footwear": "Footwear description",
    "accessories": "Any accessories worn"
  },
  "jewelry": {
    "description": "Jewelry items worn"
  },
  "pose": {
    "body": "Body position description",
    "hands": "Hand position description",
    "expression": "Facial expression"
  },
  "scene": "Overall scene description",
  "background": {
    "setting": "Background environment",
    "props": ["List of visible props"]
  },
  "camera": {
    "angle": "Camera angle (eye level, low angle, etc.)",
    "framing": "Shot framing (close-up, medium, full body)",
    "style": "Photography style notes"
  }
}

Be detailed and specific. If something is not visible or applicable, omit that field. Focus on factual observation, not interpretation.`;

export type AnalysisResult = {
  success: boolean;
  data?: Record<string, unknown>;
  raw_text?: string;
  error?: string;
};

export const analyze_image = async (
  image_buffer: Buffer,
  mime_type: string,
): Promise<AnalysisResult> => {
  try {
    const model_name =
      process.env.GEMINI_ANALYSIS_MODEL || "gemini-3-pro-preview";

    const { buffer, mime_type: converted_mime } = await convert_to_supported_format(
      image_buffer,
      mime_type
    );

    const image_part = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: converted_mime,
      },
    };

    const result = await genAI.models.generateContent({
      model: model_name,
      contents: [
        {
          role: "user",
          parts: [{ text: ANALYSIS_PROMPT }, image_part],
        },
      ],
      config: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    const extraction = extract_json_from_response(result);

    if (extraction.success) {
      return {
        success: true,
        data: extraction.data,
        raw_text: extraction.raw_text,
      };
    }

    return {
      success: false,
      raw_text: extraction.raw_text,
      error: extraction.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
};
