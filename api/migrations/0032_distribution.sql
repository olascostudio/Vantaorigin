-- VantaOrigin Distribution: the tables a book has to pass through.
--
-- Three decisions run through all of this and are worth stating once rather
-- than repeating at every column.
--
-- MONEY IS ALWAYS AN INTEGER IN MINOR UNITS. Kobo, pence, cents. Never a
-- float, never a decimal, never a formatted string. Columns are named
-- _minor so that a wrong unit is visible at the call site. bigint rather
-- than integer because a ledger sums, and an overflow in money is not a bug
-- anybody finds quickly.
--
-- THE LEDGER RECORDS WHAT IS OWED, NOT HOW IT IS SETTLED. Whether
-- VantaOrigin holds the money in its own account and pays out by hand, or
-- uses Stripe Connect and Paystack subaccounts, the obligations are
-- identical: this printer is owed this much for this order. Only the
-- settlement differs, and that belongs in one module rather than in the
-- shape of these tables. The legal question about holding customer funds in
-- Nigeria is open, and this is what stops the answer forcing a migration.
--
-- EVERY COST HERE IS A PLACEHOLDER UNTIL A PRINTER QUOTES US. No Nigerian
-- per-unit price could be found at any quantity for any format. The seeds
-- at the bottom say so in the data itself, so nobody mistakes them for
-- something somebody measured.

-- ---------------------------------------------------------------------------
-- Where we can sell, and who prints there
-- ---------------------------------------------------------------------------

-- Launch countries live here rather than in code, so opening one is a row
-- and not a deploy. A country that is not enabled shows the waitlist.
CREATE TABLE IF NOT EXISTS countries (
  code text PRIMARY KEY,
  name text NOT NULL,
  currency text NOT NULL,
  -- Which provider takes the money there. Paystack for NGN, Stripe for the
  -- rest, and the column exists so a third is a row rather than a branch.
  payment_provider text NOT NULL CHECK (payment_provider IN ('paystack', 'stripe')),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The formats a book can be. Configurable, because a printer who can only
-- do one trim size is a row here and not an argument in code.
CREATE TABLE IF NOT EXISTS book_formats (
  slug text PRIMARY KEY,
  name text NOT NULL,
  -- Trim, in thousandths of an inch, so no floats anywhere near a print job.
  trim_width_mil integer NOT NULL,
  trim_height_mil integer NOT NULL,
  colour text NOT NULL CHECK (colour IN ('bw', 'colour')),
  binding text NOT NULL CHECK (binding IN ('perfect', 'saddle')),
  min_pages integer NOT NULL,
  max_pages integer NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_code text NOT NULL REFERENCES countries(code),
  contact_email text,
  contact_phone text,
  notes text,
  -- A printer stops receiving jobs without being deleted, because their
  -- past orders still have to be answerable.
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS printers_country_idx ON printers(country_code);

-- What a printer charges, in bands.
--
-- Not one unit_cost per format: printers quote in steps, and the whole point
-- of letting somebody buy five copies is that the fifth is cheaper than the
-- first. A band applies from min_quantity upwards until the next band
-- starts, so a row at 1 and a row at 5 is the common case.
CREATE TABLE IF NOT EXISTS printer_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id uuid NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  format_slug text NOT NULL REFERENCES book_formats(slug),

  min_quantity integer NOT NULL DEFAULT 1 CHECK (min_quantity >= 1),

  -- Per copy at this band, plus what it costs to pack the parcel once.
  unit_cost_minor bigint NOT NULL CHECK (unit_cost_minor >= 0),
  packaging_minor bigint NOT NULL DEFAULT 0 CHECK (packaging_minor >= 0),

  -- A page-count component, for formats priced per page. Zero where the
  -- printer quotes a flat rate.
  per_page_minor bigint NOT NULL DEFAULT 0 CHECK (per_page_minor >= 0),

  -- True until a real quote replaces it. The pricing engine refuses to
  -- publish a price built on a placeholder, which is the only thing
  -- standing between a seeded guess and a creator selling at a loss.
  is_placeholder boolean NOT NULL DEFAULT true,
  quoted_at timestamptz,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (printer_id, format_slug, min_quantity)
);

CREATE INDEX IF NOT EXISTS printer_costs_lookup_idx
  ON printer_costs(format_slug, min_quantity);

-- Delivery, priced per parcel and not per copy.
--
-- Five copies travel in one box. A flat rate multiplied by quantity would
-- charge a reader five deliveries for one parcel and make the five-copy
-- price worse than buying five times, which is the opposite of the point.
CREATE TABLE IF NOT EXISTS delivery_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES countries(code),
  -- Null means "anywhere else in this country"; a named region overrides it.
  region text,

  parcel_cost_minor bigint NOT NULL CHECK (parcel_cost_minor >= 0),
  extra_copy_minor bigint NOT NULL DEFAULT 0 CHECK (extra_copy_minor >= 0),

  est_days_min integer NOT NULL CHECK (est_days_min >= 0),
  est_days_max integer NOT NULL CHECK (est_days_max >= est_days_min),

  courier text,
  is_placeholder boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS delivery_rates_country_region_key
  ON delivery_rates(country_code, COALESCE(region, ''));

-- ---------------------------------------------------------------------------
-- What a creator lists
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What the embed carries. Short, opaque, and the only identifier that ever
  -- leaves our side, so the row id stays private.
  public_id text NOT NULL UNIQUE,
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  format_slug text NOT NULL REFERENCES book_formats(slug),
  page_count integer NOT NULL CHECK (page_count > 0),
  cover_image_url text,

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'on_sale', 'paused')),

  -- Recorded with a timestamp because it is the evidence, not a checkbox.
  -- A creator warranting print rights they do not hold is the thing that
  -- gets everybody sued, so when they said it is as important as that they
  -- said it.
  rights_warranty_accepted_at timestamptz,
  rights_warranty_version text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS books_creator_idx ON books(creator_id);

