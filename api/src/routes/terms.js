// Which terms are current, and whether this person has accepted them.
//
// The terms page says what the terms are. It cannot say that any particular
// person read them, and when the wording changes that is the only question
// that matters: everyone who agreed to the old terms has not agreed to the
// new ones, and until this existed nothing knew the difference.
//
// The answer drives a banner in the app rather than a wall. Somebody who has
// not accepted yet can still use their account; they are told, every time,
// until they say yes. Locking people out of work they have already done
// because a sentence in the terms changed is not proportionate, and consent
// given to escape a lock is not worth much as consent.
import { z } from "zod";
import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import { termsVersions, userTermsAcceptance } from "../db/schema.js";
import { authenticate } from "../auth/auth.js";

// The newest version that has actually come into effect. A version can be
// published with notice before it applies, and until it applies there is
// nothing to accept.
const currentVersion = async () => {
  const [row] = await db
    .select()
    .from(termsVersions)
    .where(lte(termsVersions.effectiveDate, new Date()))
    .orderBy(desc(termsVersions.effectiveDate))
    .limit(1);
  return row ?? null;
};

export default async function termsRoutes(app) {
  // What the app asks on load. Answers for a signed-out visitor too, who
  // simply has nothing to accept.
  app.get("/terms/current", { preHandler: authenticate({ required: false }) }, async (request) => {
    const version = await currentVersion();
    if (!version) return { version: null, mustAccept: false };

    if (!request.user) {
      return { version, mustAccept: false };
    }

    const [accepted] = await db
      .select({ acceptedAt: userTermsAcceptance.acceptedAt })
      .from(userTermsAcceptance)
      .where(
        and(
          eq(userTermsAcceptance.userId, request.user.id),
          eq(userTermsAcceptance.version, version.version)
        )
      )
      .limit(1);

    return {
      version,
      acceptedAt: accepted?.acceptedAt ?? null,
      mustAccept: !accepted,
    };
  });

  // Saying yes. Idempotent: pressing it twice is pressing it once, which
  // matters because the banner may be open in two tabs.
  app.post("/terms/accept", { preHandler: authenticate() }, async (request, reply) => {
    const { version } = z.object({ version: z.string().min(1).max(100) }).parse(request.body ?? {});

    const [exists] = await db
      .select({ version: termsVersions.version })
      .from(termsVersions)
      .where(eq(termsVersions.version, version))
      .limit(1);
    if (!exists) return reply.code(404).send({ error: "No such version" });

    await db
      .insert(userTermsAcceptance)
      .values({
        userId: request.user.id,
        version,
        // Kept for the same reason consent is: being able to say how and
        // from where, not only that.
        acceptedIp: request.ip ?? null,
      })
      .onConflictDoNothing();

    return { ok: true, version };
  });
}
