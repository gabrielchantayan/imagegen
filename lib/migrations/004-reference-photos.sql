-- Reference photos library
CREATE TABLE reference_photos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default references for components (characters, physical_traits)
CREATE TABLE component_reference_defaults (
  component_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  reference_photo_id TEXT NOT NULL REFERENCES reference_photos(id) ON DELETE CASCADE,
  PRIMARY KEY (component_id, reference_photo_id)
);

-- Track references used in generations
ALTER TABLE generations ADD COLUMN reference_photo_ids JSON;
ALTER TABLE generations ADD COLUMN used_fallback INTEGER DEFAULT 0;

-- Track references in queue items as well
ALTER TABLE generation_queue ADD COLUMN reference_photo_ids JSON;

CREATE INDEX idx_reference_photos_created ON reference_photos(created_at DESC);