-- The print files. Never public: the storage key is resolved to a signed
-- link that expires, one per job, when a printer is actually given the work.
CREATE TABLE IF NOT EXISTS book_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('interior', 'cover')),
  storage_key text NOT NULL,
  byte_size bigint,
  checksum text,
  page_count integer,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, kind)
);

-- What the creator charges, per country. The floor is computed, never
-- stored: a stored floor goes stale the moment a cost changes, and a stale
-- floor is how a book ends up selling below cost.
CREATE TABLE IF NOT EXISTS book_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES countries(code),
  retail_minor bigint NOT NULL CHECK (retail_minor > 0),
  currency text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, country_code)
);

-- Where a creator's buy button may appear.
--
-- Approval is not automatic. Paddle, which is the closest prior art, holds
-- new domains at pending_review and does not extend approval to subdomains,
-- and both of those are the control that stops somebody registering a
-- domain they do not own.
CREATE TABLE IF NOT EXISTS creator_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- One host exactly. shop.example.com is not example.com.
  domain text NOT NULL,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain)
);

CREATE INDEX IF NOT EXISTS creator_domains_creator_idx ON creator_domains(creator_id);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Shown to the reader and carried in the status link. Long and random
  -- rather than sequential: anybody with the link can see the order.
  public_id text NOT NULL UNIQUE,
  status_token text NOT NULL UNIQUE,

  country_code text NOT NULL REFERENCES countries(code),
  currency text NOT NULL,

  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  region text,

  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment', 'paid', 'in_production', 'shipped', 'delivered',
    'inspection_window', 'completed', 'disputed', 'returned', 'refunded',
    'cancelled'
  )),

  -- The totals as computed at the moment the order was made, frozen. A cost
  -- table edited next week must never change what somebody already paid or
  -- what anybody is owed for it.
  retail_minor bigint NOT NULL DEFAULT 0,
  delivery_minor bigint NOT NULL DEFAULT 0,
  gateway_fee_minor bigint NOT NULL DEFAULT 0,
  platform_fee_minor bigint NOT NULL DEFAULT 0,
  printer_cost_minor bigint NOT NULL DEFAULT 0,
  total_minor bigint NOT NULL DEFAULT 0,

  payment_provider text CHECK (payment_provider IN ('paystack', 'stripe')),
  provider_reference text,

  printer_id uuid REFERENCES printers(id),
  courier text,
  tracking_number text,

  delivered_at timestamptz,
  -- Set when the order is marked delivered. A scheduled job completes the
  -- order once this passes with no claim, which is the only thing in this
  -- system that moves on its own.
  inspection_ends_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_buyer_email_idx ON orders(buyer_email);
CREATE INDEX IF NOT EXISTS orders_printer_idx ON orders(printer_id);
-- What the completion job scans: orders whose window has passed. Partial,
-- because it only ever asks about one status.
CREATE INDEX IF NOT EXISTS orders_inspection_due_idx
  ON orders(inspection_ends_at)
  WHERE status = 'inspection_window';

-- One row per book in an order.
--
-- The MVP sells one book at a time, so this will hold a single row for a
-- while. It exists anyway because a reader who wants two of a creator's
-- books currently pays delivery twice, and retrofitting a basket into an
-- order that has book_id and quantity on it means rewriting every total,
-- every ledger entry and every email that was ever built on top of it.
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id),

  quantity integer NOT NULL CHECK (quantity > 0),

  -- Frozen alongside the order, and the book's own row may change after.
  unit_retail_minor bigint NOT NULL CHECK (unit_retail_minor >= 0),
  unit_printer_cost_minor bigint NOT NULL DEFAULT 0,
  title text NOT NULL,
  format_slug text NOT NULL,
  page_count integer NOT NULL,

  -- Whose work this is, copied so a payout survives a book being deleted.
  creator_id uuid NOT NULL REFERENCES users(id),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_creator_idx ON order_items(creator_id);

