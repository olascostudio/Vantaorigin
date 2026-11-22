-- Fixing what a review found in 0032. That migration is already applied, so
-- the corrections come as their own file rather than as edits to it.

-- ---------------------------------------------------------------------------
-- 1. Deleting an account no longer fails
-- ---------------------------------------------------------------------------
--
-- 0032 added three references to users(id) with no ON DELETE action, in a
-- database where all twenty-five other references to that table are CASCADE
-- or SET NULL. DELETE /me (api/src/routes/auth.js) says "the database does
-- the cascade, so nothing is left orphaned" and then raised a foreign key
-- violation for any creator who had sold a single copy: a 500 on account
-- deletion, which is both a bug and a data-protection problem.
--
-- SET NULL rather than CASCADE, deliberately. The financial record has to
-- survive: an order that happened, happened, and the ledger has to balance
-- whatever anybody does with their account afterwards. What goes is the link
-- to the person, which is the part a deletion request is actually about.
-- Every line item already carries its own copy of the title, format and page
-- count, so the row stays readable with nobody attached to it.

ALTER TABLE order_items ALTER COLUMN creator_id DROP NOT NULL;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_creator_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_party_user_id_fkey;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_party_user_id_fkey
  FOREIGN KEY (party_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE defect_claims DROP CONSTRAINT IF EXISTS defect_claims_resolved_by_fkey;
ALTER TABLE defect_claims ADD CONSTRAINT defect_claims_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;

-- And a book that has been ordered could not be deleted at all, which made
-- 0032's own comment beside this column -- "copied so a payout survives a
-- book being deleted" -- describe something the schema forbade.

ALTER TABLE order_items ALTER COLUMN book_id DROP NOT NULL;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_book_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 2. The waitlist stops losing people
-- ---------------------------------------------------------------------------
--
-- The key was (email, country_code) while the table carries book_id, so a
-- reader waiting on a second creator's book in the same country was refused
-- as a duplicate. With the ON CONFLICT DO NOTHING any sane route would use,
-- that reads as success and silently drops the signup, and the second
-- creator never learns somebody was waiting. The whole point of the table is
-- per book: the embed is per book.
--
-- COALESCE because a NULL book_id would otherwise never collide with
-- itself, the same trick delivery_rates already uses for its region.

-- The constraint, not the index: 0032 declared it inline as UNIQUE, so the
-- index belongs to the constraint and cannot be dropped out from under it.
-- Dropping the constraint takes the index with it.
ALTER TABLE distribution_waitlist
  DROP CONSTRAINT IF EXISTS distribution_waitlist_email_country_code_key;
DROP INDEX IF EXISTS distribution_waitlist_email_country_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS distribution_waitlist_email_country_book_key
  ON distribution_waitlist(email, country_code, COALESCE(book_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- country_code here is the one in 0032 with no constraint of any kind, and a
-- typo in it means a reader is never told their country opened. It is not a
-- foreign key to countries on purpose: people wait for places we have not
-- added yet, which is exactly when the row is worth having. A shape check
-- catches the typo without demanding the country already exist.

ALTER TABLE distribution_waitlist
  DROP CONSTRAINT IF EXISTS distribution_waitlist_country_code_shape;
ALTER TABLE distribution_waitlist
  ADD CONSTRAINT distribution_waitlist_country_code_shape
  CHECK (country_code ~ '^[A-Z]{2}$');

-- ---------------------------------------------------------------------------
-- 3. The frozen money on an order cannot go negative
-- ---------------------------------------------------------------------------
--
-- Every other money column in 0032 is guarded: book_prices.retail_minor > 0,
-- order_items.unit_retail_minor >= 0, all of printer_costs. The orders table,
-- which is the frozen record of what somebody actually paid, was the one that
-- was not, and accepted a total of minus five hundred naira.
--
-- ledger_entries.amount_minor stays unguarded, and that is deliberate and
-- documented in 0032: a chargeback is a negative entry against the order.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_money_not_negative;
ALTER TABLE orders ADD CONSTRAINT orders_money_not_negative CHECK (
  retail_minor >= 0
  AND delivery_minor >= 0
  AND gateway_fee_minor >= 0
  AND platform_fee_minor >= 0
  AND printer_cost_minor >= 0
  AND total_minor >= 0
);

-- ---------------------------------------------------------------------------
-- 4. Still not enforced here: a page count that fits its format
-- ---------------------------------------------------------------------------
--
-- book_formats carries min_pages and max_pages and nothing checks them, so a
-- 5,000 page saddle-stitched comic goes in against a format that declares
-- itself 16 to 64 pages. A CHECK cannot read another table, and the obvious
-- answer, a plpgsql trigger, does not survive this project's migration
-- runner: it hands whole files to one multi-statement exec, and a dollar
-- quoted function body full of semicolons does not come back out of that in
-- one piece.
--
-- So this one belongs in the application, where a book is created, and that
-- route does not exist yet. Written down here so that whoever builds it
-- knows the database is not doing it for them.
