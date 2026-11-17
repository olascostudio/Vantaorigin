# Research notes on the Creator Studio MVP spec

Companion to `vantaorigin_creator_studio_mvp.md`. Written 17 November 2026.

Three strands: the repo as it actually is, the business ground under the idea,
and the payments and embed ground under the design. A fourth section covers
the UI reference question, which was asked separately.

Everything below says where it came from. Where a number could not be found,
it says so rather than estimating, because the spec's section 11 forbids
inventing printer costs, delivery rates and fees, and a confident wrong
number is worse than a gap.

---

## 1. The spec against the repo

Verified by reading the repo on 17 November 2026.

### Three things the spec states that are not true of this codebase

**"Node.js / Express REST API".** It is **Fastify 5**. There is no Express
anywhere in `api/`. This matters beyond pedantry: Fastify uses `preHandler`
hooks rather than middleware chains, `reply.code().send()`, and plugin
registration. Stripe's own webhook guidance is written as "route the webhook
before `express.json()`", which has no direct equivalent here.

**The frontend stack**, which the spec tells the reader to go and inspect:
React 18.3 + Vite 5.4 + Tailwind 3.4.13, hand-rolled, no component library.

**The brand block does not match the live site.**

| | Spec | `tailwind.config.js` |
|---|---|---|
| Background | `#080810` | `#0e0e0e` |
| Surface | `#13131F` | `#3c3c3c` |
| Pink | `#EB1C8D` | `#fc187b` |
| Purple | `#9333EA` | `#9333ea` ✓ |
| Text | `#F0EFF8` | white / neutral |
| Headings | Bebas Neue | Spicy Rice |
| Body | DM Sans | Comic Neue, Inter, Instrument Sans |

One value matches. Since the spec calls Distribution a brand of its own this
may be deliberate, but if it is meant to look like VantaOrigin then the
palette and both typefaces are wrong.

### Six things already built that the spec plans to build

The spec assumes less exists than does. This materially shrinks the work.

1. **Email classes.** Section 2 hedges with "if that system is not built
   yet". It is. `api/src/email-classes.js` exports exactly the four the spec
   names. Order mail is `TRANSACTIONAL`, which already means it bypasses
   marketing consent and unsubscribes.
2. **Webhook idempotency.** `webhook_events` exists with a unique index on
   the provider event id, already in use against a live provider's replays.
   The acceptance test "a paid webhook delivered twice only processes once"
   has its mechanism. See the correction in section 3 before reusing it.
3. **Signature verification.** `api/src/webhooks/signature.js`, HMAC with a
   timestamp tolerance, returning a reason rather than a bare false. See the
   correction in section 3: the shape transfers, the algorithm does not.
4. **Private storage with expiring links.** `@aws-sdk/client-s3` and
   `s3-request-presigner` are already dependencies and in use. The spec's
   "short-lived signed links, one per order" is configuration, not new work.
5. **Rate limiting and validation.** `@fastify/rate-limit` and `zod`, wired.
6. **Migrations.** Plain numbered `.sql` applied on boot, 32 of them. The
   first Distribution migration is `0032_`.

What genuinely does not exist: **any payment code at all**. No Stripe, no
Paystack, not a stub. The only grep hit was a decorative SVG named
`stripe-pink.svg`.

### Two risks the repo itself surfaces

**The 48 hour timer has nowhere reliable to run.** Render's free tier sleeps
the service after fifteen idle minutes. `api/src/keep-awake.js` exists
because GitHub's scheduled jobs throttled so hard they ran "not once in a
day" against a request for every fifteen minutes. An in-process
`setInterval` stops when the instance sleeps. A timer that decides when money
is released must be correct by catching up on boot, not by having fired on
time. Design it as "find every order whose window has passed", run on boot
and on an interval, and make it idempotent.