-- Everything that happened to an order, in order. The admin screens read
-- this, and so does anybody asking why a thing went the way it did.
CREATE TABLE IF NOT EXISTS order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  -- Who did it: an admin's user id, 'system' for the scheduled job, or the
  -- provider's name for a webhook.
  actor text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events(order_id, created_at);

CREATE TABLE IF NOT EXISTS defect_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  description text NOT NULL,
  -- Storage keys, never public urls.
  photo_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reprint', 'partial_refund', 'full_refund', 'rejected')),
  resolution_note text,
  refund_minor bigint,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS defect_claims_order_idx ON defect_claims(order_id);
CREATE INDEX IF NOT EXISTS defect_claims_open_idx ON defect_claims(status) WHERE status = 'open';

-- ---------------------------------------------------------------------------
-- The ledger
-- ---------------------------------------------------------------------------

-- What each party is owed for each order, and nothing about how it gets to
-- them. See the note at the top: this shape is the same whether we hold the
-- money ourselves or settle through Connect, which is what keeps the open
-- legal question out of the schema.
--
-- An amount may be negative. A chargeback or a refund is an entry against
-- the order rather than an edit to the entry it reverses, so the history
-- stays readable and a payout can be netted before it goes out.
CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  party text NOT NULL CHECK (party IN ('creator', 'printer', 'courier', 'platform')),
  -- Whichever of these the party is. Both null for courier and platform.
  party_user_id uuid REFERENCES users(id),
  party_printer_id uuid REFERENCES printers(id),

  kind text NOT NULL DEFAULT 'earning'
    CHECK (kind IN ('earning', 'refund', 'chargeback', 'adjustment')),

  amount_minor bigint NOT NULL,
  currency text NOT NULL,

  status text NOT NULL DEFAULT 'held'
    CHECK (status IN ('held', 'due', 'paid', 'void')),

  -- Filled when somebody actually moves the money, by hand or otherwise.
  settled_at timestamptz,
  settlement_note text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ledger_order_idx ON ledger_entries(order_id);
CREATE INDEX IF NOT EXISTS ledger_owed_idx ON ledger_entries(party, status);
CREATE INDEX IF NOT EXISTS ledger_creator_idx ON ledger_entries(party_user_id, status);

-- Where a creator's money goes. Asked for when they set their first price,
-- not at signup: that is the moment it becomes real to them.
CREATE TABLE IF NOT EXISTS payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES countries(code),
  -- Never a raw account number in a log or an email. This column is the
  -- only place it lives.
  account_name text NOT NULL,
  account_number text NOT NULL,
  bank_name text NOT NULL,
  bank_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ---------------------------------------------------------------------------
-- People we could not sell to yet
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS distribution_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  country_code text NOT NULL,
  book_id uuid REFERENCES books(id) ON DELETE SET NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, country_code)
);

CREATE INDEX IF NOT EXISTS distribution_waitlist_country_idx
  ON distribution_waitlist(country_code);

-- ---------------------------------------------------------------------------
-- Settings that are not per-country
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS distribution_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Seeds
--
-- The formats are real: they are the three the spec names. Everything with
-- a cost on it is marked is_placeholder and says so in its notes, because
-- no printer has quoted us and a number that looks like a quote is worse
-- than no number at all.
-- ---------------------------------------------------------------------------

INSERT INTO book_formats (slug, name, trim_width_mil, trim_height_mil, colour, binding, min_pages, max_pages, position)
VALUES
  ('pb-6x9-bw',        '6 x 9in B&W paperback',             6000, 9000,  'bw',     'perfect', 24, 828, 0),
  ('pb-55x85-bw',      '5.5 x 8.5in B&W paperback',         5500, 8500,  'bw',     'perfect', 24, 828, 1),
  ('comic-6625x1025',  '6.625 x 10.25in full colour comic', 6625, 10250, 'colour', 'saddle',  16, 64,  2)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO countries (code, name, currency, payment_provider, enabled)
VALUES
  ('NG', 'Nigeria',        'NGN', 'paystack', false),
  ('GB', 'United Kingdom', 'GBP', 'stripe',   false)
ON CONFLICT (code) DO NOTHING;

-- Deliberately disabled. Enabling a country is a decision taken when a real
-- printer with a real quote exists there, not a side effect of running a
-- migration.

INSERT INTO distribution_settings (key, value)
VALUES
  ('platform_fee_bps', '1000'),
  ('inspection_window_hours', '48')
ON CONFLICT (key) DO NOTHING;

-- Basis points, not a percentage, for the same reason money is in minor
-- units: 1000 bps is 10% and cannot be a rounding argument.
