import { GoogleGenAI } from "@google/genai";

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
  mime_type: string
): Promise<AnalysisResult> => {
  try {
    const model_name = process.env.GEMINI_ANALYSIS_MODEL || "gemini-2.5-pro-preview-05-06";

    const image_part = {
      inlineData: {
        data: image_buffer.toString("base64"),
        mimeType: mime_type,
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

    // Extract text from response
    let text = "";
    for (const candidate of result.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.text) {
          text += part.text;
        }
      }
    }

    // Extract JSON from response
    const json_match = text.match(/\{[\s\S]*\}/);
    if (!json_match) {
      return {
        success: false,
        raw_text: text,
        error: "No JSON found in response",
      };
    }

    try {
      const data = JSON.parse(json_match[0]);
      return {
        success: true,
        data,
        raw_text: text,
      };
    } catch {
      return {
        success: false,
        raw_text: text,
        error: "Failed to parse JSON from response",
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: message,
    };
  }
};
