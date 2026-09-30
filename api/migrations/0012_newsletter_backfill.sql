-- Everybody who already had an account, put on the list.
--
-- Every account made since the list existed joins it on the way in. The
-- accounts that came before it never had the chance, so they were the only
-- people on VantaOrigin who could not be written to. They join on the same
-- terms as everybody else, and leave the same way: one tap in any letter.
--
-- Runs once in effect as well as in name: the WHERE clause skips anybody
-- already on the list, so applying it twice adds nobody twice.

INSERT INTO newsletter_subscribers (email, status, source, token)
SELECT
  lower(u.email),
  'subscribed',
  'signup',
  -- Their own unsubscribe key, as unguessable as the ones handed out at
  -- sign-up. Two random uuids with the dashes taken out.
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM newsletter_subscribers n WHERE lower(n.email) = lower(u.email)
);