**Admin is an env var with no levels.** `isAdmin` in
`api/src/routes/admin.js:34` checks membership of `ADMIN_EMAILS`. The spec's
section 4 gives admin the power to release funds, resolve claims and download
print files. That is a different order of privilege from reading a signup
list, and wants a real role and an audit trail before it touches money.

---

## 2. The business ground

### The headline claim is directionally right and numerically unproven

The spec opens with "a $10 book can cost $24 to ship to Lagos".

The closest real data point found: a Nigerian publisher using Lulu-fulfilled
print-on-demand states books start at **$20.00 shipping for the first book up
to 1 lb**, with free shipping only to the UK, US, Canada and Australia, and
quotes **20 to 30 days** for standard delivery.
(publishing.olongoafrica.com/how-we-publish.html, undated.)

So a $10 book lands at roughly $30, not $24. The pitch is if anything
understated. But $24 itself is not a sourced figure and should not be printed
on a landing page as though it were. No DHL US-to-Lagos per-kg rate was
found.

### One part of the pitch is now wrong

The spec says local printing removes "international shipping, import tax or
tariffs". **Nigeria set a $300 de minimis threshold effective 8 September
2025**: goods at or under $300 clear duty-free without post-clearance
documents, including express courier and online purchases, limited to four
importations per individual per year.
(nairametrics.com/2025/09/07/nigeria-customs-to-allow-duty-free-imports-under-300-starting-sept-8/)

A single book is nowhere near $300. So for the reader this design serves,
**import tax and tariffs are already not the problem**. Shipping cost and a
20 to 30 day wait are the whole story. Claiming tariff relief invites someone
to check and find it is not true. The honest pitch is cost and speed.

### The number the whole model rests on could not be found

**No per-unit printing price in Nigeria was found, at quantity 1 or 5, for
either format.** What exists:

- BusinessDay (2026): a 150pp paperback all-in, including design and
  distribution, roughly **N1.4 to 1.5m for a 500-copy run**. A whole-job
  figure, not a print-only per-copy price.
- VisCorner (undated): 100pp softcover, 500 copies, **N200,000 to 500,000**,
  which works out around N400 to N1,000 per copy. An undated commercial blog.
- Full-colour comic printing in Nigeria: **nothing found**. For scale only,
  PrintNinja quotes a 32pp saddle-stitched comic from about **$2 to $4 a unit
  at 500 copies**, but that is offset with a 500-copy minimum, so it is not
  comparable to single-copy print-on-demand at all.
- Lagos printers found in directories with no published prices: Printfactory
  (Anthony), iPrints (Palmgrove), Printistence and Okeroyal (Ikeja).

For comparison, Amazon KDP's own published US formula
(kdp.amazon.com/en_US/help/topic/G201834340):

| Format | KDP printing cost |
|---|---|
| 6x9in B&W, 200pp | $3.40 |
| 6x9in B&W, 300pp | $4.60 |
| 6.625x10.25in colour, 32pp | $4.20 (large trim, premium colour band) |

Note the third row: at 6.625 x 10.25 inches the comic exceeds KDP's 9 inch
regular-trim limit, so it falls into large trim, and at 32 pages into the
premium-colour fixed band rather than any per-page rate. Standard colour
needs 72 pages minimum and does not apply.

**This is the critical path.** Section 6 builds a price floor out of printer
unit cost, and section 13 asks the founder for real quotes. Those quotes are
not a nice-to-have to collect later: without them there is no floor, and
without a floor the pricing engine in phase one has nothing to compute. Get
single-copy and five-copy quotes from two or three Lagos printers for all
three formats before any pricing code is written.

### Nobody is doing this in Africa yet

- **IngramSpark Global Connect**: print facilities in the US, UK, Australia
  and Sharjah, with South Africa and Singapore added as hubs (Shelf
  Awareness, Oct 2024). Ingram's own pages disagree on the market list. **No
  Nigeria.** Global distribution fee reported at 1.875% of list price, and
  Global Connect sales non-returnable (indicative, from a search snippet).
