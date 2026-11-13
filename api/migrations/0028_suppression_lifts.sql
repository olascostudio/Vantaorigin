-- Who decided to start writing to an address again, and why.
--
-- Lifting a suppression removes the row that recorded it, which destroys the
-- only evidence that it ever happened. That is the wrong way round: being on
-- that list means not even a password reset arrives, so being taken off it
-- is a decision about somebody's access to their own account, and it should
-- be answerable a year later.
--
-- A separate table rather than a flag on suppression_list, because
-- suppressionFor() runs before every single send and must stay a plain index
-- lookup with nothing to filter out. A separate table rather than a row in
-- email_log, because that table is a record of email attempts -- its CHECK
-- constraints say so -- and this is not one.
CREATE TABLE IF NOT EXISTS suppression_lifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  -- What it had been suppressed for, copied here before the row goes.
  was_reason text NOT NULL,
  was_note text NOT NULL DEFAULT '',
  -- When it was first suppressed, so the gap is readable.
  was_suppressed_at timestamptz,
  -- Who lifted it, by address rather than by id: admins are named in an
  -- environment setting, not by a row, and the question later is always
  -- "who was that".
  lifted_by text NOT NULL,
  note text NOT NULL,
  lifted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppression_lifts_email_idx
  ON suppression_lifts (lower(email), lifted_at DESC);
