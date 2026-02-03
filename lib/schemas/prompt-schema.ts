/**
 * Prompt Schema Validation (Zod)
 *
 * Provides runtime validation for prompt JSON structures.
 * Use these schemas at API boundaries and when loading from DB.
 */

import { z } from "zod";

// Identity schema - core character identification
const IdentitySchema = z.object({
  description: z.string().optional(),
  name: z.string().optional(),
  species: z.string().optional(),
  age: z.string().optional(),
  ethnicity: z.string().optional(),
  gender: z.string().optional(),
}).passthrough();

// Body schema
const BodySchema = z.object({
  description: z.string().optional(),
  height: z.string().optional(),
  build: z.string().optional(),
  details: z.record(z.unknown()).optional(),
  nails: z.string().optional(),
}).passthrough();

// Skin schema
const SkinSchema = z.object({
  description: z.string().optional(),
  details: z.object({
    fitzpatrick_type: z.string().optional(),
    undertones: z.string().optional(),
    texture_map: z.record(z.unknown()).optional(),
    surface_details: z.array(z.string()).optional(),
    subsurface_scattering: z.string().optional(),
    cranial_appendages: z.unknown().optional(),
  }).passthrough().optional(),
}).passthrough();

// Hair schema
const HairSchema = z.object({
  description: z.string().optional(),
  physics: z.record(z.unknown()).optional(),
}).passthrough();

// Face schema
const FaceSchema = z.object({
  description: z.string().optional(),
  morphology: z.record(z.unknown()).optional(),
  features: z.object({
    makeup: z.string().optional(),
    eyebrows: z.string().optional(),
    eye_shadow: z.string().optional(),
    eye_liner: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

// Eyes schema
const EyesSchema = z.object({
  description: z.string().optional(),
  color: z.string().optional(),
  details: z.record(z.unknown()).optional(),
}).passthrough();

// Appearance schema
const AppearanceSchema = z.object({
  body: BodySchema.optional(),
  skin: SkinSchema.optional(),
  hair: HairSchema.optional(),
  face: FaceSchema.optional(),
  eyes: EyesSchema.optional(),
}).passthrough();

// Wardrobe schema
const WardrobeSchema = z.object({
  description: z.string().optional(),
  top: z.string().optional(),
  bottom: z.string().optional(),
  footwear: z.string().optional(),
  underwear: z.string().optional(),
  accessories: z.array(z.string()).optional(),
}).passthrough();

// Pose schema
const PoseSchema = z.object({
  description: z.string().optional(),
  body: z.string().optional(),
  hands: z.string().optional(),
  expression: z.string().optional(),
  gaze: z.string().optional(),
}).passthrough();

// Subject schema
const SubjectSchema = z.object({
  identity: IdentitySchema.optional(),
  appearance: AppearanceSchema.optional(),
  wardrobe: WardrobeSchema.optional(),
  pose: PoseSchema.optional(),
}).passthrough();

// Scene schema
const SceneSchema = z.object({
  description: z.string().optional(),
  setting: z.string().optional(),
  lighting: z.string().optional(),
  atmosphere: z.string().optional(),
  props: z.array(z.string()).optional(),
}).passthrough();

// Camera schema
const CameraSchema = z.object({
  description: z.string().optional(),
  settings: z.string().optional(),
  film_stock: z.string().optional(),
  effects: z.string().optional(),
}).passthrough();

/**
 * Full prompt schema for single-subject prompts.
 */
export const PromptSchema = z.object({
  subject: SubjectSchema.optional(),
  subjects: z.array(SubjectSchema).optional(),
  scene: SceneSchema.optional(),
  camera: CameraSchema.optional(),
  negative_prompt: z.array(z.string()).optional(),
}).passthrough();

/**
 * Inferred TypeScript type from the Zod schema.
 */
export type Prompt = z.infer<typeof PromptSchema>;

/**
 * Validates a prompt object and returns the result.
 *
 * @param data - The data to validate
 * @returns Validation result with parsed data or error
 */
export const validate_prompt = (data: unknown): z.SafeParseReturnType<unknown, Prompt> => {
  return PromptSchema.safeParse(data);
};

/**
 * Validates a prompt object, throwing on error.
 *
 * @param data - The data to validate
 * @returns Parsed and validated prompt
 * @throws ZodError if validation fails
 */
export const parse_prompt = (data: unknown): Prompt => {
  return PromptSchema.parse(data);
};

/**
 * Checks if data is a valid prompt without throwing.
 *
 * @param data - The data to check
 * @returns True if valid prompt
 */
export const is_valid_prompt = (data: unknown): data is Prompt => {
  return PromptSchema.safeParse(data).success;
};

/**
 * Gets validation errors as a formatted string.
 *
 * @param result - The validation result from safeParse
 * @returns Formatted error message or null if valid
 */
export const get_validation_errors = (
  result: z.SafeParseReturnType<unknown, Prompt>
): string | null => {
  if (result.success) return null;

  const errors = result.error.errors.map((e) => {
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });

  return errors.join("; ");
};

// Export individual schemas for partial validation
export {
  SubjectSchema,
  SceneSchema,
  CameraSchema,
  WardrobeSchema,
  PoseSchema,
  AppearanceSchema,
  IdentitySchema,
};