- **Amazon KDP** prints by marketplace, and .com.br, .in and .mx do not offer
  paperback distribution at all.
- **Lulu** claims a "global print network" with no locations published.
- **Africa-specific**: no operation confirmed doing distributed
  print-on-demand inside Nigeria. ITAN Global Publishing launched in Lagos
  September 2025 (self-publishing and distribution; POD not confirmed).
  Harmony Publishing states a West African POD hub as a goal, not a launch.
  Kiakiaprint is described as a POD startup, undated. StreetLib has had
  Nigeria portals since 2019.

That gap is the opportunity and also the warning: nobody has yet made these
unit economics work locally.

### The 10% platform fee sits at the top of the market

| Platform | Cut |
|---|---|
| Gumroad, direct | 10% + $0.50 |
| Gumroad, via Discover | 30% |
| Payhip, free tier | 5% |
| Payhip, paid tiers | 2%, or 0% on Pro |
| Lemon Squeezy | 5% + $0.50 |
| Shopify | no platform fee on Shopify Payments |

All exclude payment processor fees.

**Do not use Lemon Squeezy as a comparable**: its pricing page states it is no
longer accepting new sign-ups and **shuts down on 31 March 2027**.

The spec's 10% default therefore matches Gumroad's direct rate and is double
Payhip's free tier. On a $10 book, a $0.50 fixed fee is 5% of the price by
itself, so a 10% + fixed structure is a severe bite at this price point. This
is a founder decision, but it should be made knowing it is at the top of the
range.

### Domestic couriers

Every figure here is from undated commercial blogs. Confirm in each app
before putting any of it in a rate table.

| Courier | Reported |
|---|---|
| Kwik | N900 short distance, N3,800 farther (thecondia); N1,500 Lagos, N4,000 interstate (brands.ng 2025). Sources conflict |
| GIG Logistics | N3,000 to 5,000 Lagos-Lagos, 0-2kg often one band; N6,000 to 8,000 Lagos-Abuja |
| Sendbox | N1,015 flat, next-day; same-day only if booked before noon |
| NIPOST | 24h intra-city, 48h inter-city, 72h nationwide; domestic postage reportedly raised N50 to N250 (May 2025) |
| DHL domestic Nigeria | not found |

### Where the pain point is still unevidenced

No first-person creator complaints about print-on-demand shipping to Nigeria
were found. African Business (June 2025) reports that printing in India or
Turkey and shipping back is seen as more viable than importing, but says
nothing about individual creators. Before the pitch goes on a landing page,
get three creators to say the problem in their own words.

---

## 3. Payments, escrow and the embed

Research, not legal advice. Several Paystack pages returned 403 and were read
through the docs-v2 mirror or search snippets; those are marked.

### A correction to an earlier claim of mine

I previously said the existing `signature.js` transfers to Stripe as "a
rename and a key swap". **That is wrong.** The shape transfers; the specifics
do not.

| | Existing (Svix/Resend) | Stripe | Paystack |
|---|---|---|---|
| Header | `svix-signature` | `Stripe-Signature` | `x-paystack-signature` |
| Algorithm | HMAC-**SHA256** | HMAC-**SHA256** | HMAC-**SHA512** |
| Signed content | `id.timestamp.body` | `t` + raw body | raw body alone |
| Timestamp | yes, 300s tolerance | yes, in `t=` | **none** |

Paystack sends no timestamp, so there is nothing for a replay window to
check. The existing 300-second tolerance has no Paystack equivalent, and
replay protection there has to come from the event store alone. Three
providers, three algorithms: make the algorithm and the signed-content
construction per-provider rather than assuming one.

### Paystack publishes no webhook event ID

Our `webhook_events` table has a unique index on `provider_event_id`.
Paystack's documented payload carries only `event` and `data`. **Idempotency
for Paystack must key on event type plus a stable field in `data`**, such as
`data.reference` or `data.id`, synthesised into the event id column.

