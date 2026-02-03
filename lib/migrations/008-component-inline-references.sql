-- Add inline_references column to components table (JSON array of image paths)
ALTER TABLE components ADD COLUMN inline_references TEXT DEFAULT '[]';

-- Add inline_reference_paths to generation_queue and generations tables
ALTER TABLE generation_queue ADD COLUMN inline_reference_paths TEXT;
ALTER TABLE generations ADD COLUMN inline_reference_paths TEXT;
