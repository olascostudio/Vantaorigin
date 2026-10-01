-- The backdrop a project keeps.
--
-- Setting the background behind a character's story is a design decision
-- about the whole project, not about one character: somebody who picks a
-- stormy sky for the first character of a comic wants it behind the next
-- twelve too, and was having to choose it again every time.
--
-- So the choice is remembered on the project, and every character made in it
-- afterwards starts with it. Only afterwards -- characters that already exist
-- keep whatever they were given, because changing a backdrop should never
-- reach back and repaint work that is finished.

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS banner_url text;
