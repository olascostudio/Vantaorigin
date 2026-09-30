-- Which letter each subscriber has already been sent.
--
-- One column, and it is what makes sending safe to repeat. A send goes to
-- every subscribed address that has not already been marked with this issue,
-- and marks each one as it goes. If the server restarts halfway through a
-- send, pressing send again picks up exactly where it stopped and nobody
-- receives the same letter twice.

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS last_issue_id uuid REFERENCES newsletter_issues (id) ON DELETE SET NULL;

-- The question asked once per batch while sending: who is still owed this one.
CREATE INDEX IF NOT EXISTS newsletter_subscribers_last_issue_idx
  ON newsletter_subscribers (status, last_issue_id);
