-- Add components_used JSON column to track which component presets were used in each generation
ALTER TABLE generations ADD COLUMN components_used JSON;
