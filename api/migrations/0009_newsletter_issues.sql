-- The letters themselves, from first draft to sent.
--
-- The writing is kept as blocks rather than as finished HTML: a heading, a
-- paragraph, a picture, a button. The email is built from them at the moment
-- it is sent, which means every issue is poured into the same shell as every
-- other VantaOrigin email -- banner, socials, and the unsubscribe line that
-- must never be missing -- and a change to that shell reaches letters that
-- were written before it.
--
-- A sent issue is left alone afterwards: what went out cannot be edited, so
-- the record of what people were sent stays true.

CREATE TABLE IF NOT EXISTS newsletter_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL DEFAULT '',
  -- The line an inbox shows beside the subject.
  preheader text NOT NULL DEFAULT '',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- draft | sending | sent
  status text NOT NULL DEFAULT 'draft',
  -- Who wrote it, kept so the history says more than a date. The letter
  -- outlives the account: losing an author does not lose the record.
  author_id uuid REFERENCES users (id) ON DELETE SET NULL,
  sent_at timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS newsletter_issues_status_idx ON newsletter_issues (status);
CREATE INDEX IF NOT EXISTS newsletter_issues_created_idx ON newsletter_issues (created_at DESC);

ALTER TABLE newsletter_issues ENABLE ROW LEVEL SECURITY;
