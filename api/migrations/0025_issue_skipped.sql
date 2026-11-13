-- How many people a letter was not sent to, and why that is not a failure.
--
-- A send counted every address it visited as sent. Now that eligibility is
-- asked per recipient, plenty are visited and rightly skipped: unsubscribed,
-- pending, paused, suppressed. Counting those as sent makes the number a
-- lie, and counting them as failed makes a clean send look broken.
--
-- Three numbers, because they are three different things: reached, refused
-- on purpose, and went wrong.
ALTER TABLE newsletter_issues
  ADD COLUMN IF NOT EXISTS skipped_count integer NOT NULL DEFAULT 0;