Paystack retries live-mode webhooks every 3 minutes for 4 attempts, then
hourly for 72 hours, so this is not theoretical.

Stripe is the opposite problem: it can emit **two Event objects for the same
underlying change**, so dedupe on the event id *and* on
`data.object.id` + `event.type`. Stripe retries for up to three days;
manual recovery via List Events reaches back 30 days.

One thing already solved: `api/src/routes/webhooks.js:79` registers a raw
`application/json` content-type parser. That is the Fastify answer to
Stripe's "route the webhook before `express.json()`", and it is already here.

### The escrow design is not what either provider documents

The spec takes payment into VantaOrigin's own account and pays creators and
printers manually, tracking the hold in a ledger.

- **Stripe** documents Connect for paying third-party sellers: destination
  charges, or separate charges and transfers. In both, refunds and chargebacks
  debit the **platform's** balance. Separate charges and transfers is the
  variant built for "transfer funds while the charge is pending" and can hold
  a transfer until the charge's funds are available.
- **Paystack** documents subaccounts and split payments, passed as a
  `subaccount` parameter on Initialize Transaction, percentage-based by
  default, with `bearer_type` controlling who pays the fee. **Nothing in
  Paystack's official documentation describes a holding period.** A
  manual-settlement path for subaccounts appears only in third-party
  material and is unverified.

Neither documents the route the spec takes. No explicit prohibition was
found, but the supported path is the other one. The spec's README flag is
correct that this needs review; the finding here is that it should be settled
**before** the build, not flagged during it, because it determines the whole
data model: a Connect design has no "platform holds the money" ledger at all.

**Stripe Connect account types have moved.** Standard, Express and Custom are
now described as legacy, with new platforms directed to the Accounts v2 API
or v1 with controller properties. Account type cannot be changed after
creation. Any Connect design written from older material will be built on the
wrong primitive.

### If anyone "improves" the hold into a manual capture, it breaks

The spec's ledger-only approach is right, and this is why. Stripe's
authorise-now-capture-later window:

- 7 days default for customer-initiated online card payments
- 5 days for Visa merchant-initiated (about 4 days 18 hours in practice)
- 30 days for eligible payments using extended authorisation
- `capture_by=target_delay` can delay to 30 days, but capture still happens
  before the authorisation expires

Printing in Lagos, delivering, and then waiting 48 hours will routinely
exceed 7 days. **A manual-capture hold cannot implement this spec.** Worth
writing into the spec explicitly so nobody reaches for it as the obvious
answer.

### Nigerian licensing is unresolved and matters

No Nigerian regulation specific to marketplace escrow was found. From
secondary sources, not the CBN's own text: a PSSP licence requires a
refundable escrow deposit to the CBN, with figures conflicting between N100m
and N250m, and one source stating a PSSP **cannot hold customer funds or
issue wallets**.

Holding a customer's money for a third party's benefit pending delivery is
the activity that brings a business inside payment-services licensing.
Whether this design needs a licence, or can operate as merchant of record, is
a question for Nigerian counsel and nothing found here answers it. This is
the single largest open risk in the spec and it is not a code problem.

### Paystack operational detail

- Local cards **1.5% + N100**, the N100 waived under N2,500, capped at N2,000
  per transaction. International cards **3.9% + N100**. (Paystack support
  pages; the pricing page itself returned 403.)
- Refunds: partial allowed, never above the original. Customers may wait **up
  to 10 business days** after processing. Whether fees are refunded is not
  stated.
- Settlement timing: official source not reached. Third parties say T+1.
  Unverified.

A 10 business day refund tail against a 48 hour claim window is worth
designing for: the claim is resolved long before the reader sees their money.

### The embed: `frame-ancestors` is sound, with four sharp edges

