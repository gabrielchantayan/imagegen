// =============================================================================
// Queue
// =============================================================================

export const MAX_CONCURRENT_GENERATIONS = 5;
export const QUEUE_CLEANUP_RETENTION = 100;

// =============================================================================
// Rate limiting
// =============================================================================

export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// =============================================================================
// Auth
// =============================================================================

export const AUTH_COOKIE_NAME = "pb_session";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// =============================================================================
// Paths
// =============================================================================

export const PUBLIC_IMAGES_DIR = "public/images";
export const IMAGES_URL_PREFIX = "/images";

// =============================================================================
// Search / Query limits
// =============================================================================

export const SEARCH_RESULTS_LIMIT = 50;

// =============================================================================
// Gemini models (defaults when env vars are not set)
// =============================================================================

export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation";
export const DEFAULT_GEMINI_ANALYSIS_MODEL = "gemini-3-pro-preview";

// =============================================================================
// Component categories
// =============================================================================

export const REFERENCE_CATEGORIES = ["characters", "physical_traits"] as const;
export const SHARED_CATEGORIES = ["scenes", "backgrounds", "camera", "ban_lists"] as const;
export const BODY_CATEGORIES = ["characters", "physical_traits", "jewelry"] as const;
