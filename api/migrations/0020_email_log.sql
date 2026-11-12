-- Every email that leaves the building, and what became of it.
--
-- Until now there was no way to answer "did that person get their code?"
-- except to ask them. Resend knows, but Resend is a dashboard somebody has to
-- open, and it cannot say which of our classes a message belonged to or which
-- user it was for.
--
-- A row is written for every attempt, including the ones that fail, because
-- the failures are the interesting half.

CREATE TABLE IF NOT EXISTS email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who it went to. The address is kept as well as the id: plenty of mail
  -- goes to people with no account, and a user can change their address
  -- after the fact, which would otherwise rewrite history.
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  email text NOT NULL,

  -- Which of the four kinds this was. Not null, and the check is here as
  -- well as in the code: the rule is worth keeping even if someone writes
  -- straight to the table.
  class text NOT NULL CHECK (
    class IN ('transactional', 'service_announcement', 'product_notification', 'marketing')
  ),

  -- Which letter it was, in words: "verification", "welcome", "issue".
  -- Loose on purpose, so adding a template needs no migration.
  template text NOT NULL DEFAULT '',

  -- What the provider called it, which is how a webhook finds this row later.
  provider_message_id text,

  status text NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'sent', 'delivered', 'bounced', 'complained', 'opened', 'clicked', 'failed', 'blocked')
  ),

  -- Why it failed, or why it was never attempted.
  error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Everything one person was sent, newest first: the question support asks.
CREATE INDEX IF NOT EXISTS email_log_user_idx ON email_log (user_id, created_at DESC);

-- By address too, because the people worth looking up often have no account.
CREATE INDEX IF NOT EXISTS email_log_email_idx ON email_log (lower(email), created_at DESC);

-- How a webhook finds the row it is about. Partial, because most rows have
-- no provider id: the console driver and the blocked ones never get one.
CREATE INDEX IF NOT EXISTS email_log_provider_idx ON email_log (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- "What went wrong this week", which wants the failures without reading the
-- successes to find them.
CREATE INDEX IF NOT EXISTS email_log_status_idx ON email_log (status, created_at DESC);
