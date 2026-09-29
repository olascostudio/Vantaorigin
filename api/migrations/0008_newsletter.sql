-- Who hears from VantaOrigin.
--
-- Kept apart from accounts on purpose: somebody can follow the newsletter
-- without ever making an account, and somebody can leave the newsletter
-- without losing their account. The two are linked only by an address.
--
-- Every subscriber carries a token of their own, because an unsubscribe link
-- has to work from an email client with nobody signed in, and must not be
-- guessable from the address.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  -- subscribed | unsubscribed
  status text NOT NULL DEFAULT 'subscribed',
  -- where they came from: the footer, signing up, signing in with Google
  source text NOT NULL DEFAULT 'footer',
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);

-- One row per address, however many times it is offered.
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key
  ON newsletter_subscribers (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_token_key
  ON newsletter_subscribers (token);
CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx
  ON newsletter_subscribers (status);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
