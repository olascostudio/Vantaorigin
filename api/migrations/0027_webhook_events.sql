-- What the sender told us happened, and the guarantee that it only counts
-- once.
--
-- Webhooks are delivered at least once, not exactly once. A provider that
-- does not hear a prompt 200 -- a slow boot on a free plan is enough --
-- retries, and the same event arrives two, five, twenty times. Anything
-- that counts, appends or toggles has to be told apart from a replay.
--
-- So every event is written here first, keyed by the id the provider gave
-- it, with a unique index doing the deciding. An insert that conflicts is a
-- replay: the work is skipped and the answer is still 200, because a replay
-- is not an error and answering otherwise only buys another retry.
--
-- The database is what enforces this rather than a check-then-write in the
-- route, because two copies of the same retry can arrive at once and a
-- check-then-write has a gap between the two halves.
CREATE TABLE IF NOT EXISTS webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The provider's own id for this delivery. Unique, and that is the point.
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  -- Which message it was about, when the event names one.
  provider_message_id text,
  email text,
  -- Kept whole. When something here is wrong later, the question is always
  -- "what did they actually send", and a parsed summary cannot answer it.
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_id_key
  ON webhook_events (provider_event_id);

CREATE INDEX IF NOT EXISTS webhook_events_message_idx
  ON webhook_events (provider_message_id);

-- One row per address on the suppression list.
--
-- Nothing wrote to this table until now, so it is empty and this is free.
-- It will not be empty for long: every hard bounce and every complaint
-- lands here from now on, and the same address can bounce repeatedly.
-- Without this, a mailbox that bounces weekly grows a row a week and the
-- lookup that runs before every single send gets slower forever.
--
-- On lower(email) because that is exactly how suppressionFor() asks.
DELETE FROM suppression_list a
  USING suppression_list b
  WHERE a.ctid > b.ctid AND lower(a.email) = lower(b.email);

CREATE UNIQUE INDEX IF NOT EXISTS suppression_list_email_key
  ON suppression_list (lower(email));
