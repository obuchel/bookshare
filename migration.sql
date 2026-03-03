-- Migration: replace city+neighborhood with city+county+province+country
-- Run these one at a time in the Turso shell: turso db shell <db-name>

ALTER TABLE users ADD COLUMN county TEXT;
ALTER TABLE users ADD COLUMN province TEXT;
ALTER TABLE users ADD COLUMN country TEXT;

-- Copy existing neighborhood data into county (closest equivalent)
UPDATE users SET county = neighborhood WHERE neighborhood IS NOT NULL;

-- Drop old neighborhood column (requires Turso/SQLite >= 3.35)
ALTER TABLE users DROP COLUMN neighborhood;
