# VantaOrigin API

Fastify + PostgreSQL + Drizzle, in Docker. Built so the whole thing can move to
a VPS later by deploying the same container and restoring the same database.

## Run it locally (free, no accounts needed)

Install Docker Desktop, then from the repo root:

```bash
docker compose up
```

That starts PostgreSQL and the API on <http://localhost:8080>, applies the
migrations, and reloads when you edit a file. Check it with:

```bash
curl http://localhost:8080/health
```

Locally, uploads stay in the API's memory and emails print to the terminal, so
no Cloudflare or Resend account is needed while building.

Without Docker: run any PostgreSQL, copy `.env.example` to `.env`, point
`DATABASE_URL` at it, then `npm install && npm run migrate && npm run dev`.

## Layout

| Path | What it is |
| --- | --- |
| `src/config.js` | Every environment value, validated on boot. The only place that reads `process.env` |
| `src/db/schema.js` | Tables, in plain PostgreSQL |
| `migrations/*.sql` | Applied in order, tracked in `schema_migrations`. Plain SQL, so any PostgreSQL can be rebuilt from them |
| `src/auth/auth.js` | Argon2id passwords, session tokens (hashed at rest), one-time email links |
| `src/adapters/storage.js` | `memory` locally, `s3` for Cloudflare R2 or MinIO |
| `src/adapters/email.js` | `console` locally, `resend` in production |
| `src/routes/` | The HTTP API |

## Endpoints

```
POST   /auth/signup            email, password, username
POST   /auth/signin
POST   /auth/signout
GET    /auth/me
POST   /auth/verify-email      token
POST   /auth/forgot-password   email
POST   /auth/reset-password    token, password
PATCH  /me                     profile settings

GET    /categories             POST /categories        DELETE /categories/:id
GET    /characters             POST /characters
PATCH  /characters/:id         DELETE /characters/:id
POST   /characters/:id/assets  DELETE /assets/:id
POST   /uploads?folder=covers  multipart image, returns { url }

GET    /public/characters      public characters for Discover
GET    /public/characters/:id
```

Sessions are an httpOnly cookie. The browser never sees the database.

## Going live (when you're ready)

1. Create a PostgreSQL database (Render, Neon, anywhere) and set `DATABASE_URL`.
2. Deploy `api/` as a Docker service (Render reads the `Dockerfile`).
3. Create a Cloudflare R2 bucket, set `STORAGE_DRIVER=s3` plus the `S3_*` values.
4. Add a Resend key and set `EMAIL_DRIVER=resend`.
5. Point `APP_ORIGIN` at the deployed front end.

## Moving to a VPS

1. Install Docker on the VPS and copy `docker-compose.yml` across.
2. `pg_dump` the managed database, `pg_restore` into the VPS container.
3. Change `DATABASE_URL` to the local container.
4. Point DNS at the VPS; put Caddy or nginx in front for TLS.
5. R2 can stay exactly as it is — or sync it into MinIO and change `S3_ENDPOINT`.

No application code changes at any step: the image, the schema and the
adapters are the same in all three places.

## Email: classes, suppression, and one exception for legal review

Every send declares one of four classes, and `mailer.send()` throws without
one. There is no other door, so a new route or a script cannot introduce an
email nobody can account for. Every attempt is written to `email_log`,
including the ones that never leave.

`suppression_list` holds addresses we have been told to stop writing to:

| Reason | What still goes |
|---|---|
| `hard_bounce` | nothing at all |
| `complaint` | transactional, and the three announcements below |
| `manual` | transactional, and the three announcements below |

### The exception, which needs legal review

**A `service_announcement` whose `reason_category` is `terms_change`,
`privacy_change` or `security_notice` is delivered to people who have
reported us as spam or been suppressed by hand.** It is sent under the
transactional identity so that it arrives. `downtime` and `account_policy`
are not in the exception and stay blocked for those people.

The reasoning is that a change to the terms or the privacy policy is the
document governing somebody's account, and a security notice may be the only
warning they get that something happened to it. Telling them is an obligation
that pressing "spam" does not discharge. A maintenance window is not of that
order.

What a lawyer needs to settle:

1. **Whether the obligation to notify really does override a complaint**, in
   each of CAN-SPAM, GDPR and Nigeria's NDPA. This code assumes it does for
   those three categories. That assumption is the whole exception.
2. **Whether `security_notice` belongs with the other two.** A breach
   notification is usually mandatory; "we have added two-factor auth" is not,
   and both would fit under that category as the code is written. The
   category is a fixed list, not a judgement about the wording inside it.
3. **Whether sending on the transactional identity is acceptable** when the
   recipient has complained. It protects delivery of the announcement; it
   also puts complaint risk on the stream that carries password resets.
4. **Whether a hard bounce should also be excepted.** It is not: an address
   that does not exist cannot be told anything, and insisting damages
   delivery for everybody else. If notification is a duty regardless of
   deliverability, that needs another route, such as a notice in the app.
5. **Whether the in-app banner is sufficient notice on its own** for somebody
   we cannot email at all. The banner shows until they accept, and their
   acceptance is recorded with a timestamp and an IP in
   `user_terms_acceptance`.

The exception lives in one function, `blockedBySuppression()` in
`src/email-classes.js`, and the set is the `UNAVOIDABLE` array above it.
Changing which categories are excepted is changing that array.

### What somebody can change, and where

`/newsletter/preferences` on the site, reachable two ways: signed in, or with
the token from any email's footer. The token matters — the person who most
wants that screen is holding an email and no patience, and asking them to
remember a password first is how an unsubscribe becomes a spam complaint.

Three ways out, each one press, none of which argues:

