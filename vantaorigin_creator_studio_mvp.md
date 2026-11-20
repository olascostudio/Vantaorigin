# VantaOrigin Distribution: Creator Studio MVP Build Spec

For Claude Code. Read this whole file first, then follow "How to work" before writing any code.

## 1. What we are building

### Naming (use these consistently in code, UI text and docs)
- **VantaOrigin Distribution**: the overall service and brand. The local printing and delivery network, escrow, and later the bookshop portal.
- **Creator Studio**: the creator-facing tool inside Distribution. The dashboard, book uploads, regional pricing and the embed code. This MVP builds Creator Studio.
- **VantaOrigin Studios**: the separate commission art team. Never use "Studios" to mean books or distribution in this project.

### Summary
Creator Studio, part of VantaOrigin Distribution, is an embeddable checkout for indie creators who sell physical books and comics. A creator pastes one snippet on their own website. A reader clicks "Buy", a VantaOrigin checkout opens over the creator's page, the reader picks their country, and the price, currency, delivery cost and payment method adjust to that country. The order goes to a vetted local printer, so the book is printed and delivered locally with no international shipping, import tax or tariffs.

The problem: a $10 book can cost $24 to ship to Lagos. Printing locally removes that cost.

Core promises:
- The reader never leaves the creator's website.
- Prices are calculated on our server, never trusted from the browser.
- Payment is protected by escrow rules: a 48 hour inspection window after delivery.
- The creator sets regional prices and owns their work.

## 2. Existing context

- Backend: Node.js / Express REST API, PostgreSQL, hosted on Render.
- Frontend: hosted on Vercel. Inspect the repo and match the existing frontend stack and conventions.
- Domain: vantaorigin.com. Checkout will live at checkout.vantaorigin.com. The embed script will be served from a stable URL, for example cdn.vantaorigin.com/embed.js or checkout.vantaorigin.com/embed.js.
- Payments: Paystack for NGN, Stripe for USD, GBP and EUR.
- Email: there is a separate email system spec with message classes (transactional, service_announcement, product_notification, marketing). Order emails are transactional. If that system is not built yet, create a small provider-agnostic mail function with a "class" parameter so it can be swapped in later.
- Brand: dark UI, background #080810, surface #13131F, purple #9333EA, deep purple #6A28A8, blue #1976D2, pink #EB1C8D, text #F0EFF8. Fonts: Bebas Neue for headings, DM Sans for body, with web-safe fallbacks.

## 3. MVP scope

### In scope
1. Embed script and button: creator pastes a snippet, a "Buy" button opens the checkout pop-up.
2. Checkout pop-up (iframe from our domain): country picker, regional price, delivery cost, address form, payment, confirmation.
3. Paystack (NGN) and Stripe (USD, GBP, EUR) payments with verified webhooks.
4. Creator dashboard (minimal): add a book, upload files, set regional prices, register website domains, copy the snippet, view orders.
5. Reader order status page via a secure link in email.
6. Admin view for manual fulfillment: assign printer, change order status, add tracking info, handle defect claims.
7. 48 hour inspection window with a defect claim form (photo upload).
8. Waitlist capture for countries with no printer yet.
9. A demo store page that uses the embed, so we can test without any outside creator.

### Out of scope for now (do manually or stub)
- Automatic routing of files to printers (admin downloads files and sends them manually).
- Courier API integrations.
- Bookshop wholesale portal.
- Automatic payout splits and creator wallets (payouts are manual, but the ledger must record what each party is owed).
- Tax and VAT calculation (flag in README for legal review).
- Fan affiliate links.

### Launch countries
Start with Nigeria plus one other country, configured in the database, not hardcoded. All other countries show the waitlist message.

## 4. User flows

### Reader
1. Opens a creator's site, clicks "Buy" on a book.
2. Pop-up opens, shows the book cover, title and creator.
3. Picks a country. If served: sees the retail price in local currency, delivery cost, estimated delivery time and total. If not served: sees a message and an email box for the waitlist.
4. Enters name, email, phone and delivery address.
5. Pays with Paystack (NGN) or Stripe (other currencies).
6. Sees a confirmation and gets an email with a secure order status link.
7. Tracks status, and after delivery has 48 hours to raise a defect claim with photos.

