// A creator's own subscribers.
//
// Every query here is keyed to request.user.id, and that is the whole access
// control. No route takes a creator id from the caller, so there is no
// parameter anybody can change to read somebody else's list: reaching
// another creator's subscribers would mean holding their session, which is
// the same thing as being them.
//
// Written that way on purpose rather than checking an id against the session
// after reading it. A check can be forgotten in a route added later; there
// being nothing to check cannot.
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import {
  creatorSubscriptions,
  featureInterest,
  termsVersions,
  userTermsAcceptance,
  users,
} from "../db/schema.js";
import { authenticate } from "../auth/auth.js";
import { csvFile } from "../csv.js";

const PAGE = 25;
const WEEKS = 8;

// Tighter than the whole-API limit. A list of other people's email
// addresses is the most sensitive thing this product hands out, and a
// session that has been taken should not be able to pull it repeatedly
// while somebody works out what to do about it. Stood down under test,
// where a suite that can only ask four times is a suite that tests three.
const EXPORT_LIMIT =
  config.NODE_ENV === "test" ? {} : { config: { rateLimit: { max: 4, timeWindow: "10 minutes" } } };

const mine = (userId) => eq(creatorSubscriptions.creatorId, userId);

// The creator terms currently in force, or nothing if none have been set.
const currentCreatorTerms = async () => {
  const [row] = await db
    .select()
    .from(termsVersions)
    .where(eq(termsVersions.kind, "creator_terms"))
    .orderBy(desc(termsVersions.effectiveDate))
    .limit(1);
  return row ?? null;
};

const hasAccepted = async (userId, version) => {
  const [row] = await db
    .select({ at: userTermsAcceptance.acceptedAt })
    .from(userTermsAcceptance)
    .where(and(eq(userTermsAcceptance.userId, userId), eq(userTermsAcceptance.version, version)))
    .limit(1);
  return row?.at ?? null;
};

// Nothing that names a subscriber is served until the creator has agreed
// to what they may do with the names.
//
// On the routes rather than on the screen, because a rule enforced only in
// the browser is a rule anybody can skip with curl, and the thing being
// protected here is other people’s email addresses. Counts are left
// open: a number tells a creator what they have without telling them who
// anybody is, and seeing it is what makes the agreement worth reading.
const requireCreatorTerms = async (request, reply) => {
  const terms = await currentCreatorTerms();
  // No version set means nothing to agree to. Refusing everybody in that
  // case would break the dashboard to enforce a rule that does not exist.
  if (!terms) return null;

  if (await hasAccepted(request.user.id, terms.version)) return null;

  return reply.code(403).send({
    error: "Agree to the rules for subscriber information first.",
    needsCreatorTerms: true,
    version: terms.version,
    summary: terms.summary,
    url: terms.url,
  });
};

const active = (userId) =>
  and(mine(userId), eq(creatorSubscriptions.status, "subscribed"));

