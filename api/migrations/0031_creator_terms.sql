-- The rules a creator agrees to before they can see anybody's address.
--
-- The privacy policy lists what a creator may and may not do with the
-- emails they are given: write only about their own work, always include a
-- way out, never sell or pass the list on. Published, repeated on the
-- dashboard, and accepted by nobody. A page somebody never clicked is not
-- an agreement, and the one place it would matter is the one place it was
-- missing: there was no record that any particular creator had ever been
-- told.
--
-- Rather than a second table, terms_versions grows a kind. A creator terms
-- version is a version like any other, so user_terms_acceptance records
-- agreeing to it the same way it records agreeing to the ordinary terms,
-- with the same timestamp and the same address, and nothing else has to
-- learn a new shape.
ALTER TABLE terms_versions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'terms';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'terms_versions_kind_check'
  ) THEN
    ALTER TABLE terms_versions
      ADD CONSTRAINT terms_versions_kind_check CHECK (kind IN ('terms', 'creator_terms'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS terms_versions_kind_idx
  ON terms_versions (kind, effective_date DESC);

-- The first one, seeded here so the gate works the moment this deploys.
--
-- Without it the column exists, no creator terms version is current, and
-- the gate waves everybody through while looking like it is doing
-- something, which is worse than not having built it.
INSERT INTO terms_versions (version, kind, effective_date, summary, url)
VALUES (
  'creator-2026-11-15',
  'creator_terms',
  now(),
  'Write to subscribers only about your own work, always include a way to unsubscribe, act on unsubscribe requests promptly, and never sell, rent or pass on a subscriber list.',
  '/privacy'
)
ON CONFLICT (version) DO NOTHING;
