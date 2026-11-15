// Sending something to everybody at once.
//
// Separate from newsletter-send.js, and the separation is the point rather
// than tidiness. That one writes to a list people chose to be on, and skips
// anybody who left. This one writes to every account, including people who
// unsubscribed from the newsletter years ago, because a change to the terms
// governs the account they still hold and telling them is not a thing they
// opted into.
//
// Who it may actually reach is not decided here. mailer.send() asks
// email-classes.js and email-eligibility.js for every single address, which
// is where the rule lives that a complaint stops a downtime notice and does
// not stop a security one. This file's job is to walk the list and keep
// count honestly.
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { config } from "./config.js";
import { db } from "./db/client.js";
import { broadcastRecipients, broadcasts, users } from "./db/schema.js";
import { mailer } from "./adapters/email.js";
import { renderIssue } from "./emails/issue.js";
import { SERVICE_ANNOUNCEMENT, isReasonCategory, isUnavoidable } from "./email-classes.js";

const PACE_MS = 550;
const BATCH = 50;
const FAILURES_KEPT = 200;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sending = new Set();
export const isSending = (id) => sending.has(id);

// How a broadcast marks the people it has already reached. Written into
// email_log by the sender itself, so resuming asks the record of what was
// sent rather than a second table that could disagree with it.
export const markerFor = (broadcastId) => `broadcast:${broadcastId}`;

const showsSomething = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim().length > 0 || /<img\b/i.test(String(html || ""));

const hasContent = (block) => {
  switch (block?.type) {
    case "image":
      return Boolean(block.url);
    case "button":
      return Boolean(block.text && block.href);
    case "rich":
    case "html":
      return showsSomething(block.html);
    default:
      return Boolean(String(block?.text || "").trim());
  }
};

// Nothing goes out half-written, and nothing goes out unexplained.
export function whyNotSendable(broadcast) {
  if (!broadcast) return "No such announcement";
  if (broadcast.status === "sent") return "This has already gone out.";
  if (!String(broadcast.subject || "").trim()) return "Give it a subject first.";
  if (!(broadcast.blocks || []).some(hasContent)) return "There is nothing written in it yet.";

  // The category is not a label. It decides whether this reaches somebody
  // who has reported us as spam, so sending without one would mean sending
  // without having decided that.
  if (broadcast.class === SERVICE_ANNOUNCEMENT) {
    if (!broadcast.reasonCategory) return "Choose why this is being sent.";
    if (!isReasonCategory(broadcast.reasonCategory)) return "That is not a reason we recognise.";
    if (broadcast.reasonCategory === "terms_change" && !broadcast.termsVersion) {
      // Otherwise the banner has no version to ask anybody to accept, and
      // the letter announces a change nobody can agree to.
      return "A terms change needs the version it is announcing.";
    }
  }

  return null;
}

// Everybody with an account and a confirmed address.
//
// Not the newsletter list: that is who asked for marketing. This is who
// holds an account, which is who an announcement about accounts is for.
// Unconfirmed addresses are left out because we have no evidence they
// belong to the person who typed them.
const audience = () => isNotNull(users.emailVerifiedAt);

export async function countAudience() {
  const [row] = await db.select({ value: sql`count(*)::int` }).from(users).where(audience());
  return Number(row?.value ?? 0);
}

// Who has not been attempted yet for this one.
//
// Asked of broadcast_recipients, which this file writes itself, and not of
// email_log, which mailer.send() writes. That distinction is the whole
// reason the table exists: writeLog() swallows its own errors on purpose,
// so a loop that waited for rows it does not control would select the same
// people again on every pass if logging ever failed, and write to them
// again each time.
const stillOwed = async (broadcastId, limit) =>
  db
    .select({ id: users.id, email: users.email, firstName: users.firstName, username: users.username })
    .from(users)
    .where(
      and(
        audience(),
        sql`NOT EXISTS (
          SELECT 1 FROM ${broadcastRecipients}
          WHERE ${broadcastRecipients.broadcastId} = ${broadcastId}
            AND ${broadcastRecipients.userId} = ${users.id}
        )`
      )
    )
    .limit(limit);

