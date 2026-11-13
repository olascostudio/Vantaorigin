-- A pause for somebody who has no account.
--
-- The quiet month was offered to everyone and only worked for people with
-- an account, because paused_until lived on email_preferences and that
-- table is keyed by user_id. A reader who found the link in a letter's
-- footer -- which is most of them -- pressed Pause, was told "Paused for 30
-- days", and kept getting every issue.
--
-- So the list carries its own. Not a duplicate of the other column: these
-- are two different records of consent with two different kinds of evidence
-- behind them, which is the same reason newsletter_subscribers still exists
-- at all.
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS paused_until timestamptz;