export default async function creatorDashboardRoutes(app) {
  // What a creator has to agree to, and whether they have.
  //
  // Not behind the gate itself, for the obvious reason.
  app.get("/me/creator/terms", { preHandler: authenticate() }, async (request) => {
    const terms = await currentCreatorTerms();
    if (!terms) return { required: false };

    const at = await hasAccepted(request.user.id, terms.version);
    return {
      required: true,
      accepted: Boolean(at),
      acceptedAt: at,
      version: terms.version,
      summary: terms.summary,
      url: terms.url,
    };
  });

  app.post("/me/creator/terms/accept", { preHandler: authenticate() }, async (request, reply) => {
    const terms = await currentCreatorTerms();
    if (!terms) return reply.code(404).send({ error: "There is nothing to agree to" });

    const asked = String(request.body?.version || "");
    // The version has to be named by whoever is agreeing. Accepting
    // whatever happens to be current means a record of somebody agreeing
    // to a document that may have changed while the page was open.
    if (asked !== terms.version) {
      return reply.code(409).send({
        error: "These rules have changed since this page opened. Read them again.",
        version: terms.version,
      });
    }

    await db
      .insert(userTermsAcceptance)
      .values({
        userId: request.user.id,
        version: terms.version,
        acceptedIp: request.ip ?? null,
      })
      .onConflictDoNothing();

    request.log.info(
      { userId: request.user.id, version: terms.version },
      "creator terms accepted"
    );

    return { ok: true, version: terms.version };
  });

  // The numbers at the top.
  app.get("/me/creator/overview", { preHandler: authenticate() }, async (request) => {
    const count = async (where) => {
      const [row] = await db
        .select({ value: sql`count(*)::int` })
        .from(creatorSubscriptions)
        .where(where);
      return Number(row?.value ?? 0);
    };

    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const [total, thisWeek, left] = await Promise.all([
      count(active(request.user.id)),
      count(and(active(request.user.id), sql`${creatorSubscriptions.consentAt} >= ${weekAgo}`)),
      count(and(mine(request.user.id), eq(creatorSubscriptions.status, "unsubscribed"))),
    ]);

    // Eight weeks of joins, oldest first. Counted by when they agreed
    // rather than when the row was made, because somebody who left and
    // came back agreed again, and that is the date that describes them now.
    const since = new Date(Date.now() - WEEKS * 7 * 86400000);
    const joins = await db
      .select({
        week: sql`date_trunc('week', ${creatorSubscriptions.consentAt})`.as("week"),
        value: sql`count(*)::int`,
      })
      .from(creatorSubscriptions)
      .where(and(active(request.user.id), sql`${creatorSubscriptions.consentAt} >= ${since}`))
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    return {
      total,
      thisWeek,
      unsubscribed: left,
      growth: joins.map((row) => ({ week: row.week, value: Number(row.value) })),
    };
  });

  // The list itself.
  app.get(
    "/me/creator/subscribers",
    { preHandler: [authenticate(), requireCreatorTerms] },
    async (request) => {
    const q = String(request.query.q || "").trim().toLowerCase();
    const page = Math.max(Number(request.query.page) || 1, 1);
    const limit = Math.min(Number(request.query.limit) || PAGE, 100);

    const where = and(
      mine(request.user.id),
      q ? sql`lower(${users.email}) LIKE ${`%${q}%`}` : sql`true`
    );

    const rows = await db
      .select({
        id: creatorSubscriptions.id,
        email: users.email,
        status: creatorSubscriptions.status,
        since: creatorSubscriptions.consentAt,
        unsubscribedAt: creatorSubscriptions.unsubscribedAt,
      })
      .from(creatorSubscriptions)
      .innerJoin(users, eq(users.id, creatorSubscriptions.subscriberId))
      .where(where)
      .orderBy(desc(creatorSubscriptions.consentAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const [counted] = await db
      .select({ value: sql`count(*)::int` })
      .from(creatorSubscriptions)
      .innerJoin(users, eq(users.id, creatorSubscriptions.subscriberId))
      .where(where);

    const total = Number(counted?.value ?? 0);

    return {
      subscribers: rows,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      total,
    };
  });

  // The file, for carrying to whatever sends the mail.
  //
  // Active subscribers only. Somebody who unsubscribed must not travel out
  // of here in a file that outlives our copy of their decision.
  app.get(
    "/me/creator/subscribers.csv",
    { preHandler: [authenticate(), requireCreatorTerms], ...EXPORT_LIMIT },
    async (request, reply) => {
      const rows = await db
        .select({ email: users.email, since: creatorSubscriptions.consentAt })
        .from(creatorSubscriptions)
        .innerJoin(users, eq(users.id, creatorSubscriptions.subscriberId))
        .where(active(request.user.id))
        .orderBy(desc(creatorSubscriptions.consentAt));

      const file = csvFile(
        ["email", "subscribed"],
        rows.map((row) => [row.email, row.since.toISOString()])
      );

      const handle = String(request.user.username || "creator").replace(/^@/, "");
      const stamp = new Date().toISOString().slice(0, 10);

      return reply
        .type("text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${handle}-subscribers-${stamp}.csv"`)
        // A file of other people's addresses is not something to leave in a
        // shared cache.
        .header("cache-control", "no-store, private")
        .send(file);
    }
  );

  // What has happened lately, both directions. A creator watching their list
  // shrink deserves to see that as plainly as they see it grow.
  app.get(
    "/me/creator/activity",
    { preHandler: [authenticate(), requireCreatorTerms] },
    async (request) => {
    const rows = await db
      .select({
        id: creatorSubscriptions.id,
        email: users.email,
        status: creatorSubscriptions.status,
        since: creatorSubscriptions.consentAt,
        unsubscribedAt: creatorSubscriptions.unsubscribedAt,
        updatedAt: creatorSubscriptions.updatedAt,
      })
      .from(creatorSubscriptions)
      .innerJoin(users, eq(users.id, creatorSubscriptions.subscriberId))
      .where(mine(request.user.id))
      .orderBy(desc(creatorSubscriptions.updatedAt))
      .limit(20);

    return {
      activity: rows.map((row) => ({
        id: row.id,
        email: row.email,
        kind: row.status === "subscribed" ? "subscribed" : "unsubscribed",
        at: row.status === "subscribed" ? row.since : (row.unsubscribedAt ?? row.updatedAt),
      })),
    };
  });

  // "Tell me when this opens."
  //
  // Not a subscription and not consent to anything: one person pressed one
  // button about one feature. Pressing it twice is pressing it once.
  app.post("/me/creator/interest", { preHandler: authenticate() }, async (request, reply) => {
    const parsed = z
      .object({ feature: z.string().min(1).max(60) })
      .safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "Which feature?" });

    await db
      .insert(featureInterest)
      .values({ userId: request.user.id, feature: parsed.data.feature })
      .onConflictDoNothing();

    return { ok: true, feature: parsed.data.feature };
  });

  app.get("/me/creator/interest", { preHandler: authenticate() }, async (request) => {
    const rows = await db
      .select({ feature: featureInterest.feature })
      .from(featureInterest)
      .where(eq(featureInterest.userId, request.user.id));

    return { features: rows.map((row) => row.feature) };
  });
}
