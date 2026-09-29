-- "Realm" meant two different things: the page a creator shares, and the
-- world a character belongs to. The first is now just their page; the second
-- is the only place the idea was needed, and it is a universe.
--
-- A rename keeps every value exactly as its creator typed it.

ALTER TABLE characters RENAME COLUMN realm TO universe;
