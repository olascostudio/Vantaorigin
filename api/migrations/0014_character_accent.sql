-- The colour a character's own artwork is about.
--
-- Every card was trimmed in the same house colour, so twelve characters on a
-- page looked like twelve of the same thing. The edge now takes the artwork's
-- own accent, worked out from the cover when it is uploaded.
--
-- Null until a cover is set, and the pages fall back to the house pink, so a
-- character with no artwork still looks deliberate.

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS accent text;
