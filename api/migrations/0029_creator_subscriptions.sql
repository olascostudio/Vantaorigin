-- Subscribing to a creator.
--
-- Separate from newsletter_subscribers on purpose, and the separation is the
-- whole point rather than tidiness. That table is the platform's own list:
-- VantaOrigin writes to those people, and everything built around it -- the
-- suppression list, the classes, the preferences screen -- exists so that we
-- can be answerable for what we send.
--
-- This is a different promise. Somebody subscribing here is agreeing that
-- their address goes to one named creator, who writes to them with their own
-- tools. Mixing the two would mean one unsubscribe silently covering both,
-- or a creator's list quietly becoming ours.
--
-- The address itself is not copied here. It lives on the user row, so
-- somebody who changes their email changes it everywhere at once, and there
-- is one answer to "what address did they give us" rather than two that can
-- drift apart.
CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  status text NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),

  -- When they agreed, and from where. This is the evidence, and it is the
  -- only answer to "show me that they consented to their address going to
  -- this creator". Recorded per creator, because agreeing to one is not
  -- agreeing to another.
  consent_at timestamptz NOT NULL DEFAULT now(),
  consent_ip text,

  unsubscribed_at timestamptz,

  -- Carried in the unsubscribe link, which has to work from an inbox with
  -- nobody signed in and must not be guessable from the address.
  token text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per pair. Somebody who leaves and comes back updates this row
-- rather than growing a second one, so the history of a decision stays in
-- one place and a count is a count of people.
CREATE UNIQUE INDEX IF NOT EXISTS creator_subscriptions_pair_key
  ON creator_subscriptions (creator_id, subscriber_id);

CREATE UNIQUE INDEX IF NOT EXISTS creator_subscriptions_token_key
  ON creator_subscriptions (token);

-- The dashboard's own question: who is subscribed to me, newest first.
CREATE INDEX IF NOT EXISTS creator_subscriptions_creator_idx
  ON creator_subscriptions (creator_id, status, created_at DESC);

-- And the subscriber's: which creators am I subscribed to.
CREATE INDEX IF NOT EXISTS creator_subscriptions_subscriber_idx
  ON creator_subscriptions (subscriber_id, status);

-- Somebody asking to be told when a locked feature opens.
--
-- Not a subscription and not consent to anything: it is a note that one
-- person pressed one button, so that whoever builds the thing knows how many
-- were waiting and can write to them about that one thing.
CREATE TABLE IF NOT EXISTS feature_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS feature_interest_pair_key
  ON feature_interest (user_id, feature);
