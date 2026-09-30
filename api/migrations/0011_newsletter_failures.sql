-- Which copies did not arrive, and why.
--
-- The count of failures was already kept, but a number on its own cannot be
-- acted on: knowing that three copies failed says nothing about whose. The
-- addresses and the reason given are kept here so a bad address can be fixed
-- or removed rather than quietly failing every time.
--
-- Bounded on the way in: a send that fails for everybody records the first
-- few hundred and stops, because the record of a disaster does not need to be
-- as long as the disaster.

ALTER TABLE newsletter_issues
  ADD COLUMN IF NOT EXISTS failures jsonb NOT NULL DEFAULT '[]'::jsonb;
