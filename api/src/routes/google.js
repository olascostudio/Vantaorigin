// Signing in with Google.
//
// The authorization-code flow by hand: no SDK, two HTTP calls, so moving to
// another provider (or another host) changes nothing but the addresses. It is
// switched on by setting GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; without
// them the routes answer plainly instead of half-working.
//
// The account is keyed on the email address Google confirms, so somebody who
// signed up with a password and later presses "Continue with Google" lands in
// the same account rather than a second one.
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { userByHandle } from "../db/handles.js";
import { createSession, hashPassword, setSessionCookie } from "../auth/auth.js";
import { mailer } from "../adapters/email.js";
import { welcomeEmail } from "../emails/templates.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PROFILE_URL = "https://openidconnect.googleapis.com/v1/userinfo";

// Holds the one-time state and where to go afterwards, for the few seconds
// the person is away at Google.
const HANDOFF_COOKIE = "vo_oauth";

// Google's client ids all end the same way. Checking the shape here means a
// wrong value shows as "not set up yet" on our own screen, rather than as
// Google's "invalid client" after the browser has already left the site.
export const looksLikeClientId = (value) =>
  typeof value === "string" &&
  /^[^\s<>"']+\.apps\.googleusercontent\.com$/.test(value.trim());

export const googleReady = () =>
  Boolean(
    looksLikeClientId(config.GOOGLE_CLIENT_ID) &&
      config.GOOGLE_CLIENT_SECRET &&
      !/[\s<>]/.test(config.GOOGLE_CLIENT_SECRET) &&
      config.API_PUBLIC_URL
  );

// Said once at boot, where whoever set the value will see it.
export const googleConfigNote = () => {
  if (googleReady()) return null;
  if (!config.GOOGLE_CLIENT_ID && !config.GOOGLE_CLIENT_SECRET) return null; // simply off
  if (!looksLikeClientId(config.GOOGLE_CLIENT_ID)) {
    return "GOOGLE_CLIENT_ID does not look like a Google client id (it should end in .apps.googleusercontent.com). Google sign-in stays off.";
  }
  if (!config.API_PUBLIC_URL) {
    return "API_PUBLIC_URL is not set, so the Google redirect address cannot be built. Google sign-in stays off.";
  }
  return "GOOGLE_CLIENT_SECRET looks wrong. Google sign-in stays off.";
};

const appOrigin = () => config.APP_ORIGIN.split(",")[0].trim().replace(/\/$/, "");
const redirectUri = () => `${config.API_PUBLIC_URL.replace(/\/$/, "")}/auth/google/callback`;

// Somewhere inside our own app, never an address handed to us by a stranger.
const safeNext = (next) =>
  typeof next === "string" && /^\/[^/\\]/.test(next) ? next : "/creators-hub";

// "ola.oriola@gmail.com" wants to be @olaoriola. Taken names get a few digits.
export async function usernameFrom(email, name) {
  const base =
    (email || "").split("@")[0].replace(/[^a-z0-9_.]/gi, "").toLowerCase() ||
    (name || "").replace(/[^a-z0-9_.]/gi, "").toLowerCase() ||
    "creator";
  const stem = base.slice(0, 24).padEnd(3, "0");

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? stem : `${stem}${Math.floor(Math.random() * 9000) + 1000}`;
    if (!(await userByHandle(candidate, { id: users.id }))) return `@${candidate}`;
  }
  return `@${stem}${Date.now().toString().slice(-6)}`;
}

