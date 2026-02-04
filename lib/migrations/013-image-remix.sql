-- Parent reference for version lineage
ALTER TABLE generations ADD COLUMN parent_id TEXT REFERENCES generations(id) ON DELETE SET NULL;

-- The edit instructions used for this remix
ALTER TABLE generations ADD COLUMN edit_instructions TEXT;

-- Index for efficient lineage queries
CREATE INDEX idx_generations_parent ON generations(parent_id);

-- Queue table needs remix fields
ALTER TABLE generation_queue ADD COLUMN remix_source_id TEXT REFERENCES generations(id);
ALTER TABLE generation_queue ADD COLUMN edit_instructions TEXT;
