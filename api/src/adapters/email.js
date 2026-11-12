// Email behind one method: send({ to, subject, html, text, kind, ... }).
//
// "resend" posts to Resend's HTTP API with no SDK, so there is nothing to
// remove if we switch to SMTP or Postmark on a VPS. "console" prints the
// message, which is what local development uses. Those two are transports:
// they know how to put a message on the wire and nothing else.
//
// send() is the gate in front of them, and it is the only one. It refuses a
// message with no class, refuses an address we have been told to stop
// writing to, and records every attempt either way. Putting that here rather
// than at each call site is the whole point: a new route, a script or a test
// cannot introduce an email that nobody can account for afterwards, because
// there is no other door.
import { sql } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { emailLog, suppressionList } from "../db/schema.js";
import {
  SERVICE_ANNOUNCEMENT,
  blockedBySuppression,
  isKind,
  isReasonCategory,
  streamFor,
} from "../email-classes.js";

// Which address a stream sends from. Both fall back to the single address
// that exists today, so this is inert until the subdomains are in DNS.
const fromFor = (stream) =>
  (stream === "transactional" ? config.EMAIL_FROM_TRANSACTIONAL : config.EMAIL_FROM_MARKETING) ||
  config.EMAIL_FROM;

const consoleTransport = {
  name: "console",
  async send({ to, subject, html, text }) {
    // The plain part is the readable one in a terminal; the HTML is not.
    console.log(`\n--- email ---\nto: ${to}\nsubject: ${subject}\n${text || html}\n-------------\n`);
    return { id: "console" };
  },
};

const resendTransport = {
  name: "resend",
  async send({ to, subject, html, text, replyTo, unsubscribeUrl, from }) {
    // The two headers a mail app reads to offer its own unsubscribe button.
    // One-Click tells it the POST needs no confirmation screen.
    const unsubscribeHeaders = unsubscribeUrl
      ? {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : {};

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || config.EMAIL_FROM,
        to,
        subject,
        html,
        ...(text ? { text } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(unsubscribeUrl ? { headers: unsubscribeHeaders } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Email failed (${response.status}): ${await response.text()}`);
    }
    return response.json();
  },
};

const transport = config.EMAIL_DRIVER === "resend" ? resendTransport : consoleTransport;

// Why this address is off limits, or null.
const suppressionFor = async (email) => {
  const [row] = await db
    .select({ reason: suppressionList.reason })
    .from(suppressionList)
    .where(sql`lower(${suppressionList.email}) = ${String(email).trim().toLowerCase()}`)
    .limit(1);
  return row?.reason ?? null;
};

// The record of an attempt. `class` is the column; `kind` is what the code
// calls it, because `class` is a reserved word in JavaScript.
const writeLog = async (row) => {
  try {
    const [written] = await db.insert(emailLog).values(row).returning({ id: emailLog.id });
    return written?.id ?? null;
  } catch (error) {
    // A send that cannot be written down is still better than no send. The
    // log is for answering questions later; the email is the actual job.
    console.warn("could not write to the email log:", error?.message);
    return null;
  }
};

const updateLog = async (id, patch) => {
  if (!id) return;
  try {
    await db.update(emailLog).set({ ...patch, updatedAt: new Date() }).where(sql`id = ${id}`);
  } catch (error) {
    console.warn("could not update the email log:", error?.message);
  }
};

export const mailer = {
  get name() {
    return transport.name;
  },

  // `kind` is required. `template` and `userId` are not, but a send without
  // them is a row in the log that cannot answer "which letter was that".
  async send({
    to,
    subject,
    html,
    text,
    replyTo,
    unsubscribeUrl,
    kind,
    // Why a service announcement is going out. Required for that class and
    // ignored for the rest: it decides both whether a complaint can stop it
    // and which identity it is sent under.
    reasonCategory = null,
    template = "",
    userId = null,
  }) {
    if (!isKind(kind)) {
      // Thrown rather than defaulted. A default would mean the next person to
      // add a send picks the class by accident, which is how a marketing
      // email ends up classified as transactional and sent to everybody.
      throw new Error(
        `Email needs a class. Got ${JSON.stringify(kind)}; expected one of transactional, service_announcement, product_notification, marketing.`
      );
    }

    // An announcement with no reason is refused the same way a send with no
    // class is. Without one there is no deciding whether somebody who asked
    // us to stop still has to hear it.
    if (kind === SERVICE_ANNOUNCEMENT && !isReasonCategory(reasonCategory)) {
      throw new Error(
        `A service announcement needs a reason category. Got ${JSON.stringify(reasonCategory)}; expected one of terms_change, privacy_change, security_notice, downtime, account_policy.`
      );
    }

    const blocked = blockedBySuppression(await suppressionFor(to), kind, reasonCategory);
    if (blocked) {
      // Written down and not sent. A send that never happened is exactly the
      // thing somebody will come asking about.
      await writeLog({ userId, email: to, class: kind, template, status: "blocked", error: blocked });
      return { blocked: true, reason: blocked };
    }

    const logId = await writeLog({ userId, email: to, class: kind, template, status: "queued" });

    try {
      const answer = await transport.send({
        to,
        subject,
        html,
        text,
        replyTo,
        unsubscribeUrl,
        from: fromFor(streamFor(kind, reasonCategory)),
      });
      await updateLog(logId, { status: "sent", providerMessageId: answer?.id ?? null });
      return answer;
    } catch (error) {
      await updateLog(logId, { status: "failed", error: String(error?.message || error).slice(0, 500) });
      throw error;
    }
  },
};