### Creator
1. Signs in to the dashboard.
2. Adds a book: title, description, cover image, interior PDF, cover PDF, format (from the format list), page count.
3. Confirms a rights warranty checkbox: "I own the print rights for the territories I enable."
4. Sets a retail price per enabled country. The price must be at or above the computed floor for that country.
5. Registers the websites where the button may appear.
6. Copies the snippet, pastes it on their site.
7. Sees orders and what they are owed.

### Admin (the founder)
1. Sees new paid orders.
2. Assigns a printer, downloads the print files through a short-lived signed link, marks "in production".
3. Adds courier tracking, marks "shipped", then "delivered".
4. The system starts the 48 hour timer on "delivered".
5. Reviews defect claims, decides: reprint, partial refund, full refund, or rejected.
6. After the window passes with no claim, the order moves to "completed" and the ledger marks payouts as due.

## 5. Embed design

- Snippet example:
  ```html
  <script src="https://checkout.vantaorigin.com/embed.js" async></script>
  <button data-vanta-book="BOOK_PUBLIC_ID">Buy this book</button>
  ```
- embed.js finds elements with data-vanta-book, adds click handlers, and opens a full-screen modal containing an iframe pointing to the checkout app. On mobile the modal fills the screen.
- The checkout is a page on our domain, never code injected into the creator's page. Card details are entered only in Stripe or Paystack hosted fields.
- The embed sends only the book's public ID. It never sends a price or amount.
- Communication between the iframe and the parent uses postMessage with strict origin checks on both sides. Events: ready, opened, closed, payment_started, payment_succeeded, payment_failed. Creators can listen for payment_succeeded to show a thank-you.
- The checkout page must send a Content-Security-Policy frame-ancestors header that allows only the domains registered by that book's creator, plus our own domains. Unregistered sites get a blocked page with a clear message.
- Support a fallback hosted checkout link (checkout.vantaorigin.com/book/BOOK_PUBLIC_ID) for sites that block custom scripts.
- Keep embed.js small, dependency free, and cached. Readers are often on slow mobile connections.

## 6. Pricing and money model

- Store all money as integers in minor units (kobo, cents, pence). Never use floats.
- Price floor per book per country = printer unit cost + packaging + delivery cost + estimated gateway fee + platform fee. The creator's retail price must be at or above the floor.
- Platform fee is a configurable percentage of the retail price (default 10 percent, confirm with the founder).
- Printer costs, delivery costs and estimated delivery days are configuration tables keyed by printer, country and book format. They must be editable in the admin view. Seed them with clearly labeled PLACEHOLDER values and do not treat any seed number as real.
- Compute totals on the server at the moment of order creation and store a snapshot of every line (retail, delivery, fees, creator share, printer share, platform share) on the order.
- Keep a ledger table recording what is owed to the creator, printer, courier and platform per order, with status (held, due, paid). Payouts themselves are manual in the MVP.
- Format list for the MVP (configurable): 6x9 inch B&W paperback, 5.5x8.5 inch B&W paperback, 6.625x10.25 inch full color comic. Add a format field and restrict uploads to these.

## 7. Escrow rules (MVP version)

- Funds are treated as held by VantaOrigin until the order is completed. In the MVP this is tracked in the ledger and order status, not by a separate escrow account. Flag in the README that holding customer funds needs legal and payment provider review, and that Stripe Connect or Paystack subaccounts are the likely long-term route.
- Order statuses: pending_payment, paid, in_production, shipped, delivered, inspection_window, completed, disputed, refunded, cancelled.
- On "delivered", set inspection_ends_at = delivered_at + 48 hours. A scheduled job moves orders to "completed" when the window ends with no claim.
- A defect claim must be submitted within the window, with at least one photo and a short description. It moves the order to "disputed" and pauses the ledger.
- Admin resolves the claim and the ledger updates accordingly.

## 8. Data model (create migrations)

