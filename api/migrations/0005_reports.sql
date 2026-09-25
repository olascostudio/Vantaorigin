-- Reports against a creator, raised from a character page or a Realm.
--
-- The reporter is kept so the same person cannot pile on, but the report
-- outlives them: deleting your account leaves the report standing with no
-- name on it. A report about a creator who is gone is moot, so those go.

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES users (id) ON DELETE SET NULL,
  subject_user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters (id) ON DELETE SET NULL,
  reason text NOT NULL,
  message text NOT NULL DEFAULT '',
  -- open -> reviewed | dismissed, for whoever reads these later
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_subject_idx ON reports (subject_user_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_reporter_idx ON reports (reporter_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