export default async function googleRoutes(app) {
  // Lets the sign-in screen show the button only when it will work — and,
  // when it will not, says which setting is wrong in terms that can be acted
  // on without reading a server log.
  //
  // Values are never echoed back. A client id is public, but a secret pasted
  // into the wrong box would not be, so both are described rather than
  // shown: enough to recognise "that is my secret, in the wrong field", not
  // enough to use.
  app.get("/auth/google/available", async () => {
    const describe = (value) => {
      if (!value) return { set: false };
      const text = String(value);
      return {
        set: true,
        length: text.length,
        startsWith: text.slice(0, 7),
        hasSpacesOrBrackets: /[\s<>"']/.test(text),
      };
    };

    return {
      available: googleReady(),
      reason: googleConfigNote(),
      settings: {
        GOOGLE_CLIENT_ID: {
          ...describe(config.GOOGLE_CLIENT_ID),
          endsWithGoogleSuffix: String(config.GOOGLE_CLIENT_ID || "").trim().endsWith(
            ".apps.googleusercontent.com"
          ),
        },
        GOOGLE_CLIENT_SECRET: describe(config.GOOGLE_CLIENT_SECRET),
        API_PUBLIC_URL: config.API_PUBLIC_URL || null,
      },
    };
  });

  app.get("/auth/google", async (request, reply) => {
    if (!googleReady()) {
      return reply
        .code(503)
        .send({ error: "Signing in with Google is not set up on this server yet." });
    }

    const state = randomBytes(16).toString("base64url");
    const next = safeNext(request.query.next);

    reply.setCookie(HANDOFF_COOKIE, `${state}:${next}`, {
      path: "/",
      httpOnly: true,
      // The journey leaves our site and comes back, so the cookie has to
      // survive a cross-site return.
      sameSite: "lax",
      secure: config.COOKIE_SAMESITE === "none" || config.NODE_ENV === "production",
      maxAge: 600,
    });

    const params = new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });

    return reply.redirect(`${AUTH_URL}?${params}`);
  });

  app.get("/auth/google/callback", async (request, reply) => {
    const fail = (why) =>
      reply.redirect(`${appOrigin()}/signin?error=${encodeURIComponent(why)}`);

    if (!googleReady()) return fail("Signing in with Google is not set up yet.");
    if (request.query.error) return fail("Google sign-in was cancelled.");

    const handoff = request.cookies?.[HANDOFF_COOKIE] || "";
    const [state, ...rest] = handoff.split(":");
    const next = safeNext(rest.join(":"));
    reply.clearCookie(HANDOFF_COOKIE, { path: "/" });

    // Someone else cannot start this journey on your behalf.
    if (!state || !request.query.state || request.query.state !== state) {
      return fail("That sign-in link expired. Please try again.");
    }
    if (!request.query.code) return fail("Google did not send a sign-in code.");

    let profile;
    try {
      const tokenResponse = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: request.query.code,
          client_id: config.GOOGLE_CLIENT_ID,
          client_secret: config.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri(),
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`token exchange failed (${tokenResponse.status})`);
      }
      const { access_token: accessToken } = await tokenResponse.json();

      const profileResponse = await fetch(PROFILE_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!profileResponse.ok) throw new Error(`profile read failed (${profileResponse.status})`);
      profile = await profileResponse.json();
    } catch (error) {
      request.log.error({ err: error }, "google sign-in failed");
      return fail("We could not reach Google. Please try again.");
    }

    const email = String(profile.email || "").toLowerCase();
    // An unconfirmed address could belong to anyone, and it is the only thing
    // tying this to an existing account.
    if (!email || profile.email_verified === false) {
      return fail("Google could not confirm that email address.");
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let user = existing;

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          email,
          username: await usernameFrom(email, profile.name),
          // There is no password to use; one can be set later through
          // "forgot password". Something unguessable fills the column.
          passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
          firstName: profile.given_name || "",
          lastName: profile.family_name || "",
          avatarUrl: profile.picture || null,
          emailVerifiedAt: new Date(),
        })
        .returning();

      // Somebody who arrives this way is as new as somebody who filled in
      // the form, and was getting no welcome at all: the letter was only
      // ever sent from the sign-up route.
      try {
        await mailer.send({
          to: email,
          replyTo: config.EMAIL_REPLY_TO,
          ...welcomeEmail({ user }),
        });
      } catch (error) {
        // Never at the cost of the sign-in itself.
        request.log.error({ err: error, to: email }, "welcome email failed");
      }
    } else if (!user.emailVerifiedAt) {
      // Google has just vouched for the address this account was opened with.
      await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
    }

    const session = await createSession(user.id);
    setSessionCookie(reply, session.token, session.expiresAt);
    return reply.redirect(`${appOrigin()}${next}`);
  });
}
