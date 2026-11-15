// Subscribing to a creator.
//
// A different promise from the platform newsletter, and kept apart from it
// everywhere. Somebody here is agreeing that their address goes to one named
// creator, who writes to them with their own tools. That is a thing we
// cannot take back once it has happened, which is why the consent is
// recorded per creator, with a date and an address it came from, and why
// nothing about it is inferred from anything else they have agreed to.
//
// Leaving has to work from an inbox with nobody signed in, so it is a token
// in a link, the same shape the newsletter uses.
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { creatorSubscriptions, users } from "../db/schema.js";
import { userByHandle } from "../db/handles.js";
import { authenticate, verified } from "../auth/auth.js";
import { mailer } from "../adapters/email.js";
import { TRANSACTIONAL } from "../email-classes.js";
import { subscribedEmail } from "../emails/templates.js";

const newToken = () => randomBytes(24).toString("base64url");

const SITE = (config.SITE_URL || "https://www.vantaorigin.com").replace(/\/$/, "");

export const creatorUnsubscribeLink = (token) =>
  `${String(config.API_PUBLIC_URL || "").replace(/\/$/, "")}/creators/unsubscribe?token=${encodeURIComponent(token)}`;

// What to call them in a sentence.
//
// The handle is stored with its @, and "You are subscribed to @artist"
// reads badly in a subject line. The same reasoning as firstName() in
// emails/templates.js, which strips it for the same reason.
const nameOf = (creator) =>
  [creator.firstName, creator.lastName].filter(Boolean).join(" ") ||
  String(creator.username || "").replace(/^@/, "");

// A small page for somebody arriving from an email client, with no session.
const page = (heading, words) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${heading} | VantaOrigin</title>
  </head>
  <body style="margin:0;background:#0e1320;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:64px 24px;text-align:center;color:#e8ecf5;">
      <h1 style="font-size:24px;margin:0 0 12px;color:#ffffff;">${heading}</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 28px;">${words}</p>
      <a href="${SITE}" style="display:inline-block;background:#df1871;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:999px;">Go to VantaOrigin</a>
    </div>
  </body>
