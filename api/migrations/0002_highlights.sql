-- Creator highlight posts: a title, some text and up to a few images.
-- The images live in storage; only their addresses are kept here.

CREATE TABLE IF NOT EXISTS highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS highlights_user_id_idx ON highlights (user_id);
CREATE INDEX IF NOT EXISTS highlights_created_at_idx ON highlights (created_at DESC);
