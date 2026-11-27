// Letting a creator into Creator Studio, one at a time.
//
// Distribution is built and not open. Opening it to everybody at once means
// the first printed book is sold by whoever happens to find the page,
// against costs nobody has checked. So it opens by invitation, the way a
// print partner does: we send a link to somebody we have actually spoken to.
//
// Unlike the printer's, this invite carries no agreement to accept. A
// creator already agreed to the site's terms, and the one thing specific to
// selling a printed book, that the work is theirs, is signed per book where
// it belongs rather than once in the abstract.
import { and, desc, eq, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { db } from "../db/client.js";
import { studioInvites, studioMembers, users } from "../db/schema.js";
import { authenticate, hashPassword } from "../auth/auth.js";
import { isAdmin, requireAdmin } from "./admin.js";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

const INVITE_DAYS = 30;

// May this person use the studio? An admin always may, and that is read
// from ADMIN_EMAILS rather than from a row, so there is one definition of
// admin rather than two that can disagree.
export async function inStudio(user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const [row] = await db
    .select()
    .from(studioMembers)
    .where(eq(studioMembers.userId, user.id))
    .limit(1);
  return Boolean(row);
}

// The guard for everything a studio member may reach.
export function requireStudio() {
  const signedIn = authenticate();
  return async (request, reply) => {
    await signedIn(request, reply);
    if (reply.sent) return;
    if (!(await inStudio(request.user))) {
      // 404 rather than 403, like the admin: a refusal tells somebody the
      // thing exists and is worth another try.
      return reply.code(404).send({ error: "Not found" });
    }
  };
}

export default async function studioRoutes(app) {
  // Does this account have the studio? Answered for anybody signed in, so
  // the app can decide whether to show the way in.
  app.get("/me/studio", { preHandler: authenticate({ required: false }) }, async (request) => ({
    studio: await inStudio(request.user),
    admin: isAdmin(request.user),
  }));

  // ---- inviting ----

  app.post("/admin/studio-invites", { preHandler: requireAdmin() }, async (request, reply) => {
    const body = z
      .object({ email: z.string().email(), note: z.string().max(200).optional() })
      .safeParse(request.body ?? {});
    if (!body.success) return reply.code(400).send({ error: "An invite needs an address" });

    const token = newToken();
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);

    const [made] = await db
      .insert(studioInvites)
      .values({
        email: body.data.email,
        note: body.data.note ?? null,
        tokenHash: sha256(token),
        expiresAt,
      })
      .returning();

    return reply.code(201).send({
      id: made.id,
      // Returned once. Only the hash is kept, so a lost link is withdrawn
      // and replaced rather than recovered.
      token,
      email: made.email,
      expiresAt,
    });
  });

  app.get("/admin/studio-invites", { preHandler: requireAdmin() }, async () => {
    const rows = await db.select().from(studioInvites).orderBy(desc(studioInvites.createdAt));
    return {
      invites: rows.map(({ tokenHash, ...rest }) => ({
        ...rest,
        state: rest.revokedAt
          ? "withdrawn"
          : rest.acceptedAt
            ? "accepted"
            : rest.expiresAt < new Date()
              ? "expired"
              : "waiting",
      })),
    };
  });

  app.post("/admin/studio-invites/:id/revoke", { preHandler: requireAdmin() }, async (request, reply) => {
    const [updated] = await db
      .update(studioInvites)
      .set({ revokedAt: new Date() })
      .where(and(eq(studioInvites.id, request.params.id), isNull(studioInvites.acceptedAt)))
      .returning();

    if (!updated) {
      return reply.code(409).send({ error: "That invite has been used already, or does not exist" });
    }
    return { id: updated.id, revokedAt: updated.revokedAt };
  });

  // ---- opening the link ----

  app.get("/studio/invite/:token", async (request, reply) => {
    const [invite] = await db
      .select()
      .from(studioInvites)
      .where(eq(studioInvites.tokenHash, sha256(request.params.token)))
      .limit(1);

    // One answer for unknown, withdrawn and used, so none of them says
    // which it is.
    if (!invite || invite.revokedAt || invite.acceptedAt) {
      return reply.code(404).send({ error: "That invitation is not open" });
    }
    if (invite.expiresAt < new Date()) {
      return reply.code(410).send({ error: "That invitation has expired. Ask us for a new one." });
    }

    return { email: invite.email, expiresAt: invite.expiresAt };
  });

  app.post(
    "/studio/invite/:token/accept",
    { preHandler: authenticate({ required: false }) },
    async (request, reply) => {
      const body = z
        .object({
          username: z.string().trim().min(2).max(40).optional(),
          password: z.string().min(8).max(200).optional(),
        })
        .safeParse(request.body ?? {});

      if (!body.success) {
        return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Check those details" });
      }

      const [invite] = await db
        .select()
        .from(studioInvites)
        .where(eq(studioInvites.tokenHash, sha256(request.params.token)))
        .limit(1);

      if (!invite || invite.revokedAt || invite.acceptedAt) {
        return reply.code(404).send({ error: "That invitation is not open" });
      }
      if (invite.expiresAt < new Date()) {
        return reply.code(410).send({ error: "That invitation has expired. Ask us for a new one." });
      }

      let userId = request.user?.id ?? null;

      if (!userId) {
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, invite.email))
          .limit(1);

        if (existing) {
          // A link is not enough to take over an account that exists. They
          // sign in first, then open it again, and the branch above runs.
          return reply.code(409).send({
            error: "There is already an account on this address. Sign in first, then open this link again.",
            needsSignIn: true,
          });
        }

        if (!body.data.username || !body.data.password) {
          return reply.code(400).send({ error: "Choose a username and a password to continue" });
        }

        const [made] = await db
          .insert(users)
          .values({
            email: invite.email,
            username: `@${String(body.data.username).replace(/^@+/, "")}`,
            passwordHash: await hashPassword(body.data.password),
            // The invitation went to this address and they opened it, which
            // is the same proof a verification code gives.
            emailVerifiedAt: new Date(),
          })
          .returning();
        userId = made.id;
      }

      await db
        .insert(studioMembers)
        .values({ userId, invitedEmail: invite.email })
        .onConflictDoNothing();

      await db
        .update(studioInvites)
        .set({ acceptedAt: new Date(), acceptedBy: userId })
        .where(eq(studioInvites.id, invite.id));

      return reply.code(201).send({
        // They still sign in to get a session. The invite proved who they
        // are, not that this browser is theirs.
        nextStep: request.user ? "studio" : "signin",
      });
    }
  );
}
