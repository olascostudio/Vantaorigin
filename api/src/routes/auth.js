import { z } from "zod";
import { config } from "../config.js";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import { mailer } from "../adapters/email.js";
// While emails only print to the terminal (local development), the code is
// also returned so you can finish the flow without an inbox. Never in
// production, where EMAIL_DRIVER is "resend".
const devCode = (code) => (config.EMAIL_DRIVER === "console" ? { devCode: code } : {});

// A rejected email must never take down the request that triggered it: the
// account still exists, and the code can be asked for again.
async function trySend(app, message) {
  try {
    await mailer.send(message);
    return true;
  } catch (error) {
    app.log.error({ err: error, to: message.to }, "email failed");
    return false;
  }
}

import {
  SESSION_COOKIE,
  authenticate,
  checkCode,
  clearSessionCookie,
  createSession,
  destroySession,
  hashPassword,
  issueCode,
  publicUser,
  setSessionCookie,
  verifyPassword,
} from "../auth/auth.js";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Use at least 8 characters"),
});

const signUpBody = credentials.extend({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^@?[a-z0-9_.]+$/i, "Letters, numbers, dots and underscores only"),
});

export default async function authRoutes(app) {
  app.post("/auth/signup", async (request, reply) => {
    const body = signUpBody.parse(request.body);
    const email = body.email.toLowerCase();
    const username = body.username.startsWith("@") ? body.username : `@${body.username}`;

    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (taken) return reply.code(409).send({ error: "That email is already registered" });

    const [user] = await db
      .insert(users)
      .values({ email, username, passwordHash: await hashPassword(body.password) })
      .returning();

    const code = await issueCode(user.id, "verify_email");
    const sent = await trySend(app, {
      to: email,
      subject: "Your VantaOrigin verification code",
      html: `<p>Welcome to VantaOrigin.</p><p>Your code is <b>${code}</b>. It lasts 15 minutes.</p>`,
    });

    const session = await createSession(user.id);
    setSessionCookie(reply, session.token, session.expiresAt);
    return reply.code(201).send({ user: publicUser(user), emailSent: sent, ...devCode(code) });
  });

  app.post("/auth/signin", async (request, reply) => {
    const body = credentials.parse(request.body);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);

    // Same answer either way, so this cannot be used to discover emails.
    if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
      return reply.code(401).send({ error: "Email or password is incorrect" });
    }

    const session = await createSession(user.id);
    setSessionCookie(reply, session.token, session.expiresAt);
    return { user: publicUser(user) };
  });

  app.post("/auth/signout", async (request, reply) => {
    await destroySession(request.cookies?.[SESSION_COOKIE]);
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/auth/me", { preHandler: authenticate({ required: false }) }, async (request) => ({
    user: request.user ? publicUser(request.user) : null,
  }));

  // The person is signed in straight after signing up, so the code is checked
  // against their session rather than an email typed in again.
  app.post("/auth/verify-email", { preHandler: authenticate() }, async (request, reply) => {
    const { code } = z.object({ code: z.string().length(4) }).parse(request.body);
    const result = await checkCode(request.user.id, "verify_email", code, { consume: true });

    if (result === "too_many") {
      return reply.code(429).send({ error: "Too many attempts. Ask for a new code." });
    }
    if (result !== "ok") return reply.code(400).send({ error: "That code is wrong or expired" });

    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, request.user.id));
    return { ok: true };
  });

  app.post("/auth/resend-code", { preHandler: authenticate() }, async (request, reply) => {
    const code = await issueCode(request.user.id, "verify_email");
    const sent = await trySend(app, {
      to: request.user.email,
      subject: "Your VantaOrigin verification code",
      html: `<p>Your code is ${code}. It lasts 15 minutes.</p>`,
    });
    if (!sent) return reply.code(502).send({ error: "We could not send that email. Try again shortly." });
    return { ...devCode(code), ok: true };
  });

  app.post("/auth/forgot-password", async (request) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    let sentCode = null;
    if (user) {
      const code = await issueCode(user.id, "reset_password");
      sentCode = code;
      await trySend(app, {
        to: user.email,
        subject: "Your VantaOrigin reset code",
        html: `<p>Your password reset code is <b>${code}</b>. It lasts 15 minutes.</p>`,
      });
    }
    // Always the same reply, so the form cannot reveal who has an account.
    return { ok: true, ...(sentCode ? devCode(sentCode) : {}) };
  });

  // Step one of a reset: is this code right? Checked but not used up, so the
  // next screen can set the new password.
  app.post("/auth/check-reset-code", async (request, reply) => {
    const { email, code } = z
      .object({ email: z.string().email(), code: z.string().length(4) })
      .parse(request.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const result = user ? await checkCode(user.id, "reset_password", code) : "invalid";
    if (result === "too_many") {
      return reply.code(429).send({ error: "Too many attempts. Ask for a new code." });
    }
    if (result !== "ok") return reply.code(400).send({ error: "That code is wrong or expired" });
    return { ok: true };
  });

  // Step two: the code is used up here.
  app.post("/auth/reset-password", async (request, reply) => {
    const { email, code, password } = z
      .object({ email: z.string().email(), code: z.string().length(4), password: z.string().min(8) })
      .parse(request.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const result = user
      ? await checkCode(user.id, "reset_password", code, { consume: true })
      : "invalid";
    if (result !== "ok") return reply.code(400).send({ error: "That code is wrong or expired" });

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // Signing out everywhere is the point of a reset.
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    return { ok: true };
  });

  // Changing a password while signed in: the current one must be right.
  app.post("/me/password", { preHandler: authenticate() }, async (request, reply) => {
    const { currentPassword, password } = z
      .object({ currentPassword: z.string(), password: z.string().min(8) })
      .parse(request.body);

    if (!(await verifyPassword(request.user.passwordHash, currentPassword))) {
      return reply.code(400).send({ error: "Your current password is not right" });
    }

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(users.id, request.user.id));

    return { ok: true };
  });

  // Profile settings (the Settings page).
  app.patch("/me", { preHandler: authenticate() }, async (request) => {
    const body = z
      .object({
        firstName: z.string().max(80).optional(),
        lastName: z.string().max(80).optional(),
        username: z.string().min(3).max(30).optional(),
        bio: z.string().max(500).optional(),
        dateOfBirth: z.string().max(20).optional(),
        avatarUrl: z.string().nullable().optional(),
        bannerUrl: z.string().nullable().optional(),
      })
      .parse(request.body);

    const [user] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, request.user.id))
      .returning();

    return { user: publicUser(user) };
  });
}
