/**
 * Consolidated API type definitions
 *
 * This file contains shared types for API requests and responses
 * used across hooks and API routes.
 */

import type {
  Component,
  Category,
  SavedPrompt,
  GenerationStatus,
  GenerationWithFavorite,
  ReferencePhoto,
} from "./database";

// =============================================================================
// Generic Result Types
// =============================================================================

/**
 * Standard API error response
 */
export type ApiError = {
  error: string;
  code?: string;
};

/**
 * Generic discriminated union for API results
 * Use this for functions that can succeed or fail
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Async API result - same as ApiResult but for async operations
 */
export type AsyncApiResult<T> = Promise<ApiResult<T>>;

// =============================================================================
// Generation API Types
// =============================================================================

/**
 * Generation status response from /api/generate/[id]/status
 * Uses discriminated union for type-safe status handling
 */
export type GenerationStatusResponse =
  | { status: "pending"; queue_position?: number }
  | { status: "generating"; queue_position?: number }
  | { status: "completed"; image_path: string }
  | { status: "failed"; error: string };

/**
 * Simplified generation status response (current implementation)
 * TODO: Migrate to discriminated union above
 */
export type GenerationStatusResponseSimple = {
  status: GenerationStatus;
  image_path?: string;
  error?: string;
  queue_position?: number;
};

/**
 * Input type for tracking components used in a generation
 */
export type ComponentUsedInput = {
  id: string;
  name: string;
  category_id: string;
};

/**
 * Options for submitting a generation request
 */
export type SubmitGenerationOptions = {
  aspect_ratio?: string;
  count?: number;
  reference_photo_ids?: string[];
  components_used?: ComponentUsedInput[];
};

/**
 * Response from POST /api/generate
 */
export type SubmitGenerationResponse = {
  queue_id: string;
  generation_id: string;
  position: number;
};

// =============================================================================
// Components API Types
// =============================================================================

/**
 * Response from GET /api/components
 */
export type ComponentsResponse = {
  components: Component[];
  categories: Category[];
};

/**
 * Request body for POST /api/components
 */
export type CreateComponentRequest = {
  category_id: string;
  name: string;
  description?: string;
  data: Record<string, unknown>;
};

/**
 * Request body for PUT /api/components/[id]
 */
export type UpdateComponentRequest = {
  name?: string;
  description?: string;
  data?: Record<string, unknown>;
};

// =============================================================================
// Prompts API Types
// =============================================================================

/**
 * Response from GET /api/prompts
 */
export type PromptsResponse = {
  prompts: SavedPrompt[];
};

/**
 * Request body for POST /api/prompts
 */
export type SavePromptRequest = {
  name: string;
  description?: string;
  prompt_json: Record<string, unknown>;
};

/**
 * Request body for PUT /api/prompts/[id]
 */
export type UpdatePromptRequest = {
  name?: string;
  description?: string;
  prompt_json?: Record<string, unknown>;
};

// =============================================================================
// History API Types
// =============================================================================

/**
 * Query options for GET /api/history
 */
export type HistoryQueryOptions = {
  favorites_only?: boolean;
  search?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
};

/**
 * Response from POST /api/history/[id]/favorite
 */
export type ToggleFavoriteResponse = {
  favorited: boolean;
};

/**
 * Paginated history response (uses PaginatedResult from db-helpers)
 * Items are GenerationWithFavorite from database types
 */
export type HistoryResponse = {
  items: GenerationWithFavorite[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

// =============================================================================
// References API Types
// =============================================================================

/**
 * Response from GET /api/references
 */
export type ReferencesResponse = {
  references: ReferencePhoto[];
  component_defaults: Record<string, string[]>;
};

/**
 * Request body for POST /api/components/[id]/references
 */
export type AttachReferenceRequest = {
  reference_photo_id: string;
};

/**
 * Request body for PATCH /api/references/[id]
 */
export type UpdateReferenceRequest = {
  name: string;
};

// =============================================================================
// Analyze API Types
// =============================================================================

/**
 * Response from POST /api/analyze (success case)
 */
export type AnalyzeResponse = ApiResult<Record<string, unknown>>;

// =============================================================================
// Auth API Types
// =============================================================================

/**
 * Request body for POST /api/auth/login
 */
export type LoginRequest = {
  password: string;
};

/**
 * Response from POST /api/auth/login
 */
export type LoginResponse =
  | { success: true }
  | { success: false; error: string };