Create tables with sensible indexes and foreign keys. Suggested entities:
- creators (link to the existing users table), creator_domains (creator_id, domain, verified)
- books (public_id, creator_id, title, description, format, page_count, cover_image_url, status, rights_warranty_accepted_at)
- book_files (book_id, kind: interior or cover, storage_key, checksum, uploaded_at)
- countries (code, name, currency, enabled, payment_provider)
- printers (name, country, contact, notes)
- printer_costs (printer_id, format, unit_cost_minor, packaging_minor, notes)
- delivery_rates (country, region, cost_minor, est_days_min, est_days_max)
- book_prices (book_id, country, retail_minor, currency)
- orders (public_id, book_id, quantity, country, currency, totals snapshot, buyer_name, buyer_email, buyer_phone, address, status, provider, provider_reference, printer_id, tracking_info, delivered_at, inspection_ends_at, created_at)
- order_events (order_id, status, note, actor, created_at)
- defect_claims (order_id, description, photo_keys, status, resolution)
- ledger_entries (order_id, party, amount_minor, currency, status)
- waitlist (email, country, book_id, created_at)
- webhook_events (provider, event_id, payload hash, processed_at) for idempotency

## 9. Security requirements

- Print files are stored privately in S3 compatible storage. Never public URLs. Admin and printers get short-lived signed links, one per order.
- Webhooks from Stripe and Paystack: verify signatures, store event IDs, process each event once.
- Mark an order paid only from a verified webhook, never because the pop-up closed or the browser said so.
- Rate limit public endpoints (order creation, waitlist, claim submission). Validate and sanitize all input.
- Order status links use long random tokens, not sequential IDs.
- Secrets live in environment variables only, never in the repo or the frontend.
- Admin and creator routes need authentication and role checks. Creators can only see their own books and orders.
- Escape all user content shown in the admin view and emails.

## 10. UI notes

- Mobile first. Most readers will be on phones with limited data.
- The pop-up should feel fast: cover image and price visible immediately, minimal steps, clear total before payment.
- Show escrow reassurance in one short line: "Your payment is protected. You have 48 hours after delivery to report a problem."
- Show the delivery estimate before payment.
- Use the brand colors and fonts above, with design tokens (colors, spacing, fonts) defined in one place so a designer can restyle later without a rewrite.
- Clear empty, loading and error states for every screen.

## 11. How to work

1. Inspect the existing repo first: backend structure, database setup, frontend stack, auth, current payment code, environment handling. Report what you found.
2. Write a short plan: file structure, migrations list, and build order. Wait for my approval before large changes.
3. Build in phases, in this order: data model and config tables, pricing engine with tests, creator dashboard and book upload, checkout API, payments and webhooks, embed script and pop-up, order status page and emails, admin fulfillment view, demo store page.
4. After each phase, run tests and show me a summary of what works.
5. Ask me when something is ambiguous instead of guessing. Do not invent printer costs, delivery rates or fees.

## 12. Acceptance tests

- A price sent from the browser is ignored. The server always recalculates.
- A book cannot be priced below its computed floor.
- Checkout opens only on registered creator domains and is blocked elsewhere.
- A paid webhook delivered twice only processes once.
- An order is marked paid only after a verified webhook.
- Choosing an unserved country shows the waitlist and creates no order.
- Marking "delivered" starts the 48 hour timer, and the order completes automatically after the window with no claim.
- A defect claim inside the window pauses the ledger and moves the order to "disputed".
- Print file links expire, and files are not publicly reachable.
- The demo store page can complete a test order end to end in Stripe and Paystack test modes.

## 13. What has to exist before development starts

Rewritten 20 November 2026 after the research in
`vantaorigin_distribution_research.md` and after mocking every screen.
Each item carries a recommended answer where one can be reasoned to. A
recommendation is not a decision: it is what I would pick and why, so that
disagreeing is quick.

### 13.1 Blockers, in order

**1. Real printer quotes. Nothing else matters until these exist.**
Phase 1 builds the data model and then the pricing engine, and the engine
computes a floor from printer unit cost. No Nigerian per-unit price could be
found publicly, at any quantity, for any of the three formats. A pricing
engine cannot be tested against a number nobody has.

Needed: **single-copy and five-copy prices, all three formats, two or three
Lagos printers.** Five-copy is not optional any more because 15.1's tiers
need a band rather than one value. Same again for the second country.

