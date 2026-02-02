-- Categories Table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Components Table
CREATE TABLE components (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  data JSON NOT NULL,
  thumbnail_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_components_category ON components(category_id);
CREATE INDEX idx_components_updated ON components(updated_at DESC);

-- Saved Prompts Table
CREATE TABLE saved_prompts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prompt_json JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_prompts_updated ON saved_prompts(updated_at DESC);

-- Generations Table
CREATE TABLE generations (
  id TEXT PRIMARY KEY,
  prompt_json JSON NOT NULL,
  image_path TEXT,
  status TEXT NOT NULL CHECK(status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  api_response_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE INDEX idx_generations_status ON generations(status);
CREATE INDEX idx_generations_created ON generations(created_at DESC);

-- Favorites Table
CREATE TABLE favorites (
  generation_id TEXT PRIMARY KEY REFERENCES generations(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generation Queue Table
CREATE TABLE generation_queue (
  id TEXT PRIMARY KEY,
  prompt_json JSON NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued', 'processing', 'completed', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME
);

CREATE INDEX idx_queue_status ON generation_queue(status, created_at);

-- Session State Table
CREATE TABLE session_state (
  id TEXT PRIMARY KEY DEFAULT 'current',
  builder_state JSON,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usage Stats Table
CREATE TABLE usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  component_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_stats_type ON usage_stats(event_type, created_at);
CREATE INDEX idx_usage_stats_component ON usage_stats(component_id);
