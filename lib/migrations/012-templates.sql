-- Templates table for saving and reusing component combinations
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    component_ids TEXT NOT NULL, -- JSON array of component IDs
    shared_component_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of shared component IDs
    thumbnail_generation_id TEXT, -- Optional reference to a generation for preview
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (thumbnail_generation_id) REFERENCES generations(id) ON DELETE SET NULL
);

-- Index for listing templates
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);
