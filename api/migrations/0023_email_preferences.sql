-- What each person has agreed to hear about.
--
-- Until now there were two states on one table: a newsletter address was
-- subscribed or it was not. That cannot answer "may we send this person a
-- notice about their own account", because it was never a question about the
-- newsletter.
--
-- Keyed by user. Addresses with no account stay in newsletter_subscribers,
-- which keeps doing its job: not every subscriber is a user, and consent from
-- somebody who only ever typed an address into a footer form is a different
-- record with different evidence behind it.

CREATE TABLE IF NOT EXISTS email_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- pending      asked, not yet confirmed. Double opt-in starts here.
  -- subscribed   confirmed, and mail may be sent.
  -- unsubscribed they said stop.
  -- bounced      their address stopped working.
  -- complained   they pressed "spam".
  --
  -- Only 'subscribed' may receive marketing. The last two are set by the
  -- provider's webhooks rather than by anybody choosing them.
  marketing_status text NOT NULL DEFAULT 'pending' CHECK (
    marketing_status IN ('pending', 'subscribed', 'unsubscribed', 'bounced', 'complained')
  ),

  -- Product notifications, on by default and off one at a time. A separate
  -- column each rather than a json blob, so a query can ask "who wants to
  -- hear about comments" without reading every row.
  notify_battle_challenges boolean NOT NULL DEFAULT true,
  notify_affiliate_earnings boolean NOT NULL DEFAULT true,
  notify_comments boolean NOT NULL DEFAULT true,
  notify_character_activity boolean NOT NULL DEFAULT true,

  -- How the consent was given, which is the part that matters when somebody
  -- asks us to prove it. Source is 'signup', 'footer', 'google',
  -- 'legacy_import' or 'import'.
  consent_at timestamptz,
  consent_source text,
  consent_ip text,

  -- A quieter option than leaving: stop until this date, then resume. The
  -- alternative to a guilt screen is a real third choice.
  paused_until timestamptz,

  unsubscribed_at timestamptz,
  unsubscribe_reason text,

  -- Consent we inherited and cannot evidence. The newsletter table recorded
  -- that somebody was subscribed and never how or when, so every row carried
  -- across is marked for a human to decide about. See the README.
  needs_consent_review boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- "Everyone we may send the newsletter to", which is the question a send
-- asks before it starts.
CREATE INDEX IF NOT EXISTS email_preferences_marketing_idx
  ON email_preferences (marketing_status);

-- The rows a human still has to look at.
CREATE INDEX IF NOT EXISTS email_preferences_review_idx
  ON email_preferences (needs_consent_review)
  WHERE needs_consent_review = true;
