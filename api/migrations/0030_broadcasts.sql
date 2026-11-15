-- Something said to everybody at once.
--
-- The newsletter was the only thing we could send to a list, and it is the
-- one kind that people may refuse. A change to the terms is not: it governs
-- the account somebody holds, and telling them is an obligation that
-- pressing unsubscribe does not discharge. So a service announcement needs
-- its own place, its own rules about who it reaches, and a record of who
-- sent it.
--
-- newsletter_issues stays where it is. It could be folded into this table
-- as one kind of broadcast, and the plan said it would be, but moving a
-- table that is in use to make a diagram tidier is a migration that can
-- only lose letters. This sits beside it instead.
CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Only service announcements for now. The column exists so the next kind
  -- does not need a migration, and the check still refuses anything the
  -- sender does not understand.
  class text NOT NULL DEFAULT 'service_announcement' CHECK (
    class IN ('transactional', 'service_announcement', 'product_notification', 'marketing')
  ),

  -- Why this is being sent, from the fixed list. Not a label: it decides
  -- who it reaches. terms_change, privacy_change and security_notice go to
  -- people who have reported us as spam, because the duty to tell them
  -- survives the complaint. downtime and account_policy do not.
  reason_category text CHECK (
    reason_category IN ('terms_change', 'privacy_change', 'security_notice', 'downtime', 'account_policy')
  ),

  subject text NOT NULL DEFAULT '',
  -- The same shape a newsletter issue holds, so one editor and one renderer
  -- serve both.
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- A terms change says which version, so the banner can ask for that one.
  terms_version text,

  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent')),

  -- The audit, and the reason this table is not just a draft folder.
  -- Who pressed send, when, and how many people were named at the moment
  -- they were shown the number and agreed to it. Kept as an address as well
  -- as an id, because "who was that" still needs an answer after an account
  -- is gone.
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_by_email text NOT NULL DEFAULT '',
  sent_by_email text,
  audience_count integer,

  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  failures jsonb NOT NULL DEFAULT '[]'::jsonb,

  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS broadcasts_status_idx ON broadcasts (status, created_at DESC);

-- Every send still writes to email_log, marked with template
-- 'broadcast:<id>', because that table is where every send this product
-- makes is accounted for. This index is for asking it about one broadcast
-- later. It is not what the send loop uses to decide who is left: see the
-- note on broadcast_recipients below for why that would be a mistake.
CREATE INDEX IF NOT EXISTS email_log_template_idx ON email_log (template, email);

-- Who this one has already reached.
--
-- The send loop decided that by looking for rows that mailer.send() writes
-- into email_log. That made a loop's termination depend on a side effect of
-- another module, and that module swallows its own logging errors on
-- purpose, because a send that cannot be written down is still better than
-- no send. So a failure to log meant the same people were selected again on
-- every pass, for ever.
--
-- The loop owns its own progress now. One row per person per broadcast,
-- written by the sender after each attempt whatever the outcome, with the
-- unique index making a second attempt impossible rather than unlikely.
-- It doubles as the answer to "who actually got this", which email_log can
-- only give for the ones that were really sent.
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('sent', 'skipped', 'failed')),
  reason text,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS broadcast_recipients_pair_key
  ON broadcast_recipients (broadcast_id, user_id);
