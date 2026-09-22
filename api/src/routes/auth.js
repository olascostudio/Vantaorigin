import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { mailer } from "../adapters/email.js";
import { config } from "../config.js";
import {
  SESSION_COOKIE,
  authenticate,
  clearSessionCookie,
  consumeToken,
  createSession,
  destroySession,
  hashPassword,
  issueToken,
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

    const token = await issueToken(user.id, "verify_email", 60 * 24);
    await mailer.send({
      to: email,
      subject: "Verify your VantaOrigin account",
      html: `<p>Welcome to VantaOrigin.</p><p><a href="${config.APP_ORIGIN}/signup/verify?token=${token}">Verify your email</a></p>`,
    });

    const session = await createSession(user.id);
    setSessionCookie(reply, session.token, session.expiresAt);
    return reply.code(201).send({ user: publicUser(user) });
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

  app.post("/auth/verify-email", async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.body);
    const userId = await consumeToken(token, "verify_email");
    if (!userId) return reply.code(400).send({ error: "That link has expired" });
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
    return { ok: true };
  });

  app.post("/auth/forgot-password", async (request) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (user) {
      const token = await issueToken(user.id, "reset_password", 60);
      await mailer.send({
        to: user.email,
        subject: "Reset your VantaOrigin password",
        html: `<p><a href="${config.APP_ORIGIN}/forgot-password/reset?token=${token}">Choose a new password</a></p><p>This link lasts one hour.</p>`,
      });
    }
    // Always the same reply, so the form cannot reveal who has an account.
    return { ok: true };
  });

  app.post("/auth/reset-password", async (request, reply) => {
    const { token, password } = z
      .object({ token: z.string(), password: z.string().min(8) })
      .parse(request.body);

    const userId = await consumeToken(token, "reset_password");
    if (!userId) return reply.code(400).send({ error: "That link has expired" });

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(users.id, userId));

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