**2. Decide how the money is held, before the ledger is built.**
This spec takes payment into VantaOrigin's own account and pays out by hand.
Stripe documents Connect for paying third-party sellers; Paystack documents
subaccounts and splits. Neither documents what this spec describes. It is
not a detail that can be retrofitted: a Connect design has **no "platform
holds the money" ledger at all**, so section 8's ledger may be the wrong
shape entirely.

*Recommended, and it sidesteps the wait:* build the ledger as a record of
**what each party is owed**, and keep **how it is settled** behind one
module. Obligations are the same under either answer; only the settlement
differs. That way the legal answer, whenever it lands, changes one file
rather than the schema.

**3. The licensing question, which is not a code problem.**
Whether holding a customer's money pending delivery makes this a payment
service in Nigeria. One secondary source says a PSSP may not hold customer
funds at all. No Nigerian regulation specific to marketplace escrow was
found. This needs counsel, it has a lead time, and it is the largest open
risk in the project. Start it the same week as the printer quotes; the two
run in parallel and everything else waits on them.

**4. Real delivery rates**, in the shape 15.1 needs: a cost per parcel plus
a cost per extra copy, not a flat rate multiplied by quantity. Every courier
figure in the research came from undated blogs and must be confirmed in each
app.

**5. Accounts and a test subject:** Paystack and Stripe test accounts, and
one demo book with print-ready files.

### 13.2 Decisions only the founder can make

**Platform fee.** 10% is exactly Gumroad's direct rate and the top of the
market; Payhip's free tier is 5%.
*Recommended:* **10%, but with no fixed per-order fee**, and revisit it the
moment real printer costs land. The worked example in the mockups has the
creator keeping about 45% of what the reader pays once printing, delivery
and card fees come out. If real printing costs more than the placeholder,
that share collapses and 10% stops being defensible. The fee is easy to
lower later and very hard to raise.

**Second launch country.**
*Recommended:* **the United Kingdom.** Printers are findable there (Ingram,
Lulu and Blurb all have UK capacity), Stripe covers GBP, there is a real
diaspora audience for Nigerian creators, and it exercises the two-currency,
two-provider path, which is the architectural risk worth proving early.
Ghana and Kenya are closer to the mission but the research found neither a
printer nor a quote, so they belong on the waitlist first.

**Brand.**
*Recommended:* **not a separate brand.** The sampled original identity is
navy `#111628` with purple `#6a28a8`, and the right split is by surface, not
by brand: the dark identity for public and marketing pages, warm paper for
anything anybody works in. Creator Studio is a working surface, so it is
warm paper and purple. See `vantaorigin_design_system.md`.

**Checkout and email wording**, including the escrow and refund text from
the T&C.

## 14. Legal and compliance flags (list these in the README)

- Creator warranty of print rights per territory, stored at listing time. Add this to the creator terms.
- Printer agreement covering reprint liability for defects reported within 48 hours.
- Holding customer funds and split payments: needs review with the payment providers and a lawyer.
- Tax and VAT handling per country.
- Privacy: collecting names, addresses and phone numbers means a privacy policy and data retention rules.

## 15. Decided later, written down so it is not lost

Added 17 November 2026, after mocking the flows. Three related ideas about
using quantity and geography to cut the delivery cost, which is the real
cost. Keep them in this order: the first is nearly free, the second is a
config row, the third is blocked on something that does not exist yet.

### 15.1 Quantity tiers (near term, do it with the pricing engine)

Let a reader buy more than one copy, with the per-unit price falling. It
raises the order value, and several copies travel in one parcel, so per-unit
delivery drops too.

This is already half-specified: §8's `orders` table carries `quantity`, and
§13 asks printers for "real single copy and 5 copy quotes". What is missing
is in the pricing engine and two tables.

- `printer_costs` needs a quantity band, not one `unit_cost_minor`. Either a
  `min_quantity` column with a row per band, or an explicit
  `unit_cost_5plus_minor`. Bands are better: printers quote in steps.
- `delivery_rates` needs to know that copies share a parcel. At minimum a
  per-parcel cost plus a per-extra-copy cost, rather than a flat per-order
  rate multiplied by quantity.
- The floor in §6 becomes a floor **per quantity**, computed at the quantity
  being bought. A price valid at one copy may be below the floor at five if
  the tiering is wrong, so the check runs per tier, not once.
