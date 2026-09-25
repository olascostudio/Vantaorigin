// Accounts, passwords and sessions, all in our own tables.
//
// Passwords: argon2id. Sessions: a random token in an httpOnly cookie, stored
// only as a SHA-256 hash, so a database dump cannot be replayed as a login.
// Nothing here depends on a provider, so a VPS move changes nothing.
import { createHash, randomBytes, randomInt } from "node:crypto";
import { argon2id, argon2Verify } from "hash-wasm";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { sessions, tokens, users } from "../db/schema.js";
import { config, isProduction } from "../config.js";

export const SESSION_COOKIE = "vo_session";

// OWASP's recommended argon2id settings. hash-wasm is a WebAssembly build, so
// there is no native binary to compile: it behaves the same on Windows, inside
// the Alpine container and on a VPS.
const ARGON_OPTIONS = { parallelism: 1, iterations: 2, memorySize: 19456, hashLength: 32 };

export const hashPassword = (password) =>
  argon2id({ password, salt: randomBytes(16), outputType: "encoded", ...ARGON_OPTIONS });

export async function verifyPassword(storedHash, password) {
  try {
    return await argon2Verify({ password, hash: storedHash });
  } catch {
    return false;
  }
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

export async function createSession(userId) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_DAYS * 86_400_000);
  await db.insert(sessions).values({ userId, tokenHash: sha256(token), expiresAt });
  return { token, expiresAt };
}

export async function userForToken(token) {
  if (!token) return null;
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row?.user ?? null;
}

export async function destroySession(token) {
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

// One-time 4-digit codes for email verification and password resets, to match
// the screens. Short codes are only safe with the guards below: ten minutes,
// five guesses, one live code per person per purpose, plus the API rate limit.
const MAX_ATTEMPTS = 5;
export const CODE_TTL_MINUTES = 10;
// Asking again straight away only sends a second message that makes the first
// one wrong, so there is a wait between codes.
export const RESEND_COOLDOWN_SECONDS = 30;

const codeHash = (userId, kind, code) => sha256(`${userId}:${kind}:${code}`);

export async function issueCode(userId, kind) {
  const code = String(randomInt(0, 10_000)).padStart(4, "0");
  // Any earlier code for this purpose stops working.
  await db.delete(tokens).where(and(eq(tokens.userId, userId), eq(tokens.kind, kind)));
  await db.insert(tokens).values({
    userId,
    kind,
    tokenHash: codeHash(userId, kind, code),
    expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
  });
  return code;
}

// Seconds left before this person may ask for another code of this kind;
// 0 when they may ask now.
export async function codeCooldown(userId, kind) {
  const [row] = await db
    .select({ createdAt: tokens.createdAt })
    .from(tokens)
    .where(and(eq(tokens.userId, userId), eq(tokens.kind, kind)))
    .limit(1);

  if (!row) return 0;
  const secondsSince = (Date.now() - new Date(row.createdAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince));
}

// Returns "ok", "invalid" or "too_many". Only consumes the code when asked,
// so a code can be checked on one screen and used on the next.
export async function checkCode(userId, kind, code, { consume = false } = {}) {
  const [row] = await db
    .select()
    .from(tokens)
    .where(and(eq(tokens.userId, userId), eq(tokens.kind, kind), isNull(tokens.usedAt)))
    .limit(1);

  if (!row || row.expiresAt < new Date()) return "invalid";
  if (row.attempts >= MAX_ATTEMPTS) return "too_many";

  if (row.tokenHash !== codeHash(userId, kind, String(code))) {
    await db
      .update(tokens)
      .set({ attempts: row.attempts + 1 })
      .where(eq(tokens.id, row.id));
    return "invalid";
  }

  if (consume) {
    await db.update(tokens).set({ usedAt: new Date() }).where(eq(tokens.id, row.id));
  }
  return "ok";
}

export function setSessionCookie(reply, token, expiresAt) {
  reply.setCookie(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: config.COOKIE_SAMESITE,
    // "none" is only accepted over https
    secure: isProduction || config.COOKIE_SAMESITE === "none",
    domain: config.COOKIE_DOMAIN,
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply) {
  reply.clearCookie(SESSION_COOKIE, {
    path: "/",
    sameSite: config.COOKIE_SAMESITE,
    secure: isProduction || config.COOKIE_SAMESITE === "none",
    domain: config.COOKIE_DOMAIN,
  });
}

// Fastify hook: attaches request.user, or 401s when required.
export function authenticate({ required = true } = {}) {
  return async (request, reply) => {
    request.user = await userForToken(request.cookies?.[SESSION_COOKIE]);
    if (required && !request.user) {
      return reply.code(401).send({ error: "Please sign in" });
    }
  };
}

// What the browser is allowed to see about an account.
export const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  bio: user.bio,
  dateOfBirth: user.dateOfBirth,
  avatarUrl: user.avatarUrl,
  bannerUrl: user.bannerUrl,
  emailVerified: Boolean(user.emailVerifiedAt),
});
