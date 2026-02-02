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

export type Generation = {
  id: string;
  prompt_json: Record<string, unknown>;
  image_path: string | null;
  status: GenerationStatus;
  error_message: string | null;
  api_response_text: string | null;
  created_at: string;
  completed_at: string | null;
};

export type QueueStatus = "queued" | "processing" | "completed" | "failed";

export type QueueItem = {
  id: string;
  prompt_json: Record<string, unknown>;
  status: QueueStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
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
};
