import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "@google/genai";

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

    // Add Google Search grounding tool if enabled
    if (options.use_google_search) {
      generation_config.tools = [{ googleSearch: {} }];
    }

    // Add safety settings override if enabled
    if (options.safety_override) {
      generation_config.safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ];
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

      // Add face reference instruction BEFORE the main prompt
      const ref_count = options.reference_images.length;
      const face_instruction = `CHARACTER REFERENCE: The ${ref_count === 1 ? "image above shows the specific character" : "images above show the specific characters"} whose face and identity MUST appear in the generated image.

CRITICAL REQUIREMENTS:
- The generated subject must have the EXACT SAME FACE as the reference ${ref_count === 1 ? "image" : "images"}
- Copy these exact features: eye shape, eye color, nose shape, lip shape, jawline, cheekbone structure, eyebrow shape, face proportions, hairline shape, ear shape
- This is the same character - their unique facial geometry and distinctive features must be identical
- Treat this as depicting the same character in a new scene

DO NOT: Create a generic face, average out features, or generate someone who merely looks "similar"
DO: Generate an image of the EXACT SAME CHARACTER with identical facial features

The body, pose, clothing, scene, and all other visual elements come ONLY from the prompt below. Only the FACE and IDENTITY come from the reference.

`;
      parts.push({ text: face_instruction + prompt_text });
    } else {
      // Add text prompt without face reference instruction
      parts.push({ text: prompt_text });
    }

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
        text: `IDENTITY TRANSFER TASK: Replace the face in Image 2 with the face from Image 1.

Image 1 (FIRST IMAGE) = Source face. This is the character whose face must appear in the output.
Image 2 (SECOND IMAGE) = Target scene. Keep everything EXCEPT the face.

WHAT TO TRANSFER FROM IMAGE 1:
- The complete facial identity: eye shape, eye color, nose bridge and tip shape, lip shape and fullness, jawline contour, cheekbone structure, eyebrow shape and position, forehead shape, chin shape, ear shape
- The output must show the EXACT SAME CHARACTER as Image 1
- Copy the unique geometry that makes this face distinct from all other faces

WHAT TO PRESERVE FROM IMAGE 2:
- Exact head angle, tilt, and rotation
- Expression and emotion (adapt the transferred face to match)
- Skin tone, tan, makeup, or body paint
- Hair (unless face reference shows different hair at the boundary)
- All lighting, shadows, highlights, and color grading
- Neck, body, pose, clothing, accessories, background - EVERYTHING except the face itself

QUALITY REQUIREMENTS:
- Seamless blending at face boundaries - no visible edges or color mismatches
- Consistent lighting direction on the transferred face
- Natural skin texture continuation
- The result should look like the Image 1 character was the original subject of Image 2

OUTPUT: A single image showing the character from Image 1 in the scene from Image 2.`,
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
