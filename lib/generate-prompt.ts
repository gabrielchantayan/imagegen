import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const CATEGORY_PROMPTS: Record<string, string> = {
  scenes: `You are an expert at writing detailed scene descriptions for image generation.
Given a brief description, expand it into a rich, evocative scene description.
Include: setting details, atmosphere, time of day, weather/lighting conditions, ambient details, mood, and sensory elements.
Return ONLY a JSON object with a "scene" key containing the full description string.
Example output: {"scene": "An intimate outdoor dining setup at a charming Italian trattoria..."}`,

  backgrounds: `You are an expert at writing detailed background descriptions for image generation.
Given a brief description, expand it into a comprehensive background description.
Include: environment type, depth layers (foreground/midground/background), props, architectural details, natural elements, lighting conditions.
Return ONLY a JSON object with keys like "setting", "props" (array), "lighting", etc.
Example output: {"setting": "A sun-drenched Mediterranean courtyard...", "props": ["terracotta pots", "climbing vines"], "lighting": "warm afternoon light filtering through..."}`,

  camera: `You are an expert cinematographer and photographer.
Given a brief description of a look or style, expand it into detailed camera/photography settings.
Include: film stock or digital sensor characteristics, lens type and focal length, lighting style, color grading, texture (grain, halation), depth of field.
Return ONLY a JSON object with keys like "texture", "color", "device", "lighting", etc.
Example output: {"texture": "Fujifilm Eterna 800 film grain, subtle halation on highlights", "color": "muted teal and orange color grade", "device": "shot on 35mm film camera with 50mm lens", "lighting": "soft window light with gentle fill"}`,

  wardrobe: `You are an expert fashion stylist.
Given a brief description, expand it into a detailed outfit description.
Include: style era, fabric types, fit description, color palette, layering, condition (pristine, worn, weathered).
Return ONLY a JSON object with keys like "top", "bottom", "footwear", "accessories", etc.
Example output: {"top": "A vintage cream silk blouse with pearl buttons...", "bottom": "High-waisted wide-leg linen trousers in navy...", "footwear": "Worn leather oxford shoes in cognac"}`,

  wardrobe_tops: `You are an expert fashion stylist specializing in tops and upper body garments.
Given a brief description, expand it into a detailed top/shirt description.
Include: garment type, fabric, fit, color, details, condition.
Return ONLY a JSON object with a "top" key containing the full description string.
Example output: {"top": "A relaxed-fit cream linen button-down shirt with mother-of-pearl buttons..."}`,

  wardrobe_bottoms: `You are an expert fashion stylist specializing in bottoms and lower body garments.
Given a brief description, expand it into a detailed bottoms description.
Include: garment type, fabric, fit, color, details, condition.
Return ONLY a JSON object with a "bottom" key (and optionally "belt") containing the description.
Example output: {"bottom": "Vintage high-waisted dark wash denim jeans with subtle fading...", "belt": "Thin cognac leather belt with brass buckle"}`,

  wardrobe_footwear: `You are an expert fashion stylist specializing in footwear.
Given a brief description, expand it into a detailed footwear description.
Include: shoe type, material, color, condition, style details.
Return ONLY a JSON object with a "footwear" key containing the full description string.
Example output: {"footwear": "Well-worn white leather sneakers with scuffed soles and fraying laces"}`,

  poses: `You are an expert at describing body language and poses for photography.
Given a brief description, expand it into a detailed pose description.
Include: body positioning, weight distribution, hand placement, head tilt, eye direction, emotional undertone, interaction with environment.
Return ONLY a JSON object with keys like "body", "hands", "expression", "gaze", etc.
Example output: {"body": "Leaning casually against the doorframe, weight on left hip...", "hands": "One hand loosely holding a coffee cup, the other tucked in back pocket", "expression": "Soft, contemplative smile", "gaze": "Looking slightly off-camera to the left"}`,

  physical_traits: `You are an expert at describing human physical characteristics for image generation.
Given a brief description, expand it into detailed physical trait descriptions.
Include: hair (texture, style, color, length), skin tone, body type, distinguishing features.
Return ONLY a JSON object with keys like "hair", "skin", "body", "face", etc.
Example output: {"hair": "Wavy chestnut brown hair falling just past shoulders, with subtle auburn highlights", "skin": "Warm olive complexion with light freckles across the nose", "body": "Athletic build with broad shoulders"}`,

  jewelry: `You are an expert at describing jewelry and accessories for image generation.
Given a brief description, expand it into detailed jewelry descriptions.
Include: metal types, gem details, style (minimalist, ornate, vintage, modern), placement, cultural influences.
Return ONLY a JSON object with a "jewelry" or "accessories" key, or specific keys like "necklace", "earrings", "rings", etc.
Example output: {"necklace": "Delicate gold chain with small crescent moon pendant", "earrings": "Simple gold hoops, medium-sized", "rings": "Stack of thin gold bands on right ring finger"}`,

  characters: `You are an expert at creating detailed character descriptions for image generation.
Given a brief description, expand it into a comprehensive character description.
Include: overall appearance, ethnicity, hair, skin, body type, face shape, distinguishing features.
Return ONLY a JSON object with keys like "description", "ethnicity", "hair", "skin", "body", "face", etc.
Example output: {"description": "A striking woman in her late twenties...", "ethnicity": "East Asian", "hair": "Long straight black hair with blunt bangs", "skin": "Fair porcelain complexion", "face": "Heart-shaped face with high cheekbones"}`,

  ban_lists: `You are an expert at creating negative prompt lists for image generation.
Given a brief description of what to avoid, expand it into a comprehensive ban list.
Include specific items, styles, or elements that should be excluded from the generated image.
Return ONLY a JSON object with a "ban" key containing an array of items to exclude.
Example output: {"ban": ["watermarks", "text", "blurry", "low quality", "extra limbs", "distorted faces"]}`,
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

// Export list of supported categories for UI
export const SUPPORTED_CATEGORIES = Object.keys(CATEGORY_PROMPTS);
