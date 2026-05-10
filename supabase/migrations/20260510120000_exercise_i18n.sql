ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS name_ru        TEXT,
  ADD COLUMN IF NOT EXISTS instructions_en TEXT,
  ADD COLUMN IF NOT EXISTS instructions_ru TEXT,
  ADD COLUMN IF NOT EXISTS image_urls      TEXT[] DEFAULT '{}';
