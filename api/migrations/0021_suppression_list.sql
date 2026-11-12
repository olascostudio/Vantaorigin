-- Addresses we have been told to stop writing to.
--
-- Three ways on to this list, and they do not mean the same thing:
--
--   hard_bounce  the address does not exist. Sending again is shouting at a
--                wall, and providers count it against the domain, which is
--                how a password reset stops arriving for everybody else.
--                Blocks every class, including transactional.
--
--   complaint    somebody pressed "spam". They still have an account and may
--                still need a password reset, so this blocks marketing and
--                leaves the rest.
--
--   manual       put here by hand, for a person who asked by email or a test
--                address that should never receive anything real.
--
-- Deliberately keyed by address rather than by user: a bounce is a fact
-- about a mailbox, and the mailbox may belong to nobody here.

CREATE TABLE IF NOT EXISTS suppression_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text NOT NULL CHECK (reason IN ('hard_bounce', 'complaint', 'manual')),

  -- Room for the provider's own words, or a sentence from whoever did it by
  -- hand, so the row can be read a year later.
  note text NOT NULL DEFAULT '',

  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per address, compared the way addresses are compared. The lookup
-- happens before every single send, so it has to be an index hit.
CREATE UNIQUE INDEX IF NOT EXISTS suppression_list_email_idx
  ON suppression_list (lower(email));
