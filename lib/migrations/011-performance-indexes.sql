-- Performance indexes for common queries
-- These indexes improve query performance for history, queue, and generation lookups

-- Generations table indexes
CREATE INDEX IF NOT EXISTS idx_generations_completed_at ON generations(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);

-- Generation queue indexes
CREATE INDEX IF NOT EXISTS idx_generation_queue_generation_id ON generation_queue(generation_id);
CREATE INDEX IF NOT EXISTS idx_generation_queue_status_created ON generation_queue(status, created_at);

-- Components table indexes
CREATE INDEX IF NOT EXISTS idx_components_category_id ON components(category_id);
CREATE INDEX IF NOT EXISTS idx_components_name ON components(name);

-- Generation tags indexes
CREATE INDEX IF NOT EXISTS idx_generation_tags_generation_id ON generation_tags(generation_id);
CREATE INDEX IF NOT EXISTS idx_generation_tags_tag ON generation_tags(tag);
CREATE INDEX IF NOT EXISTS idx_generation_tags_category ON generation_tags(category);

-- Favorites index
CREATE INDEX IF NOT EXISTS idx_favorites_generation_id ON favorites(generation_id);
