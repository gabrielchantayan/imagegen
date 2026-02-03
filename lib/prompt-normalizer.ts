import type { StandardPrompt } from "./types/prompt-schema";

const is_plain_object = (val: unknown): val is Record<string, unknown> => {
  return typeof val === "object" && val !== null && !Array.isArray(val);
};

const set_nested = (obj: Record<string, unknown>, path: string, value: unknown) => {
  const parts = path.split(".");
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  
  const last = parts[parts.length - 1];
  
  // Handle array merging for specific keys
  if (path.endsWith("accessories") || path === "negative_prompt") {
    if (Array.isArray(value)) {
      const existing = Array.isArray(current[last]) ? current[last] as unknown[] : [];
      current[last] = [...existing, ...value];
    } else if (typeof value === "string") {
      const existing = Array.isArray(current[last]) ? current[last] as unknown[] : [];
      current[last] = [...existing, value];
    } else {
      current[last] = value;
    }
  } else {
    current[last] = value;
  }
};

// Generic mapping for subject-related categories
const GENERIC_SUBJECT_MAPPING: Record<string, string> = {
  // Identity
  "species": "identity.species",
  "ethnicity": "identity.ethnicity",
  "age_range": "identity.age",
  "attractiveness": "identity.description", // merging into description context
  "type": "identity.description",
  
  // Appearance - Body
  "body": "appearance.body.description",
  "nails": "appearance.body.nails",
  
  // Appearance - Skin
  "skin": "appearance.skin.description",
  
  // Appearance - Hair
  "hair": "appearance.hair.description",
  
  // Appearance - Face
  "face": "appearance.face.description",
  "eyebrows": "appearance.face.features.eyebrows",
  "makeup": "appearance.face.features.makeup",
  "eye shadow": "appearance.face.features.eye_shadow",
  "eye liner": "appearance.face.features.eye_liner",
  
  // Technical / Deep objects
  "hair_physics": "appearance.hair.physics",
  "dermatology": "appearance.skin.details",
  "morphology": "appearance.face.morphology",
  "biometrics": "appearance.body.details", // Mapping entire object here, specific fields extracted below
  
  // Wardrobe
  "wardrobe": "wardrobe.description",
  "top": "wardrobe.top",
  "bottom": "wardrobe.bottom",
  "footwear": "wardrobe.footwear",
  "underwear": "wardrobe.underwear",
  
  // Accessories
  "jewelry": "wardrobe.accessories",
  "necklace": "wardrobe.accessories",
  "earrings": "wardrobe.accessories",
  "rings": "wardrobe.accessories",
  "belt": "wardrobe.accessories",
  
  // Poses
  "hands": "pose.hands",
  "expression": "pose.expression",
  "gaze": "pose.gaze",
  "angle": "camera.settings",
  "framing": "camera.settings"
};

// Specific category overrides if needed
const CATEGORY_MAPPINGS: Record<string, Record<string, string>> = {
  poses: {
    ...GENERIC_SUBJECT_MAPPING,
    "body": "pose.body", // In poses, 'body' refers to the pose itself
  }
};

/**
 * Normalizes a single component's data into the StandardPrompt subject structure.
 */
export const normalize_subject_component = (
  data: Record<string, unknown>,
  category_id: string
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const mapping = CATEGORY_MAPPINGS[category_id] || GENERIC_SUBJECT_MAPPING;

  for (const [key, value] of Object.entries(data)) {
    // 1. Handle "biometrics" special extraction
    if (key === "biometrics" && is_plain_object(value)) {
      // Map the whole object first
      set_nested(result, "appearance.body.details", value);
      
      // Extract specific fields
      if ("age" in value) set_nested(result, "identity.age", value.age);
      if ("ethnicity" in value) set_nested(result, "identity.ethnicity", value.ethnicity);
      if ("sex_dimorphism" in value) set_nested(result, "identity.gender", value.sex_dimorphism);
      if ("height" in value) set_nested(result, "appearance.body.height", value.height);
      if ("bmi_indication" in value) set_nested(result, "appearance.body.build", value.bmi_indication);
      continue;
    }

    // 2. Handle mapped keys
    if (key in mapping) {
      const target_path = mapping[key];
      
      // Special handling for "wardrobe" key collision
      // If "wardrobe" is an object, it's likely already normalized/structured, 
      // so we should merge it into "wardrobe" root, not "wardrobe.description"
      if (key === "wardrobe" && is_plain_object(value)) {
         set_nested(result, "wardrobe", value);
         continue;
      }

      // If target is description/identity, we might want to preserve multiple values if possible?
      // For now, simple override/set.
      set_nested(result, target_path, value);
    } 
    // 3. Handle unmapped keys - preserve at root of subject (merging logic elsewhere will handle conflicts)
    else {
      result[key] = value;
    }
  }

  return result;
};

/**
 * Normalizes shared/global components (scene, camera, etc)
 */
export const normalize_shared_component = (
  data: Record<string, unknown>,
  category_id: string
): Record<string, unknown> => {
  // For shared components, we mostly trust the structure, but we can standardize simple strings
  // e.g. "scenes" -> { scene: "..." } should be { description: "..." } in the final scene object
  
  const result: Record<string, unknown> = { ...data };
  
  // Standardize common keys to "description" if it's the main text
  if (category_id === "scenes" && "scene" in result) {
    result.description = result.scene;
    delete result.scene;
  }
  if (category_id === "backgrounds" && "background" in result) {
     // background might be an object
     if (typeof result.background === 'string') {
        result.description = result.background;
        delete result.background;
     } else if (is_plain_object(result.background)) {
        // Merge background object into root
        return { ...result.background };
     }
  }
  if (category_id === "camera" && "camera" in result) {
      if (is_plain_object(result.camera)) {
          return { ...result.camera, ...result }; // flatten
      }
  }
  
  if (category_id === "ban_lists" && "ban" in result) {
      // Map "ban" to "negative_prompt"
      // The caller needs to put this in the root of StandardPrompt, not subject
      // We'll return it as is, and the composer will handle the root key "negative_prompt"
      return { negative_prompt: result.ban };
  }

  return result;
};
