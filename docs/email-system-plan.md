# Email system: the plan

What exists, what is missing, and the order to build it in. Nothing here is
built yet. This is the thing to argue with before anyone writes SQL.

## What is already here

The brief assumes an Express app with no email provider. Neither is true, and
that changes the work: a good half of Phases 3 to 5 exists already, built for
the newsletter, and the job is to generalise it rather than write it again.

| The brief asks for | Where it already lives |
|---|---|
| One-click unsubscribe, RFC 8058 | `api/src/adapters/email.js` sets `List-Unsubscribe` and `List-Unsubscribe-Post`; `POST /newsletter/unsubscribe` answers without a person present |
| Token unsubscribe, no login | `newsletter_subscribers.token`, `unsubscribeByToken()` |
| A broadcast that never double-sends | `newsletter-send.js`: each address is marked with the issue as it goes, and a send only visits addresses not already marked |
| Audience count before sending | `GET /admin/newsletter/issues/:id/waiting` |
| Preview and test send | `POST /admin/newsletter/preview`, `POST /admin/newsletter/issues/:id/test` |
| Shared branded layout, plain text for every email | `api/src/emails/layout.js`, two headers, contrast measured against white |
| Rate limiting, escaping, secrets in env | `@fastify/rate-limit`, `escape()` in the layout, `config.js` |

So the missing half is structural, not cosmetic: classes, consent, suppression,
a log, webhooks, segments, and terms acceptance.

## Two things the brief assumes that do not exist

**There are no roles.** `users` has no `role` column. Admin is an env var,
`ADMIN_EMAILS`, checked by `isAdmin()`. "Segment by role (creator, author,
studio client, affiliate)" has no data behind it.

**There are no interests.** Nothing records that somebody cares about VTubers
rather than game dev.

Both have to be *collected* before they can be segmented on, and collecting
them is a product decision, not a migration. They are in Phase 6 for that
reason, and the earlier phases do not depend on them.

## The spine: one class on every send

The whole design rests on one rule, enforced in one place.

`mailer.send()` grows a required `klass`. A call without one throws, so there
is no path to an email that is not classified: not a new route, not a test,
not a script. Everything else in this document is a consequence.

```
transactional          one person's action caused it. Always sent. No
                       unsubscribe. Verification, reset, payment, dispute,
                       suspension.

service_announcement   the service itself changed. Sent to every active
                       account whatever their marketing state. Reason category
                       required and from a fixed list. No promotion in it.

product_notification   something happened in your account. On by default,
                       off per category.

marketing              the newsletter and anything like it. Only to
                       marketing_status = subscribed. Double opt-in.
```

Eligibility is decided per recipient at send time, inside the sender, from the
database. The caller says who it wants to reach; the sender decides who it is
allowed to reach. A caller that passes a list of addresses still gets each one
checked.

## Phases

Each phase ends with a working system and a green suite. Migrations continue
the existing numbering; the next free number is `0020`.

### Phase 1 — classes and the log (0020, 0021)

The spine, and the ability to see what happened.

- `0020_email_log.sql` — `email_log`: id, user_id, email, class, template,
  provider_message_id, status, error, created_at, updated_at. Indexed on
  user_id, on provider_message_id (webhooks look up by it), and on created_at.
- `0021_suppression_list.sql` — `suppression_list`: email, reason
  (`hard_bounce`, `complaint`, `manual`), note, created_at. Unique on email.
- `mailer.send()` requires `klass` and writes a log row for every attempt.
- Suppression is checked for every class; a hard bounce blocks everything,
  a complaint blocks everything except transactional.

Tests: a send with no class throws. Every send writes exactly one log row
carrying its class. A suppressed address gets no marketing. A hard-bounced
address gets nothing at all, including a password reset.

Shippable on its own: from here, every email that leaves the building is
recorded and classified, which is the thing we cannot currently answer.

### Phase 2 — preferences and consent (0022, 0023)

- `0022_email_preferences.sql` — `email_preferences`: user_id (unique),
  marketing_status (`pending`, `subscribed`, `unsubscribed`, `bounced`,
  `complained`), per-category product flags, consent_at, consent_source,
  consent_ip, unsubscribed_at, unsubscribe_reason, paused_until.
- `0023_migrate_newsletter.sql` — carries `newsletter_subscribers` across:
  `subscribed` becomes `subscribed` with `consent_source = 'legacy_import'`,
  `unsubscribed` becomes `unsubscribed`. Every legacy row is flagged for
  review, because we cannot prove how that consent was given.
- `newsletter_subscribers` stays, and stays the source of truth for addresses
  with no account. Not every subscriber is a user and the new table is keyed
  by user_id.
- Double opt-in for new signups: `pending` until the confirmation link is
  followed, then `subscribed` with the time, source and IP recorded.
- Preference page and its API: marketing on or off, each product category on
  or off, and on the way out the choice of pause 30 days, fewer emails, or
  leave. One click each, no screen that argues.

Tests: an unsubscribed user gets no newsletter and does get a password reset.
Marketing is refused for `pending`, `unsubscribed`, `bounced`, `complained`
and suppressed. A legacy subscriber lands as subscribed and flagged. Pausing
stops mail until the date and then resumes.

### Phase 3 — broadcasts and service announcements (0024, 0025)

- `0024_broadcasts.sql` — `broadcasts`: id, class, reason_category, subject,
  body_ref, segment, audience_count, created_by, scheduled_at, sent_at,
  status. `newsletter_issues` becomes one kind of broadcast rather than the
  only kind.