Allowlisting per creator is a reasonable approach. The pitfalls:

1. **Referer will not tell you the parent.** It is stripped by
   `Referrer-Policy: no-referrer` and by privacy browsers. Putting the book
   id in the checkout URL and looking up its creator's domains is more
   reliable, but that value is supplied by whoever opens the frame, so it is
   a claim, not proof.
2. **Caching.** A per-creator header on a URL-keyed cache can be served to
   the wrong creator. Either include the creator in the cache key or mark the
   response uncacheable.
3. **Subdomains are not covered** unless registered. Paddle's own rule is
   that approval does not extend to subdomains. Register each host.
4. **It stops framing, not what an allowed page does.** An approved domain
   that is later compromised, or has a subdomain takeover, keeps its embed
   rights. Nothing re-checks.

Also: `frame-ancestors` is ignored in a `<meta>` tag, it must be an HTTP
header, it does not fall back to `default-src`, and if absent framing is
simply allowed.

On `postMessage`: compare `event.origin` against an exact value, validate the
shape of `event.data` before using it, never send with `'*'` when the target
origin is known, and reply with `event.source.postMessage(..., event.origin)`.
The attacks to defend against are a creator page forging a "payment complete"
message, a hostile parent reading messages sent with `'*'`, and a redirect of
the target window before a message is sent. **Never mark an order paid from a
postMessage** — the spec already says this and it is the single most
important line in section 9.

### Prior art: Paddle is the closest, and has a control the spec lacks

Paddle's overlay is an iframe over the merchant page, and merchants must
register each domain under Checkout → Request Domain Approval. Live domains
start as **`pending_review`**; only approved domains serve checkouts. Sandbox
is auto-approved, localhost needs no approval, and there is an API to list,
inspect and delete approved domains.

The spec lets a creator register domains with no review step. Paddle's manual
review is what stops someone registering a domain they do not own and
embedding another creator's checkout. Worth adding, even if review is just
the founder clicking approve.

Snipcart injects a hidden div and script from its CDN with no iframe
mentioned. Gumroad's overlay internals could not be confirmed from official
docs. Lemon Squeezy's overlay docs returned 404 and it is shutting down
anyway.

### Verify before building

Paystack subaccount manual settlement, from Paystack directly. Paystack
settlement timing and current pricing. Stripe extended-authorisation
eligibility. CBN primary text on whether a PSSP may hold customer funds.

---

## 4. The UI reference question

### Recommendation: shadcn/ui copied in, with Radix-style dark scales

MIT, copy-in rather than a dependency, documented for plain Vite, no runtime
theme lock-in, and it is Tailwind, which is what this codebase already is.
You own every line, which matters for a codebase that is hand-rolled on
purpose. Roughly 3 to 5 days for 8 to 10 primitives (Dialog, Sheet, Button,
Input, Tabs, Toast) plus tokens.

**The real adoption cost, verified here:** this repo is on **Tailwind
3.4.13** and current shadcn defaults target Tailwind 4. Check what its CLI
emits before starting, or budget for the translation.

Runners-up: Radix Colors plus Radix Primitives without shadcn (MIT, the best
dark-scale thinking, 3 to 4 days because you write the wrappers). Catalyst as
a visual reference only, since it is paid and its licence text sits behind a
login and was not read.

Avoid HeroUI (Apache-2.0), daisyUI and Flowbite: their look is too strong for
a brand that is meant to be the creators', not the toolkit's.

### Licences: study these, do not paste them

**AGPL-3.0**, which means copying code into a service you serve over a
network triggers source disclosure: **Dub, Documenso, Twenty, Plane**. Design
patterns are not copyrightable; their component code is. Read them, do not
import them.

Permissive and safe to copy: shadcn/ui, Radix, Base UI, Mantine, Chakra,
daisyUI, Ark UI, Park UI, Medusa core (MIT); HeroUI, Tremor, Supabase
(Apache-2.0); Saleor dashboard (BSD-3).