</html>`;

export default async function subscriptionRoutes(app) {
  // Whether the person reading this page is subscribed to it, and whether
  // the button should be there at all. Answered for anybody, because the
  // page is public: a visitor with no session is simply not subscribed.
  app.get(
    "/public/creators/:username/subscription",
    { preHandler: authenticate({ required: false }) },
    async (request, reply) => {
      const creator = await userByHandle(request.params.username);
      if (!creator) return reply.code(404).send({ error: "That page doesn't exist" });

      // Nobody subscribes to themselves, and the button is not drawn for
      // them. Said by the API as well as the page, so the answer does not
      // depend on the browser getting it right.
      const own = Boolean(request.user && request.user.id === creator.id);

      if (!request.user || own) {
        return { subscribed: false, own, creatorName: nameOf(creator) };
      }

      const [row] = await db
        .select({ status: creatorSubscriptions.status })
        .from(creatorSubscriptions)
        .where(
          and(
            eq(creatorSubscriptions.creatorId, creator.id),
            eq(creatorSubscriptions.subscriberId, request.user.id)
          )
        )
        .limit(1);

      return {
        subscribed: row?.status === "subscribed",
        own: false,
        creatorName: nameOf(creator),
      };
    }
  );

  // Saying yes.
  //
  // Behind verified(), because this hands an address to somebody else and an
  // unconfirmed address might not belong to the person typing. That is also
  // why the page has to be able to resume the flow after somebody confirms:
  // being sent away to verify is expected here, not an error.
  app.post(
    "/public/creators/:username/subscribe",
    { preHandler: verified() },
    async (request, reply) => {
      const creator = await userByHandle(request.params.username);
      if (!creator) return reply.code(404).send({ error: "That page doesn't exist" });

      if (creator.id === request.user.id) {
        return reply.code(400).send({ error: "You are already on your own page" });
      }

      // Asked before the write, because afterwards there is no way to tell
      // an insert from an update, and the answer decides whether a
      // confirmation goes out.
      const [before] = await db
        .select({ status: creatorSubscriptions.status })
        .from(creatorSubscriptions)
        .where(
          and(
            eq(creatorSubscriptions.creatorId, creator.id),
            eq(creatorSubscriptions.subscriberId, request.user.id)
          )
        )
        .limit(1);

      const alreadyOn = before?.status === "subscribed";

      const consent = {
        status: "subscribed",
        consentAt: new Date(),
        consentIp: request.ip ?? null,
        unsubscribedAt: null,
        updatedAt: new Date(),
      };

      // Coming back is a fresh yes, and it is recorded as one: the old
      // consent date described a decision they have since reversed.
      const [row] = await db
        .insert(creatorSubscriptions)
        .values({
          creatorId: creator.id,
          subscriberId: request.user.id,
          token: newToken(),
          ...consent,
        })
        .onConflictDoUpdate({
          target: [creatorSubscriptions.creatorId, creatorSubscriptions.subscriberId],
          set: consent,
        })
        .returning();

      // Said once, on the way in. A second press is not a second decision
      // and must not be a second email: the row is the same either way, but
      // a confirmation arriving again reads as something having happened.
      // Somebody who left and came back does get one, because for them
      // something did.
      if (!alreadyOn && !request.body?.quiet) {
        const leave = creatorUnsubscribeLink(row.token);
        try {
          await mailer.send({
            to: request.user.email,
            // They pressed a button and this is the thing that completes it.
            // It sells nothing and it carries the way out.
            kind: TRANSACTIONAL,
            template: "creator-subscribed",
            userId: request.user.id,
            unsubscribeUrl: leave,
            ...subscribedEmail({
              user: request.user,
              creatorName: nameOf(creator),
              creatorUrl: `${SITE}/creator/${creator.username.replace(/^@/, "")}`,
              unsubscribeUrl: leave,
            }),
          });
        } catch (error) {
          // The subscription is the thing they asked for. A confirmation
          // that did not send is worth knowing about and not worth undoing
          // their decision over.
          request.log.error({ err: error, to: request.user.email }, "subscribe email failed");
        }
      }

      return { subscribed: true, creatorName: nameOf(creator) };
    }
  );

  // Leaving, while signed in.
  app.delete(
    "/public/creators/:username/subscribe",
    { preHandler: authenticate() },
    async (request, reply) => {
      const creator = await userByHandle(request.params.username);
      if (!creator) return reply.code(404).send({ error: "That page doesn't exist" });

      await db
        .update(creatorSubscriptions)
        .set({ status: "unsubscribed", unsubscribedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(creatorSubscriptions.creatorId, creator.id),
            eq(creatorSubscriptions.subscriberId, request.user.id)
          )
        );

      return { subscribed: false, creatorName: nameOf(creator) };
    }
  );

  // Leaving, from a link in an email, with nobody signed in.
  //
  // Answered as a page rather than JSON, because whoever follows it is in a
  // mail client and not in the app.
  app.get("/creators/unsubscribe", async (request, reply) => {
    const token = String(request.query.token || "").trim();

    const [row] = await db
      .update(creatorSubscriptions)
      .set({ status: "unsubscribed", unsubscribedAt: new Date(), updatedAt: new Date() })
      .where(eq(creatorSubscriptions.token, token))
      .returning();

    if (!row) {
      // Never called expired. A link that matches nothing might be a typo,
      // a mail client mangling it, or a second press after it already
      // worked, and the last of those is the most common.
      return reply
        .type("text/html; charset=utf-8")
        .send(page("Nothing to do", "This link does not match a subscription. You may have used it already."));
    }

    const [creator] = await db
      .select()
      .from(users)
      .where(eq(users.id, row.creatorId))
      .limit(1);

    return reply
      .type("text/html; charset=utf-8")
      .send(
        page(
          "You are unsubscribed",
          `${creator ? nameOf(creator) : "That creator"} will not send you any more updates. Your VantaOrigin account stays as it is.`
        )
      );
  });

  // Also a POST, for the one click button a mail client draws. Gmail hides
  // it unless both exist, and a message it cannot see a way out of is a
  // message it sends to spam.
  app.post("/creators/unsubscribe", async (request, reply) => {
    const token = String(request.query.token || request.body?.token || "").trim();

    await db
      .update(creatorSubscriptions)
      .set({ status: "unsubscribed", unsubscribedAt: new Date(), updatedAt: new Date() })
      .where(eq(creatorSubscriptions.token, token));

    return reply.code(204).send();
  });

  // Which creators this person is subscribed to. Theirs alone: the signed in
  // account is the only one this can answer about.
  app.get("/me/subscriptions", { preHandler: authenticate() }, async (request) => {
    const rows = await db
      .select({
        username: users.username,
        name: sql`coalesce(nullif(trim(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')), ''), ${users.username})`,
        avatarUrl: users.avatarUrl,
        since: creatorSubscriptions.consentAt,
      })
      .from(creatorSubscriptions)
      .innerJoin(users, eq(users.id, creatorSubscriptions.creatorId))
      .where(
        and(
          eq(creatorSubscriptions.subscriberId, request.user.id),
          eq(creatorSubscriptions.status, "subscribed")
        )
      )
      .orderBy(desc(creatorSubscriptions.consentAt));

    return { subscriptions: rows };
  });
}
