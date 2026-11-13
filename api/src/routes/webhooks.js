// What the sender tells us afterwards.
//
// Until this existed, the suppression list was read before every send and
// written by nothing. The machinery to stop writing to dead addresses was
// all there; it had no way to learn which addresses were dead. A mailbox
// that no longer exists was written to for ever, and hard bounce rate is
// what decides whether the mail that matters reaches anybody at all.
//
// Three things happen here, in this order, and the order is the design:
//
//   1. The signature is checked. Nothing else runs first, because
//      everything below this line acts on what the body says.
//   2. The event is written down, keyed by the sender's own id. A unique
//      index makes the second copy of a retry lose, and losing means the
//      work below is skipped entirely.
//   3. Only then is anything changed.
import { and, eq, inArray, sql } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { emailLog, suppressionList, webhookEvents } from "../db/schema.js";
import {
  bounceTypeIn,
  isPermanentBounce,
  messageIdsIn,
  recipientIn,
  whyNotSigned,
} from "../webhooks/signature.js";

// How far along a message is. A webhook for an earlier stage may arrive
// after a later one -- retries reorder freely -- so a status only ever moves
// forward and never back. Without this, a replayed "delivered" arriving
// after "opened" would walk the record backwards.
const PROGRESS = { queued: 0, sent: 1, delivered: 2, opened: 3, clicked: 4 };

// These two are the end of the road and outrank everything, whenever they
// arrive. A complaint especially: it is the most consequential thing anybody
// can tell us about a message, and an "opened" turning up afterwards must
// not bury it.
const FINAL = new Set(["bounced", "complained", "failed"]);

const statusFor = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.opened": "opened",
  "email.clicked": "clicked",
};

const laterOf = (was, now) => {
  if (FINAL.has(was)) return was;
  if (FINAL.has(now)) return now;
  return (PROGRESS[now] ?? -1) > (PROGRESS[was] ?? -1) ? now : was;
};

// Stop writing to this address. Idempotent by the unique index on
// lower(email), so a mailbox that bounces every week keeps one row.
const suppress = async (email, reason, note) => {
  if (!email) return;
  await db
    .insert(suppressionList)
    .values({ email, reason, note: note.slice(0, 500) })
    .onConflictDoNothing();
};

export default async function webhookRoutes(app) {
  // The signature is over the exact bytes that arrived. Fastify's JSON
  // parser would hand the route an object, and re-serialising an object
  // changes whitespace and key order, so the body is kept as text and
  // parsed by hand below.
  //
  // Registered inside this plugin rather than on the whole app: every other
  // route should keep getting parsed JSON.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    done(null, body);
  });

  app.post("/webhooks/resend", async (request, reply) => {
    const raw = typeof request.body === "string" ? request.body : "";

    const refusal = whyNotSigned({
      secret: config.RESEND_WEBHOOK_SECRET,
      id: request.headers["svix-id"],
      timestamp: request.headers["svix-timestamp"],
      signature: request.headers["svix-signature"],
      body: raw,
    });

    if (refusal) {
      // Said in the log, never in the answer. Telling an unsigned caller
      // which part of their forgery failed is telling them how to fix it.
      request.log.warn({ reason: refusal, id: request.headers["svix-id"] }, "webhook refused");
      return reply.code(401).send({ error: "Not signed" });
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return reply.code(400).send({ error: "Not JSON" });
    }

    const type = String(payload?.type || "");
    const ids = messageIdsIn(payload);
    const email = recipientIn(payload);

    // Written down before anything is acted on, and this insert is the whole
    // replay defence. A second copy of the same delivery conflicts, returns
    // no row, and everything below is skipped.
    const [fresh] = await db
      .insert(webhookEvents)
      .values({
        providerEventId: String(request.headers["svix-id"]),
        eventType: type,
        providerMessageId: ids[0] ?? null,
        email,
        payload,
      })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });

    // A replay. Answered 200 on purpose: it is not an error, and anything
    // else only earns another retry.
    if (!fresh) return { ok: true, repeat: true };

    const status = statusFor[type];
    if (!status) {
      // Something we do not handle yet -- a scheduled or failed event, or
      // one that did not exist when this was written. Kept, not acted on.
      return { ok: true, ignored: type };
    }

    // Forward only. A row is found by either id the payload might carry,
    // because the documentation does not say which of them matches what a
    // send recorded.
    if (ids.length) {
      const rows = await db
        .select({ id: emailLog.id, status: emailLog.status })
        .from(emailLog)
        .where(inArray(emailLog.providerMessageId, ids));

      for (const row of rows) {
        const next = laterOf(row.status, status);
        if (next === row.status) continue;
        await db
          .update(emailLog)
          .set({ status: next, updatedAt: new Date() })
          .where(eq(emailLog.id, row.id));
      }
    }

    if (type === "email.bounced") {
      const kind = bounceTypeIn(payload);
      if (isPermanentBounce(payload)) {
        await suppress(email, "hard_bounce", `bounced permanently: ${kind}`);
      } else {
        // On purpose. A mailbox that was full this morning is not a mailbox
        // that is gone, and suppressing it would stop their mail for good
        // over a bad afternoon. The type is logged so the real set of
        // values can be read off the log, since the documentation gives
        // two different lists.
        request.log.info({ kind, email }, "bounce that does not suppress");
      }
    }

    if (type === "email.complained") {
      // Somebody pressed "report spam". Nothing marketing goes to them
      // again. What still reaches them is decided in email-classes.js, not
      // here: a complaint does not cancel a password reset, and it does not
      // cancel a change to the terms.
      await suppress(email, "complaint", "reported as spam");
    }

    return { ok: true, type, status };
  });
}
