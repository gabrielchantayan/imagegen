-- Add safety_override column to generation_queue for image safety settings
ALTER TABLE generation_queue ADD COLUMN safety_override INTEGER NOT NULL DEFAULT 0;
