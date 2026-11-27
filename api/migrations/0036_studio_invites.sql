-- Letting a creator into Creator Studio, by invitation.
--
-- Distribution is built and not open. Opening it to everybody at once means
-- the first real printed book is sold by whoever happens to find the page,
-- against costs nobody has checked, to a buyer nobody warned. So it opens
-- one creator at a time, the same way a print partner does: we send a link
-- to somebody we have spoken to.
--
-- Deliberately not the same table as printer_invites. The two look alike
-- today and are not the same thing: a printer accepts an agreement about
-- money and addresses and gets a job queue, while a creator gets early
-- access to a feature. Folding them together now would mean one table with
-- two meanings and a column saying which, and the first time one of them
-- needs a field the other does not, it comes apart.

CREATE TABLE IF NOT EXISTS studio_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who we sent it to, so an invite can be found and withdrawn by address
  -- rather than by its token, which we cannot read.
  email text NOT NULL,
  -- A line for our own benefit: which comic, which conversation.
  note text,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS studio_invites_token_key ON studio_invites(token_hash);

-- Who may use Creator Studio.
--
-- An admin always can, and that is checked in code rather than by a row
-- here: an admin is defined by ADMIN_EMAILS and putting a second definition
-- in the database would let the two disagree.
CREATE TABLE IF NOT EXISTS studio_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_email text,
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS studio_members_user_key ON studio_members(user_id);

ALTER TABLE studio_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_members ENABLE ROW LEVEL SECURITY;
