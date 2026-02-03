import { GoogleGenAI } from "@google/genai";

import { extract_json_from_response } from "@/lib/gemini-response-parser";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const FACIAL_ANALYSIS_PROMPT = `
**Role:** You are a Lead CGI Texture Artist and Forensic Anthropologist.

**Task:** Perform a pixel-level analysis of the provided face. Deconstruct the image into a highly granular JSON dataset suitable for training LoRAs or prompting high-fidelity models (Flux/Midjourney v6). Focus on asymmetry, biological irregularities, and light physics.

**Output Format:** Raw JSON only. No markdown fences.

**JSON Schema & Analysis Rules:**

{
  "biometrics": {
    "age": "Precise estimate (e.g., 'late 20s')",
    "ethnicity": "Specific phenotype mix",
    "sex_dimorphism": "Masculine/Feminine features intensity",
    "bmi_indication": "Facial fat distribution notes",
    "asymmetry": "Note specific differences between left/right sides (e.g., 'left eye sits 2mm lower')"
  },
  "dermatology": {
    "fitzpatrick_type": "Scale I-VI",
    "undertones": "Vein color visibility, cool/warm/neutral balance",
    "texture_map": {
      "t_zone": "Pore size, oil reflectivity",
      "cheeks": "Capillary visibility, fuzz (vellus hair) density",
      "under_eye": "Thinness, vascular blue-tinting, milia presence"
    },
    "surface_details": [
      "List every mole (location/size)",
      "Acne scarring types (icepick/boxcar)",
      "Hyper-pigmentation zones",
      "Active blemishes"
    ],
    "subsurface_scattering": "How light penetrates ears/nose (redness intensity)"
  },
  "morphology": {
    "skull_structure": {
      "forehead": "Slope angle, bossing prominence",
      "cheekbones": "Zygomatic arch definition and height",
      "jaw": "Mandible width, gonial angle sharpness",
      "chin": "Mental protuberance shape (cleft, recessed, protruding)"
    },
    "eyes": {
      "canthal_tilt": "Positive (cat-like) or negative (droopy)",
      "epicanthic_fold": "Presence and severity",
      "sclera": "Whiteness health, visible vasculature",
      "iris": {
        "pattern": "Crypts, furrows, contraction grooves",
        "color_map": "Central heterochromia, limbal ring definition"
      },
      "lashes": "Root density vs tip direction",
      "brows": "Follicle direction, stray hairs, grooming shape"
    },
    "nose": {
      "dorsum": "Bridge straightness/humps",
      "alar_base": "Nostril flare width",
      "columella": "Visibility/droop below alar rim"
    },
    "mouth": {
      "philtrum": "Depth and width of ridges",
      "vermilion_border": "Sharpness of lip edge",
      "lip_texture": "Vertical cracks, dryness, glossiness",
      "commisures": "Corner depth/shadows"
    }
  },
  "hair_physics": {
    "strand_info": "Thickness (denier), cuticle health (shine)",
    "growth_pattern": "Cowlicks, widow's peak details",
    "root_contrast": "Regrowth visibility",
    "stray_hairs": "Flyaways description"
  }
}
`;

export type FacialAnalysisResult = {
  success: boolean;
  data?: Record<string, unknown>;
  raw_text?: string;
  error?: string;
};

export const analyze_facial = async (
  image_buffer: Buffer,
  mime_type: string,
): Promise<FacialAnalysisResult> => {
  try {
    const model_name =
      process.env.GEMINI_ANALYSIS_MODEL || "gemini-3-pro-preview";

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
          parts: [{ text: FACIAL_ANALYSIS_PROMPT }, image_part],
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
