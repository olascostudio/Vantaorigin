-- A character deserves an address that says its name.
--
-- /character?id=cba0b9ab-e263-4193-bc97-bd152086268e tells a reader nothing
-- and gives a search engine nothing; /character/urokojin does both. The old
-- address keeps working, because it is in other people's posts, so this is an
-- addition, not a replacement.
--
-- The slug is settled when a character is made and then left alone, even if
-- the character is renamed later: an address that changes underneath the
-- people who shared it is worse than one that reads a little out of date.

ALTER TABLE characters ADD COLUMN IF NOT EXISTS slug text;

-- Existing work gets its name in the address, with the first piece of its id
-- appended only where two characters would otherwise collide.
WITH slugged AS (
  SELECT
    id,
    NULLIF(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '') AS base,
    row_number() OVER (
      PARTITION BY NULLIF(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '')
      ORDER BY created_at
    ) AS rank
  FROM characters
)
UPDATE characters c
SET slug = CASE
  WHEN s.base IS NULL THEN left(c.id::text, 8)
  WHEN s.rank = 1 THEN trim(both '-' from s.base)
  ELSE trim(both '-' from s.base) || '-' || left(c.id::text, 6)
END
FROM slugged s
WHERE c.id = s.id AND c.slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS characters_slug_key ON characters (slug);
