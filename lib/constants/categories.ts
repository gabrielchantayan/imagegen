/**
 * Centralized Category Constants
 *
 * Single source of truth for category-related constants used across the app.
 * This prevents duplication and ensures consistency.
 */

/**
 * All category IDs in display order.
 */
export const CATEGORY_IDS = [
  "characters",
  "physical_traits",
  "jewelry",
  "wardrobe",
  "wardrobe_tops",
  "wardrobe_bottoms",
  "wardrobe_footwear",
  "poses",
  "scenes",
  "backgrounds",
  "camera",
  "ban_lists",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

/**
 * Categories that are shared across all subjects (not subject-specific).
 */
export const SHARED_CATEGORY_IDS = ["scenes", "backgrounds", "camera", "ban_lists"] as const;

export type SharedCategoryId = (typeof SHARED_CATEGORY_IDS)[number];

/**
 * Categories that belong to individual subjects.
 */
export const SUBJECT_CATEGORY_IDS = [
  "characters",
  "physical_traits",
  "jewelry",
  "wardrobe",
  "wardrobe_tops",
  "wardrobe_bottoms",
  "wardrobe_footwear",
  "poses",
] as const;

export type SubjectCategoryId = (typeof SUBJECT_CATEGORY_IDS)[number];

/**
 * Wardrobe-related categories grouped together.
 */
export const WARDROBE_CATEGORY_IDS = [
  "wardrobe",
  "wardrobe_tops",
  "wardrobe_bottoms",
  "wardrobe_footwear",
] as const;

/**
 * Display labels for categories.
 */
export const CATEGORY_LABELS: Record<string, string> = {
  characters: "Characters",
  physical_traits: "Traits",
  jewelry: "Jewelry",
  wardrobe: "Wardrobe",
  wardrobe_tops: "Tops",
  wardrobe_bottoms: "Bottoms",
  wardrobe_footwear: "Footwear",
  poses: "Poses",
  scenes: "Scenes",
  backgrounds: "Backgrounds",
  camera: "Camera",
  ban_lists: "Ban List",
  // Extended labels for tags
  subject: "Subject",
  user: "User Tags",
} as const;

/**
 * Singular form of category labels (for admin/stats displays).
 */
export const CATEGORY_LABELS_SINGULAR: Record<string, string> = {
  characters: "Character",
  physical_traits: "Traits",
  jewelry: "Jewelry",
  wardrobe: "Wardrobe",
  wardrobe_tops: "Top",
  wardrobe_bottoms: "Bottom",
  wardrobe_footwear: "Footwear",
  poses: "Pose",
  scenes: "Scene",
  backgrounds: "Background",
  camera: "Camera",
  ban_lists: "Ban List",
} as const;

/**
 * Color styling for category badges and tags.
 */
export type CategoryColorStyle = {
  bg: string;
  text: string;
  border: string;
};

export const CATEGORY_COLORS: Record<string, CategoryColorStyle> = {
  characters: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  physical_traits: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  jewelry: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  wardrobe: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  wardrobe_tops: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  wardrobe_bottoms: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  wardrobe_footwear: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  poses: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  scenes: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  backgrounds: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  camera: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
  ban_lists: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  // Extended colors for tags
  subject: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  user: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
} as const;

export const DEFAULT_CATEGORY_COLOR: CategoryColorStyle = {
  bg: "bg-secondary",
  text: "text-secondary-foreground",
  border: "border-border",
};

/**
 * Category order for sorting tags and displays.
 * Note: This is a regular array (not const) to allow .indexOf() with string args.
 */
export const CATEGORY_ORDER: string[] = [
  "characters",
  "physical_traits",
  "jewelry",
  "wardrobe",
  "wardrobe_tops",
  "wardrobe_bottoms",
  "wardrobe_footwear",
  "poses",
  "scenes",
  "backgrounds",
  "camera",
  "ban_lists",
  "subject",
  "user",
];

/**
 * Helper to get category color with fallback.
 */
export const get_category_color = (category_id: string): CategoryColorStyle => {
  return CATEGORY_COLORS[category_id] ?? DEFAULT_CATEGORY_COLOR;
};

/**
 * Helper to get category label with fallback.
 */
export const get_category_label = (category_id: string, singular = false): string => {
  if (singular) {
    return CATEGORY_LABELS_SINGULAR[category_id] ?? CATEGORY_LABELS[category_id] ?? category_id;
  }
  return CATEGORY_LABELS[category_id] ?? category_id;
};

/**
 * Checks if a category is shared (not subject-specific).
 */
export const is_shared_category = (category_id: string): boolean => {
  return (SHARED_CATEGORY_IDS as readonly string[]).includes(category_id);
};

/**
 * Checks if a category is subject-specific.
 */
export const is_subject_category = (category_id: string): boolean => {
  return (SUBJECT_CATEGORY_IDS as readonly string[]).includes(category_id);
};
