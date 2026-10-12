-- Which part of a hero picture to show.
--
-- Character art is drawn portrait and a hero is drawn wide, so a band of the
-- picture is kept and the rest is cut. Where that band sits is a judgement
-- about one particular drawing: the face might be a third of the way down,
-- or halfway, and no rule gets it right for every piece.
--
-- So the person who made the picture says. This is that answer, as a
-- percentage from the top, and it is the same number CSS object-position
-- wants, so nothing has to be done to the file itself. The original is kept
-- whole and only the framing changes.

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS hero_focus integer NOT NULL DEFAULT 50;

ALTER TABLE blog_posts
  ADD CONSTRAINT blog_posts_hero_focus_check CHECK (hero_focus BETWEEN 0 AND 100);
