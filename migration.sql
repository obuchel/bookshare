-- Run in Turso dashboard (app.turso.tech) → your db → Shell

-- Add new columns to users (if not already done)
ALTER TABLE users ADD COLUMN county TEXT;
ALTER TABLE users ADD COLUMN province TEXT;
ALTER TABLE users ADD COLUMN country TEXT;

-- Fix books table too (remove neighborhood, it only needs city)
-- SQLite cannot drop columns older than 3.35, so we just leave the 
-- neighborhood column in books as unused rather than risk breaking things.
-- New books will no longer populate it.
