-- One row per person per character, so a like cannot be counted twice and
-- can be taken back. The count is read from here rather than kept on the
-- character, which would drift.

CREATE TABLE IF NOT EXISTS character_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS character_likes_character_user_key
  ON character_likes (character_id, user_id);
CREATE INDEX IF NOT EXISTS character_likes_character_id_idx ON character_likes (character_id);
