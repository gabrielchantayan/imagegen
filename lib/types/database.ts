export type Category = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type Component = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  data: Record<string, unknown>;
  thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedPrompt = {
  id: string;
  name: string;
  description: string | null;
  prompt_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type GenerationStatus = "pending" | "generating" | "completed" | "failed";

export type ComponentUsed = {
  id: string;
  name: string;
  category_id: string;
};

export type Generation = {
  id: string;
  prompt_json: Record<string, unknown>;
  image_path: string | null;
  status: GenerationStatus;
  error_message: string | null;
  api_response_text: string | null;
  created_at: string;
  completed_at: string | null;
  reference_photo_ids: string[] | null;
  used_fallback: boolean;
  components_used: ComponentUsed[] | null;
};

export type QueueStatus = "queued" | "processing" | "completed" | "failed";

export type QueueItem = {
  id: string;
  prompt_json: Record<string, unknown>;
  status: QueueStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  reference_photo_ids: string[] | null;
};

export type SessionState = {
  id: string;
  builder_state: Record<string, unknown> | null;
  updated_at: string;
};

export type UsageStat = {
  id: number;
  event_type: string;
  component_id: string | null;
  created_at: string;
};

export type Favorite = {
  generation_id: string;
  created_at: string;
};

export type GenerationWithFavorite = Generation & {
  is_favorite: boolean;
  tags?: { id: number; tag: string; category: string | null }[];
  reference_photo_ids?: string[] | null;
  used_fallback?: boolean;
};

export type ReferencePhoto = {
  id: string;
  name: string;
  image_path: string;
  original_filename: string | null;
  mime_type: string;
  created_at: string;
};

export type ReferencePhotoWithComponents = ReferencePhoto & {
  component_ids: string[];
};

export type ComponentReferenceDefault = {
  component_id: string;
  reference_photo_id: string;
};

