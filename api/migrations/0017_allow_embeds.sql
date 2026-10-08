-- Whether a creator's published characters may be shown on other people's
-- sites.
--
-- A published character is already public, so this is not about secrecy. It
-- is about a creator deciding whether their work appears inside somebody
-- else's page, which is a different question from whether it can be read.
--
-- On by default: the point of the feature is that a card can travel, and a
-- setting nobody finds would stop it travelling at all.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS allow_embeds boolean NOT NULL DEFAULT true;
