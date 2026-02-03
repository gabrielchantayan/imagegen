-- Store the pre-face-swap image when fallback is used
ALTER TABLE generations ADD COLUMN pre_swap_image_path TEXT;

-- Track when face swap attempt failed
ALTER TABLE generations ADD COLUMN face_swap_failed INTEGER DEFAULT 0;