| Choice | What happens |
|---|---|
| Pause 30 days | `paused_until` set; still subscribed; resumes on its own |
| Fewer emails | every product-notification category off; newsletter stays |
| Unsubscribe | `marketing_status = 'unsubscribed'`, and the old newsletter row is kept in step |

Nothing on that page can switch off a transactional email or a
`service_announcement`. Password resets, verification codes, security notices
and terms changes are not preferences, and the page says so in as many words
so nobody goes looking for a switch that is deliberately absent.

Routes live in `src/routes/preferences.js`; the page is
`src/pages/EmailPreferences.jsx`. Whether a send is allowed is decided in
`src/email-eligibility.js` and nowhere else, per recipient, at send time —
not from a list assembled earlier.

### The list a lawyer has to work through

`0024_migrate_newsletter_consent.sql` carries the old newsletter table into
`email_preferences`. Everyone who was subscribed arrives as `subscribed` with
`consent_source = 'legacy_import'` and **`needs_consent_review = true`**,
because the old table recorded that they were on the list and never how they
got there. That flag is not a fix; it is a queue:

```sql
SELECT u.email, p.consent_at
FROM email_preferences p JOIN users u ON u.id = p.user_id
WHERE p.needs_consent_review;
```

Either re-confirm those addresses or stop sending to them. `consent_at` on
those rows is when the row was made, not when anybody agreed, and it is not
evidence of consent.

## Webhooks: how the suppression list learns

Before this existed, `suppression_list` was read before every send and
written by nothing. The machinery to stop writing to dead addresses was all
there and had no way to find out which addresses were dead.

`POST /webhooks/resend` fills that in. Three things happen, in this order,
and the order is the design:

1. **The signature is checked.** Nothing else runs first, because everything
   after it acts on what the body says.
2. **The event is written to `webhook_events`**, keyed by the sender's own
   id, with a unique index on it. A replay conflicts, returns no row, and
   every step below is skipped.
3. **Only then is anything changed.**

| Event | `email_log.status` | Suppression |
|---|---|---|
| `email.delivered` | `delivered` | — |
| `email.opened` / `email.clicked` | `opened` / `clicked` | — |
| `email.bounced`, `bounce.type` = `Permanent` | `bounced` | `hard_bounce` |
| `email.bounced`, anything else | `bounced` | **none** |
| `email.complained` | `complained` | `complaint` |

Status only moves forward. Retries reorder freely, so a `delivered` arriving
after an `opened` must not walk the record backwards, and an `opened` after
a complaint must not bury it.

### Turning it on

Two settings, and it does nothing until both are in place.

1. In the Resend dashboard, add a webhook pointing at
   `https://api.vantaorigin.com/webhooks/resend`, subscribed to
   `email.delivered`, `email.bounced`, `email.complained`, `email.opened`
   and `email.clicked`. Copy the signing secret it shows (`whsec_…`).
2. Set `RESEND_WEBHOOK_SECRET` to that value in the API's environment.

**With no secret set, every webhook is refused.** That is deliberate and not
a fallback: this is the one route where an unauthenticated stranger could
stop somebody else's mail, so a missing environment variable must not read
as "trust anyone".

### Two things the documentation would not settle

Both are handled by not guessing, and both are worth revisiting once real
events have arrived.

**Which id matches a send.** The payload carries `data.email_id` and
`data.message_id`; the docs define both and never say which equals the id
the send API returned. Guessing wrong means every webhook silently matches
nothing, so the lookup tries both.

**What a soft bounce is called.** The event page lists `Permanent` and
`Temporary`. The bounce-types page lists `Permanent`, `Transient` and
`Undetermined`. They agree only on `Permanent`, so that is the single value
that suppresses, and everything else — including a string nobody has seen
before — does not. The asymmetry is deliberate: failing to suppress costs
one more bounce, while suppressing wrongly stops somebody's mail for good
and shows up nowhere in the product. Every bounce type is logged, so the
real set can be read off the log rather than off a page:

```sql
SELECT payload->'data'->'bounce'->>'type' AS kind, count(*)
FROM webhook_events WHERE event_type = 'email.bounced' GROUP BY 1;
```

### What to watch once it is live

```sql
-- Who we have stopped writing to, and why.
SELECT reason, count(*) FROM suppression_list GROUP BY reason;

-- Whether anything is actually arriving.
SELECT status, count(*) FROM email_log
WHERE created_at > now() - interval '7 days' GROUP BY status;
```

A hard bounce rate above roughly 2% is where delivery for everybody else
starts to suffer, which is the entire reason this endpoint exists.

### Getting back off the suppression list

The webhook fills that list and never empties it. For a mailbox that no
longer exists that is right. For the cases that actually turn up it is not:
a mail server having a bad hour and answering a permanent refusal it did not
mean, a corporate filter reporting a newsletter on somebody's behalf, a
person who pressed the wrong thing and wrote in to say so.

**Admin → Blocked** shows every suppressed address with the sender's own
diagnostic line beside it, and lifts one in two presses with a required
reason. `DELETE /admin/suppressions` takes `{ email, note }`; the note is
not optional.

Lifting deletes the suppression row, which would otherwise destroy the only
evidence the block ever happened — so what it was, who lifted it, when and
why is copied to `suppression_lifts` first. Being on the list means not even
a password reset arrives, so coming off it is a decision about somebody's
access to their own account and has to be answerable a year later.

If the address really is gone, the next bounce suppresses it again. The
webhook neither knows nor cares that somebody lifted it, and the lift record
is what tells the story afterwards.

```sql
SELECT email, was_reason, lifted_by, note, lifted_at
FROM suppression_lifts ORDER BY lifted_at DESC;
```
