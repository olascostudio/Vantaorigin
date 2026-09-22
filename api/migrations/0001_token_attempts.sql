-- Wrong-guess counter, so a 4-digit code cannot be brute forced.
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
