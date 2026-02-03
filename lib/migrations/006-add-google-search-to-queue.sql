-- Add google_search column to generation_queue for Google Search grounding
ALTER TABLE generation_queue ADD COLUMN google_search INTEGER NOT NULL DEFAULT 0;
