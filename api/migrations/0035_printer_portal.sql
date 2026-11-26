-- Letting a print partner in, and only by invitation.
--
-- A printer is not a creator who happens to print: they are the other side
-- of the agreement, they see buyers' addresses because a parcel needs one,
-- and there will be very few of them. So there is no open sign-up. We send
-- one link to one printer, and that link is the only way an account becomes
-- a printer's account.
--
-- The token is stored as a sha256 hash, the way a session is, so the table
-- holding it cannot be turned into a set of working invitations.

CREATE TABLE IF NOT EXISTS printer_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id uuid NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  -- Who it was sent to, so an invite that goes astray can be found and
  -- withdrawn by the address rather than by its token, which we cannot read.
  email text NOT NULL,
  token_hash text NOT NULL,
  -- The version of the agreement shown at the time. If the wording changes,
  -- an acceptance of the old one does not say what the new one says.
  agreement_version text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  -- Withdrawn rather than deleted, so "who did we invite and what happened"
  -- stays answerable.
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS printer_invites_token_key ON printer_invites(token_hash);
CREATE INDEX IF NOT EXISTS printer_invites_printer_idx ON printer_invites(printer_id);

-- Who may act for a printer.
--
-- A join table rather than a column on users, because a print shop is a
-- place with staff: the owner who signs the agreement is often not the
-- person who reads the job queue on a Tuesday.
CREATE TABLE IF NOT EXISTS printer_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id uuid NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- What they agreed to, kept on the person rather than only on the invite,
  -- because the invite is consumed and the agreement is not.
  agreement_version text NOT NULL,
  agreed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS printer_users_pair_key ON printer_users(printer_id, user_id);
CREATE INDEX IF NOT EXISTS printer_users_user_idx ON printer_users(user_id);

-- Row level security, the way 0034 established: on, with no policies, so the
-- owning role works and every other role is refused. These two hold invite
-- tokens and the link between a person and a business, so they are not
-- tables to leave open on a REST endpoint.
ALTER TABLE printer_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_users ENABLE ROW LEVEL SECURITY;
