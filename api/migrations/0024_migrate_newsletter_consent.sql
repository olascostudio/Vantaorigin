-- Carry what the newsletter table knows into email_preferences.
--
-- Every account gets a row, because a preference that does not exist is a
-- question nobody can answer: a send would have to guess, and guessing about
-- consent is the thing this table exists to stop.
--
-- Three cases.
--
-- Somebody on the newsletter list and subscribed becomes subscribed here, and
-- is flagged for review. The old table recorded that they were on the list
-- and never how they got there, so this is consent we inherited and cannot
-- evidence. GDPR wants the how and the when. Flagging it is not a fix; it is
-- a list for somebody to work through.
--
-- Somebody who had left stays left. That is the one piece of consent in the
-- old table we can be sure about, because leaving is an act.
--
-- An account that was never on the list at all starts pending. Not
-- subscribed: nobody has asked them, and defaulting to yes is how a platform
-- ends up sending marketing to people who never agreed to any.

INSERT INTO email_preferences (
  user_id,
  marketing_status,
  consent_at,
  consent_source,
  needs_consent_review,
  unsubscribed_at
)
SELECT
  u.id,
  CASE
    WHEN n.status = 'subscribed' THEN 'subscribed'
    WHEN n.status = 'unsubscribed' THEN 'unsubscribed'
    ELSE 'pending'
  END,
  -- The best available answer for "when", which is when the row was made.
  -- Not the same as when they agreed, and deliberately not pretending to be:
  -- that is what the review flag is for.
  CASE WHEN n.status = 'subscribed' THEN n.created_at ELSE NULL END,
  CASE WHEN n.id IS NOT NULL THEN 'legacy_import' ELSE NULL END,
  -- Only the inherited yes needs looking at. A no needs no evidence, and an
  -- account nobody ever asked has nothing to review.
  COALESCE(n.status = 'subscribed', false),
  n.unsubscribed_at
FROM users u
LEFT JOIN newsletter_subscribers n ON lower(n.email) = lower(u.email)
ON CONFLICT (user_id) DO NOTHING;
