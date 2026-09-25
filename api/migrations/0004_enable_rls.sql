-- Row level security on every table, with no policies.
--
-- Supabase publishes the public schema through its own REST endpoint, so a
-- table without row level security there can in principle be read with the
-- project's anonymous key. Nothing in VantaOrigin uses that endpoint: the
-- browser talks to our API, and only our API talks to the database.
--
-- Postgres does not apply row security to the role that owns a table, and the
-- API connects as the owner, so turning it on changes nothing for us while
-- refusing every other role. If a later change ever connects as a different
-- role, that role will need policies of its own.

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
