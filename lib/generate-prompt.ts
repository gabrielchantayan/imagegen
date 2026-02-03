import { GoogleGenAI } from "@google/genai";

import { extract_json_from_response } from "@/lib/gemini-response-parser";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const CATEGORY_PROMPTS: Record<string, string> = {
  scenes: `You are an expert at writing detailed scene descriptions for image generation.
Given a brief description, expand it into a rich, evocative scene description.
Include: setting details, atmosphere, time of day, weather/lighting conditions, ambient details, mood, and sensory elements.
Return ONLY a JSON object with keys like "description", "setting", "lighting", "atmosphere".
Example output: {"description": "An intimate outdoor dining setup...", "setting": "Italian trattoria terrace", "lighting": "Warm candlelight"}`,

  backgrounds: `You are an expert at writing detailed background descriptions for image generation.
Given a brief description, expand it into a comprehensive background description.
Include: environment type, depth layers (foreground/midground/background), props, architectural details, natural elements, lighting conditions.
Return ONLY a JSON object with keys like "description", "props" (array), "lighting".
Example output: {"description": "A sun-drenched Mediterranean courtyard...", "props": ["terracotta pots", "climbing vines"], "lighting": "warm afternoon light"}`,

  camera: `You are an expert cinematographer and photographer.
Given a brief description of a look or style, expand it into detailed camera/photography settings.
Include: film stock or digital sensor characteristics, lens type and focal length, lighting style, color grading, texture (grain, halation), depth of field.
Return ONLY a JSON object with keys like "description", "settings", "film_stock", "effects".
Example output: {"description": "Cinematic film look", "settings": "35mm camera, 50mm lens", "film_stock": "Kodak Portra 400", "effects": "Medium film grain, slight halation"}`,

  wardrobe: `You are an expert fashion stylist.
Given a brief description, expand it into a detailed outfit description.
Include: style era, fabric types, fit description, color palette, layering, condition (pristine, worn, weathered).
Return ONLY a JSON object structured as: {"wardrobe": {"description": "...", "top": "...", "bottom": "...", "footwear": "...", "accessories": [...]}}
Example output: {"wardrobe": {"description": "Vintage chic ensemble", "top": "Silk blouse", "bottom": "High-waisted trousers", "footwear": "Leather oxfords", "accessories": ["Gold watch", "Pearl earrings"]}}`,

  wardrobe_tops: `You are an expert fashion stylist specializing in tops and upper body garments.
Given a brief description, expand it into a detailed top/shirt description.
Return ONLY a JSON object structured as: {"wardrobe": {"top": "..."}}
Example output: {"wardrobe": {"top": "A relaxed-fit cream linen button-down shirt with mother-of-pearl buttons"}}`,

  wardrobe_bottoms: `You are an expert fashion stylist specializing in bottoms and lower body garments.
Given a brief description, expand it into a detailed bottoms description.
Return ONLY a JSON object structured as: {"wardrobe": {"bottom": "...", "accessories": ["belt..."]}}
Example output: {"wardrobe": {"bottom": "Vintage high-waisted dark wash denim jeans", "accessories": ["Thin cognac leather belt"]}}`,

  wardrobe_footwear: `You are an expert fashion stylist specializing in footwear.
Given a brief description, expand it into a detailed footwear description.
Return ONLY a JSON object structured as: {"wardrobe": {"footwear": "..."}}
Example output: {"wardrobe": {"footwear": "Well-worn white leather sneakers"}}`,

  poses: `You are an expert at describing body language and poses for photography.
Given a brief description, expand it into a detailed pose description.
Include: body positioning, weight distribution, hand placement, head tilt, eye direction, emotional undertone.
Return ONLY a JSON object structured as: {"pose": {"description": "...", "body": "...", "hands": "...", "expression": "...", "gaze": "..."}}
Example output: {"pose": {"description": "Casual leaning pose", "body": "Leaning against wall", "hands": "Hands in pockets", "expression": "Relaxed smile", "gaze": "Direct to camera"}}`,

  physical_traits: `You are an expert at describing human physical characteristics for image generation.
Given a brief description, expand it into detailed physical trait descriptions.
Return ONLY a JSON object structured with "identity" and "appearance" objects.
Example output: {
  "identity": {"age": "20s", "ethnicity": "Caucasian"},
  "appearance": {
    "hair": {"description": "Long wavy brown hair"},
    "skin": {"description": "Olive skin", "details": {"undertones": "warm"}},
    "body": {"description": "Athletic build", "height": "Tall"},
    "face": {"description": "Heart shaped face"}
  }
}`,

  jewelry: `You are an expert at describing jewelry and accessories for image generation.
Given a brief description, expand it into detailed jewelry descriptions.
Return ONLY a JSON object structured as: {"wardrobe": {"accessories": ["item 1", "item 2"]}}
Example output: {"wardrobe": {"accessories": ["Gold hoop earrings", "Silver chain necklace"]}}`,

  characters: `You are an expert at creating detailed character descriptions for image generation.
Given a brief description, expand it into a comprehensive character description.
Return ONLY a JSON object structured with "identity" and "appearance" objects.
Example output: {
  "identity": {"description": "A cyberpunk hacker", "age": "24", "ethnicity": "Asian"},
  "appearance": {
    "hair": {"description": "Neon blue bob cut", "physics": {"movement": "Flowing"}},
    "skin": {"description": "Pale skin with cybernetic markings"},
    "face": {"description": "Sharp features", "features": {"makeup": "Dark eyeliner"}},
    "body": {"description": "Slender build"}
  },
  "wardrobe": {"description": "Tech-wear jacket and cargo pants"}
}`,

  ban_lists: `You are an expert at creating negative prompt lists for image generation.
Given a brief description of what to avoid, expand it into a comprehensive ban list.
Return ONLY a JSON object with a "negative_prompt" key containing an array of items to exclude.
Example output: {"negative_prompt": ["watermarks", "text", "blurry", "low quality"]}`,
};

export type GeneratePromptResult = {
  success: boolean;
  data?: Record<string, unknown>;
  raw_text?: string;
  error?: string;
};

export const generate_prompt = async (
  category: string,
  description: string
): Promise<GeneratePromptResult> => {
  try {
    const system_prompt = CATEGORY_PROMPTS[category];
    if (!system_prompt) {
      return {
        success: false,
        error: `Unknown category: ${category}`,
      };
    }

    const model_name =
      process.env.GEMINI_ANALYSIS_MODEL || "gemini-3-pro-preview";

    const result = await genAI.models.generateContent({
      model: model_name,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${system_prompt}\n\nUser description: "${description}"\n\nRespond with ONLY the JSON object, no markdown or explanation.`,
            },
          ],
        },
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
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

// Export list of supported categories for UI
export const SUPPORTED_CATEGORIES = Object.keys(CATEGORY_PROMPTS);
