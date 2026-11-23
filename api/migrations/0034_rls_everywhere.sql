-- Row level security on every table that has been added since 0004 turned it
-- on, which is all twenty-eight of them.
--
-- This started as a fix for the seventeen distribution tables and then the
-- check found eleven more: broadcasts and their recipients, creator
-- subscriptions, the email log, email preferences, the suppression list and
-- its lifts, feature interest, terms versions and acceptances, and webhook
-- events. Four of those hold email addresses. The pattern is not that one
-- migration forgot, it is that 0004 enabled it once and nothing since has
-- inherited it.
--
-- 0004 said why:
-- Supabase publishes the public schema through its own REST endpoint, so a
-- table without row level security there can in principle be read with the
-- project's anonymous key, and that key is meant to be public. The API
-- connects as the table owner, and Postgres does not apply row security to
-- the owner, so this costs us nothing and refuses every other role.
--
-- 0032 added seventeen tables and none of them got it. Two of those matter
-- more than the rest: payout_accounts holds bank account numbers, and orders
-- holds a buyer's name, email and address. Those are the two worth being
-- careful with even if nothing is currently pointed at that endpoint,
-- because "nothing currently points at it" is a fact about today.
--
-- No policies, same as 0004: the API is the owner and everything else is
-- refused outright. A later change that connects as a different role will
-- need policies written for it, deliberately.

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_settings ENABLE ROW LEVEL SECURITY;

-- Added between 0004 and 0032, and missed the same way.
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression_lifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_terms_acceptance ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