- The checkout gains a quantity selector that shows the per-unit price
  falling. The creator's pricing screen gains the tier columns.

**Do not frame this as "buy to resell."** The moment a buyer is a reseller,
§4's territory rights warranty and the creator terms are in play, and the
tax position changes. Sell five copies cheaper and let the buyer do what they
like with them.

### 15.2 Pickup points (next, mostly a config row)

Instead of delivering to a door, deliver to a collection point near the
reader. Last-mile to a door is the expensive part; GIG and Sendbox both run
collection points in Nigeria.

- Needs no inventory at all: still printed on demand, just dropped somewhere
  cheaper.
- Fits the existing model exactly: it is a `delivery_rates` row with a
  different cost and a location, plus a picker in the checkout.
- Helps most where addresses are hardest, which is also where door delivery
  costs most.

The checkout change is a choice between "to my address" and "to a pickup
point", and the order needs to carry which point was chosen.

### 15.3 A map of bookshops holding stock (blocked, and here is why)

The idea: at checkout, look for a bookshop near the reader that has the book,
and offer collection instead.

**It cannot work while the model is print on demand, because there is no
stock anywhere.** A book does not exist until somebody orders it. For a shop
to have a copy, somebody must print copies in advance and place them, which
is exactly the inventory risk print on demand removes. It also cannot
bootstrap: shops stock what sells, and nothing sells yet.

There is a second problem even once stock exists. A wholesale copy earns the
creator less than a direct sale, so offering it inside the checkout steers a
reader who was about to pay full price into the cheaper channel. If this
happens at all it belongs on the book's public page, not in the checkout.

So: this is the bookshop wholesale portal from §3's out-of-scope list, not a
checkout feature. Revisit when a shop asks to stock something, which is the
signal that demand exists. Until then, 15.2 gets most of the benefit with
none of the risk.

## 16. Gaps found while mocking, with recommended answers

None of these are in the spec above. The first two can cost real money.

**Chargebacks.** A reader disputes a card payment on a book already printed
and delivered. On both providers that debits **your** balance, and the
printer has already been paid for work they really did.
*Recommended:* the platform absorbs it in the MVP, and the ledger records a
chargeback entry against the order so it is visible rather than a mystery
shortfall. The natural protection is the gap between an order completing and
a payout going out: batch payouts, and net disputes off before paying.

**A parcel that comes back.** Wrong address, nobody in, courier gives up. In
Lagos this will happen most weeks.
*Recommended:* a `returned` status. The reader chooses redelivery, paying
delivery again, or a refund less delivery. The printer is paid either way,
because they did the work. Needs a line in the T&C.

**Cancelling before production.** Someone orders at 9pm and changes their
mind at 9:05.
*Recommended:* allow it while the order is `paid` with no printer assigned,
full refund, no questions. Once it is `in_production`, no: paper has been
used.

**Nowhere to send a creator's money.** The payouts mockup has a row that
cannot be paid because nothing in the product ever asks for an account.
*Recommended:* collect it when they **set their first price**, not at
signup. That is the moment money becomes real to them, and it keeps signup
short.

**One order can only hold one book.** The embed is per-book and the checkout
buys that one book, so a reader wanting two pays delivery twice and checks
out twice.
*Recommended:* ship single-book for the MVP, but give orders **line items
from day one** rather than a `book_id` and a `quantity` on the order itself.
Retrofitting a basket into a flat order is painful, and 15.1's tiers already
push in the same direction.

**The emails.** Seven: receipt, in production, shipped, delivered with the
48 hour window explained, claim received, claim resolved, payout sent. All
transactional, and the class system for them already exists in the repo, so
this is writing rather than engineering.

**What a creator will ask for in week one:** how many people opened the
checkout and did not buy. That number tells them the price is wrong.
*Recommended:* one counter per book, incremented when the checkout opens.
Cheap now, impossible to backfill later.

**A printer has no screen of their own.** Admin downloads the files and
sends them on by hand, which is fine at three orders a day and your whole
evening at thirty.
*Recommended:* invite-only accounts, the agreement read and accepted before
an account exists, and a per-job page showing the files, the specs and the
address. Mocked already. A printer never sees what anybody paid.

