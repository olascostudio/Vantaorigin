-- The picture a link preview shows.
--
-- On the article and on the cards, the title is printed in large type right
-- beside the picture, so putting it on the picture as well says the same
-- thing twice and covers up the artwork. In a link preview there is no type
-- beside it: the picture is most of what somebody sees, and a wordless one
-- tells them nothing about what they are being sent.
--
-- So this is made on publishing, from the hero and the title, and kept here.
-- It is separate from og_image_url, which is the one an admin uploads
-- themselves: a picture somebody chose by hand is never replaced by one a
-- machine drew.

ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS share_image_url text;
