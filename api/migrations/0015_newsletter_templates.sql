-- Letters kept as a starting point.
--
-- Somebody who has already designed an email, in code or by arranging
-- blocks until it reads right, should not have to build it again every
-- month. A template is a letter's shape without its moment: the subject line
-- it usually carries, and the blocks it is made of.

CREATE TABLE IF NOT EXISTS newsletter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  preheader text NOT NULL DEFAULT '',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  author_id uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_templates_created_idx
  ON newsletter_templates (created_at DESC);

ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
