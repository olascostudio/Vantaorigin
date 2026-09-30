// Sending a letter.
//
// Every copy is built for the person receiving it, because every copy carries
// their own unsubscribe link. That rules out one message addressed to
// everybody, which would also put the whole list in one To: line.
//
// A send is safe to repeat. Each address is marked with the issue as it goes,
// and a send only goes to addresses not already marked, so a restart halfway
// through resumes where it stopped and nobody is sent the same letter twice.
// That is also why sending does not hold the HTTP request open: it answers at
// once and works through the list in the background, and the screen watches
// the counts climb.
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { config } from "./config.js";
import { db } from "./db/client.js";
import { newsletterIssues, newsletterSubscribers } from "./db/schema.js";
import { mailer } from "./adapters/email.js";
import { renderIssue } from "./emails/issue.js";
import { unsubscribeLink } from "./newsletter.js";

// Resend allows two requests a second on the ordinary plan. Going slower than
// the limit is free; being refused for going too fast is not.
const PACE_MS = 550;
const BATCH = 50;
// The record of a disaster does not need to be as long as the disaster.
const FAILURES_KEPT = 200;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One send at a time per issue, within this process. The marked-as-sent column
// is what protects against two processes, or a restart.
const sending = new Set();

export const isSending = (issueId) => sending.has(issueId);

// Nothing goes out half-written.
export function whyNotSendable(issue, waiting) {
  if (!issue) return "No such issue";
  if (issue.status === "sent") return "This letter has already gone out.";
  if (!String(issue.subject || "").trim()) return "Give it a subject first.";

  const said = (issue.blocks || []).some((block) =>
    block?.type === "image"
      ? Boolean(block.url)
      : block?.type === "button"
        ? Boolean(block.text && block.href)
        : Boolean(String(block?.text || "").trim())
  );
  if (!said) return "There is nothing written in it yet.";
  // A send that stopped partway is picked up by the same route, and picking
  // one up when everybody has already been reached is how it gets marked
  // finished. Only a draft can be refused for having nobody to go to.
  if (waiting === 0 && issue.status !== "sending") return "Nobody is waiting for it.";
  return null;
}

// Everyone still on the list who has not already been sent this one.
const stillOwed = (issueId) =>
  and(
    eq(newsletterSubscribers.status, "subscribed"),
    or(isNull(newsletterSubscribers.lastIssueId), ne(newsletterSubscribers.lastIssueId, issueId))
  );

export async function countWaiting(issueId) {
  const [row] = await db
    .select({ value: sql`count(*)::int` })
    .from(newsletterSubscribers)
    .where(stillOwed(issueId));
  return Number(row?.value ?? 0);
}

const leaveLinkFor = (token) => unsubscribeLink(config.API_PUBLIC_URL, token);

// One copy, to one person, with their own way out.
async function sendOne(issue, subscriber) {
  const leave = leaveLinkFor(subscriber.token);
  const letter = renderIssue(issue, { unsubscribeUrl: leave });

  await mailer.send({
    to: subscriber.email,
    replyTo: config.EMAIL_REPLY_TO,
    unsubscribeUrl: leave,
    ...letter,
  });
}

// A copy to one address, to read it in a real inbox before anyone else does.
// It does not touch the issue or the list: a test is not a send.
export async function sendTest(issue, to) {
  const letter = renderIssue(issue, {
    unsubscribeUrl: leaveLinkFor("test-copy-not-a-real-subscription"),
  });

  await mailer.send({
    to,
    replyTo: config.EMAIL_REPLY_TO,
    // Said in the subject, so a test copy is never mistaken for the real one.
    subject: `[Test] ${letter.subject}`,
    html: letter.html,
    text: letter.text,
  });
}

// Works through the list. Returns when everything has been attempted; callers
// that must answer sooner start it without waiting.
export async function deliver(app, issueId) {
  if (sending.has(issueId)) return { alreadyRunning: true };
  sending.add(issueId);

  try {
    await db
      .update(newsletterIssues)
      .set({ status: "sending", updatedAt: new Date() })
      .where(eq(newsletterIssues.id, issueId));

    const [issue] = await db
      .select()
      .from(newsletterIssues)
      .where(eq(newsletterIssues.id, issueId))
      .limit(1);
    if (!issue) return { sent: 0, failed: 0 };

    let sent = issue.sentCount;
    let failed = issue.failedCount;
    const failures = Array.isArray(issue.failures) ? [...issue.failures] : [];

    // Asked again each time round: somebody who joins mid-send is included,
    // and somebody who leaves mid-send is not.
    for (;;) {
      const waiting = await db
        .select({
          id: newsletterSubscribers.id,
          email: newsletterSubscribers.email,
          token: newsletterSubscribers.token,
        })
        .from(newsletterSubscribers)
        .where(stillOwed(issueId))
        .limit(BATCH);

      if (!waiting.length) break;

      for (const subscriber of waiting) {
        try {
          await sendOne(issue, subscriber);
          sent += 1;
        } catch (error) {
          failed += 1;
          if (failures.length < FAILURES_KEPT) {
            failures.push({
              email: subscriber.email,
              reason: String(error?.message || "no reason given").slice(0, 300),
              at: new Date().toISOString(),
            });
          }
          app?.log?.error({ err: error, to: subscriber.email }, "newsletter copy failed");
        }

        // Marked either way. A copy that failed is not retried by a later
        // press of send: repeating a whole list to reach one address would
        // send everybody else a second copy.
        await db
          .update(newsletterSubscribers)
          .set({ lastIssueId: issueId })
          .where(eq(newsletterSubscribers.id, subscriber.id));

        // Counted in the same breath as the mark. Counting once per batch
        // was cheaper, but a stop between the mark and the count loses the
        // copy from the record for good: the person has it, and the history
        // says they never got it. At two copies a second the extra write
        // costs nothing worth having.
        await db
          .update(newsletterIssues)
          .set({ sentCount: sent, failedCount: failed, failures, updatedAt: new Date() })
          .where(eq(newsletterIssues.id, issueId));

        await pause(PACE_MS);
      }
    }

    await db
      .update(newsletterIssues)
      .set({
        status: "sent",
        sentAt: issue.sentAt ?? new Date(),
        sentCount: sent,
        failedCount: failed,
        failures,
        updatedAt: new Date(),
      })
      .where(eq(newsletterIssues.id, issueId));

    app?.log?.info({ issueId, sent, failed }, "newsletter sent");
    return { sent, failed };
  } finally {
    sending.delete(issueId);
  }
}