// Marked after the attempt, whatever happened. The unique index is what
// makes a second attempt impossible rather than unlikely, so two copies of
// this loop racing cannot both claim the same person.
const markAttempted = (broadcastId, person, outcome, reason = null) =>
  db
    .insert(broadcastRecipients)
    .values({
      broadcastId,
      userId: person.id,
      email: person.email,
      outcome,
      reason: reason ? String(reason).slice(0, 300) : null,
    })
    .onConflictDoNothing();

export async function countWaiting(broadcastId) {
  const rows = await stillOwed(broadcastId, 100000);
  return rows.length;
}

export async function deliver(app, broadcastId) {
  if (sending.has(broadcastId)) return { alreadyRunning: true };
  sending.add(broadcastId);

  try {
    await db
      .update(broadcasts)
      .set({ status: "sending", updatedAt: new Date() })
      .where(eq(broadcasts.id, broadcastId));

    const [broadcast] = await db
      .select()
      .from(broadcasts)
      .where(eq(broadcasts.id, broadcastId))
      .limit(1);
    if (!broadcast) return { sent: 0, failed: 0, skipped: 0 };

    let sent = broadcast.sentCount;
    let failed = broadcast.failedCount;
    let skipped = broadcast.skippedCount;
    const failures = Array.isArray(broadcast.failures) ? [...broadcast.failures] : [];

    // No unsubscribe link and not a newsletter: the footer must not tell
    // somebody they are getting this because they joined a list.
    const letter = renderIssue(broadcast, {
      newsletter: false,
      reasonCategory: broadcast.reasonCategory,
    });

    for (;;) {
      const waiting = await stillOwed(broadcastId, BATCH);
      if (!waiting.length) break;

      for (const person of waiting) {
        try {
          // No unsubscribe link, and that is not an oversight. There is
          // nothing here to unsubscribe from: this is not a list, and
          // offering a way off one would promise something we cannot keep.
          const answer = await mailer.send({
            to: person.email,
            kind: broadcast.class,
            reasonCategory: broadcast.reasonCategory,
            template: markerFor(broadcastId),
            userId: person.id,
            replyTo: config.EMAIL_REPLY_TO,
            subject: letter.subject,
            html: letter.html,
            text: letter.text,
          });

          if (answer?.blocked) {
            skipped += 1;
            await markAttempted(broadcastId, person, "skipped", answer.reason);
          } else {
            sent += 1;
            await markAttempted(broadcastId, person, "sent");
          }
        } catch (error) {
          failed += 1;
          if (failures.length < FAILURES_KEPT) {
            failures.push({
              email: person.email,
              reason: String(error?.message || "no reason given").slice(0, 300),
              at: new Date().toISOString(),
            });
          }
          app?.log?.error({ err: error, to: person.email }, "announcement copy failed");

          // Marked either way. A copy that failed is not retried by a later
          // press of send: going round again to reach one address would
          // write to everybody else a second time.
          await markAttempted(broadcastId, person, "failed", error?.message);
        }

        await db
          .update(broadcasts)
          .set({ sentCount: sent, failedCount: failed, skippedCount: skipped, failures, updatedAt: new Date() })
          .where(eq(broadcasts.id, broadcastId));

        await pause(PACE_MS);
      }
    }

    await db
      .update(broadcasts)
      .set({
        status: "sent",
        sentAt: broadcast.sentAt ?? new Date(),
        sentCount: sent,
        failedCount: failed,
        skippedCount: skipped,
        failures,
        updatedAt: new Date(),
      })
      .where(eq(broadcasts.id, broadcastId));

    app?.log?.info(
      { broadcastId, sent, failed, skipped, reason: broadcast.reasonCategory, unavoidable: isUnavoidable(broadcast.reasonCategory) },
      "announcement sent"
    );
    return { sent, failed, skipped };
  } finally {
    sending.delete(broadcastId);
  }
}
