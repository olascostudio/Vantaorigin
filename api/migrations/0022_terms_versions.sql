-- The terms, as versions somebody can be shown to have accepted.
--
-- A page of text on the site records what the terms say. It does not record
-- that any particular person ever read them, which is the thing that matters
-- when the terms change: the ones who agreed to the old wording have not
-- agreed to the new one, and nothing currently knows the difference.

CREATE TABLE IF NOT EXISTS terms_versions (
  -- The version is the key. There is one set of terms at a time and the
  -- version names it: "2026-11-12", "2.0", whatever is written on the page.
  version text PRIMARY KEY,

  -- When it starts applying, which is not always when the row was written:
  -- a change can be published with notice before it takes effect.
  effective_date timestamptz NOT NULL,

  -- What changed, in a sentence, for the banner and the announcement. Not
  -- the terms themselves, which live on the page.
  summary text NOT NULL DEFAULT '',

  -- Where to read the whole thing.
  url text NOT NULL DEFAULT '/terms',

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Who has accepted what. One row per person per version, so the history
-- survives: a later version does not erase that they accepted the earlier.
CREATE TABLE IF NOT EXISTS user_terms_acceptance (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version text NOT NULL REFERENCES terms_versions(version) ON DELETE CASCADE,
  accepted_at timestamptz NOT NULL DEFAULT now(),

  -- Worth keeping for the same reason consent is: being able to say how and
  -- from where, not only that.
  accepted_ip text,

  PRIMARY KEY (user_id, version)
);

CREATE INDEX IF NOT EXISTS user_terms_acceptance_user_idx
  ON user_terms_acceptance (user_id, accepted_at DESC);