Unresolved: Cal.com's root LICENSE read as MIT in this check, which conflicts
with its historical AGPL. Vendure's licence fetch 404'd. Confirm either
before relying on them.

### Worth studying for this product specifically

- **Cal.com and Dub** for public creator pages: one clear primary action, a
  restrained surface hierarchy.
- **Documenso** for multi-step flows with visible status, which is the
  checkout and the order tracker.
- **Medusa's Next.js starter** for cart and checkout structure. Note it is
  **archived** (last push April 2026), so read it, do not depend on it.

### Mobile checkout conventions

Common practice rather than a cited standard: below about 640px use a
full-screen or bottom sheet, not a centred dialog; keep the pay button sticky
in the thumb zone; inputs at 16px or larger to stop iOS zooming on focus; use
`inputMode` and `autocomplete`; keep the total visible while the form is
open; 44px hit area on close; lock background scroll; return focus to the
trigger on close. Never build your own card input: that field belongs inside
the provider's iframe.

### A contrast finding about the palette we already have

Measured against this site's actual background `#0e0e0e`, not the zinc-950
the general advice assumes:

| Colour | Ratio on `#0e0e0e` | |
|---|---|---|
| `subtext` `#acacac` | 8.50 | passes AA for body |
| `accent` `#bd7132` | 5.12 | passes |
| `primary` `#fc187b` | 5.11 | passes |
| spec pink `#eb1c8d` | 4.67 | passes, barely |
| **`secondary` `#9333ea`** | **3.59** | **fails AA for body text** |
| zinc-500 `#71717a` | 3.99 | fails |
| zinc-600 `#52525b` | 2.50 | fails everything |

**The purple is the problem.** `#9333ea` is the one colour the spec and the
live site agree on, and at 3.59:1 it is not usable for body text on our
background. It is fine for large text, for a filled button with white text on
it, and as a non-text boundary, where the bar is 3:1. It is not fine for a
sentence. Worth knowing before it becomes the Distribution brand colour.

On dark surfaces generally: carry elevation with lighter surface steps rather
than shadows, which barely register on near-black. Translucent hairlines like
`white/10` do not meet the 3:1 needed for a control's only visible boundary.

---

## Sources

Repo facts: read directly, 17 November 2026.

External, fetched or searched 17 to 18 November 2026. Fuller source lists sit
in the research transcripts; the load-bearing ones:

- KDP printing costs: kdp.amazon.com/en_US/help/topic/G201834340
- Nigeria $300 de minimis: nairametrics.com/2025/09/07/nigeria-customs-to-allow-duty-free-imports-under-300-starting-sept-8/
- POD shipping to Nigeria: publishing.olongoafrica.com/how-we-publish.html
- Ingram hubs: shelf-awareness.com/theshelf/2024-10-17/
- Stripe Connect: docs.stripe.com/connect/accounts, /connect/charges
- Stripe holds: docs.stripe.com/payments/place-a-hold-on-a-payment-method
- Stripe webhooks: docs.stripe.com/webhooks/signature, /events/manage-webhook-endpoints
- Paystack splits, refunds, webhooks: docs-v2.paystack.com
- Paystack fees: support.paystack.com/hc/en-us/articles/360009881920
- frame-ancestors, postMessage: developer.mozilla.org
- Paddle domains: developer.paddle.com/api-reference/checkout-domains
- Platform fees: gumroad.com/pricing, payhip.com/pricing, lemonsqueezy.com/pricing

### What is still missing

Nigerian per-unit print prices at quantity 1 and 5, for all three formats.
A second launch country with real quotes. A DHL US-to-Lagos rate. Any African
distributed-POD operation with confirmed charges. Creator testimonials in
their own words. Ko-fi's current fee (403). Paystack settlement timing from
Paystack. The CBN's own text on whether a PSSP may hold customer funds.
