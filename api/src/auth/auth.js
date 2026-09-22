// Accounts, passwords and sessions, all in our own tables.
//
// Passwords: argon2id. Sessions: a random token in an httpOnly cookie, stored
// only as a SHA-256 hash, so a database dump cannot be replayed as a login.
// Nothing here depends on a provider, so a VPS move changes nothing.
import { createHash, randomBytes } from "node:crypto";
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

// One-time links for email verification and password resets.
export async function issueToken(userId, kind, ttlMinutes = 60) {
  const token = newToken();
  await db.insert(tokens).values({
    userId,
    kind,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
  });
  return token;
}

export async function consumeToken(token, kind) {
  const [row] = await db
    .select()
    .from(tokens)
    .where(
      and(
        eq(tokens.tokenHash, sha256(token)),
        eq(tokens.kind, kind),
        isNull(tokens.usedAt),
        gt(tokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!row) return null;
  await db.update(tokens).set({ usedAt: new Date() }).where(eq(tokens.id, row.id));
  return row.userId;
}

export function setSessionCookie(reply, token, expiresAt) {
  reply.setCookie(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    domain: config.COOKIE_DOMAIN,
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply) {
  reply.clearCookie(SESSION_COOKIE, { path: "/", domain: config.COOKIE_DOMAIN });
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