- `0025_terms.sql` — `terms_versions` (version, effective_date, summary, url)
  and `user_terms_acceptance` (user_id, version, accepted_at).
- A service announcement needs: admin, a reason category from the fixed list,
  a preview, a test send, a confirmation naming the audience size, and an
  audit row saying who sent what, when, and to how many.
- A `terms_change` broadcast links the version, and the app shows a banner
  until that version is accepted.

Tests: a service announcement reaches every active user including the
unsubscribed, and is refused for a non-admin. One without a reason category is
refused. The audit row records sender, time and audience size. The banner
appears for a user who has not accepted and goes when they do.

### Phase 4 — webhooks and delivery truth

- `POST /webhooks/resend`, signature verified, rejecting anything unsigned.
- `delivered`, `bounced`, `complained`, `opened`, `clicked` update `email_log`
  by `provider_message_id`.
- A hard bounce or a complaint writes to `suppression_list` by itself.
- Replayed webhooks are idempotent: the same event twice changes nothing.

Tests: a hard bounce webhook suppresses the address and the next marketing
send skips it. An unsigned webhook is refused. The same event delivered twice
leaves one row.

### Phase 5 — templates

- The existing `layout.js` becomes the shared shell for every class. It is
  already light, already has a plain-text twin for each letter, already
  measured for contrast.
- A service announcement says at the top why it is being received.
- Templates to write: confirm subscription, terms change, order confirmation,
  dispute notice, suspension and appeal. Welcome, verification, reset and
  newsletter exist.

The brief asks for MJML or React Email. **I would not add either.** The layout
is already tables and inline styles, already tested, already renders in
Outlook, and is about 170 lines. Adding a template compiler means a build step
in the API container to replace something that works. If the templates get
numerous enough to hurt, that is the moment, not now.

The brand colours in the brief are not the ones in the code. The emails use
`#df1871` for links and buttons because it clears 4.5:1 on white in both
directions; the brief's `#EB1C8D` does not. Worth settling before I write five
more templates on the wrong palette.

### Phase 6 — segments

Needs the data that does not exist yet.

- A `role` on users, or a roles table, and somewhere it gets set.
- Interests, and a place a creator chooses them.
- Then: segment definitions, an audience count before sending, and the count
  on the confirmation step.

Keeping this last means Phases 1 to 5 ship without waiting on a product
decision about what a "studio client" is.

## The queue, and an honest problem

The brief says to prefer pg-boss. I do not think it solves the thing it is
there to solve, and I would rather say so than add it quietly.

A send is already idempotent: each address is marked as it goes, and a send
only visits the unmarked. Re-running reaches nobody twice. That part is sound.

The real gap is that `deliver()` runs **in the web process**. Render's free
tier spins the instance down after about fifteen minutes with no requests, so
a send interrupted at four hundred of a thousand simply stops. It resumes
correctly, but only when somebody presses send again.

pg-boss moves that work to a worker, and on the free tier the worker is the
thing that spins down. So it swaps one stalled process for another, plus a
schema and a dependency.

Three ways out, and this is a call for you rather than for me:

1. **A paid always-on worker.** The real fix. Costs money monthly.
2. **A cron that nudges.** A scheduled request every few minutes that resumes
   any broadcast left in `sending`. Cheap, ugly, and works: the resume logic
   already exists and is already tested.
3. **Leave it.** At twelve subscribers a send finishes in seconds. This is not
   a problem until the list is in the thousands.

My recommendation is 2 now and 1 when the list makes it worth paying for.
Option 3 is defensible today and will stop being defensible quietly.

## Deliverability

Separate subdomains, because a marketing complaint must never slow a password
reset:

- `send.vantaorigin.com` — transactional
- `news.vantaorigin.com` — marketing and announcements

Each needs its own SPF, DKIM and DMARC records on Zoho DNS, and each needs
warming before volume. The exact records come from Resend when the domains are
added; I will write them out as a checklist at that point rather than guess
them here.

DMARC starts at `p=none` with reporting, and tightens to `quarantine` once the
reports are clean. Going straight to `reject` on a domain that has never been
authenticated is how a founder stops receiving their own password resets.

## Needs legal review

Not advice. These are the places where the code has to encode a decision that
is not mine to make.

- **Legacy consent.** Every imported subscriber is consent we cannot evidence.
  GDPR wants a record of how and when. The migration flags them; whether they
  can keep receiving marketing, or must re-confirm, is a legal answer.
- **What counts as a service announcement.** The line between "the terms
  changed" and "the terms changed, and look at our new feature" is the line
  between a lawful announcement and unsolicited marketing. The fixed reason
  list is the guardrail; the wording still needs a human.
- **NDPA**, Nigeria's regime, applies here in a way CAN-SPAM and GDPR do not
  substitute for. Lawful basis, retention, and what a data subject request
  must return.
- **Retention.** `email_log` accumulates who was sent what, which is personal
  data. How long it is kept needs a stated period.
- **The physical postal address** CAN-SPAM requires in commercial email. The
  footer does not have one.
- **Suppression is forever.** Once an address is suppressed for a complaint,
  re-subscribing should not silently clear it. Whether the person can undo it
  themselves is a decision.

## What I would do first

Phase 1 alone, and then stop and look at it. It is two migrations and a change
to one function, it cannot break an existing send, and it answers the question
we currently cannot: what was sent, to whom, under what class, and what
happened to it. Everything after it is easier to reason about with a log in
front of you.
