// Signing in with Google: the parts that do not need Google to answer.
// The journey out, the guard on the way back, and how a name is chosen.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { eq } from "drizzle-orm";

const dataDir = ".pglite-google-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";
process.env.API_PUBLIC_URL = "https://api.vantaorigin.com";
process.env.APP_ORIGIN = "https://www.vantaorigin.com";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db, schema } = await import("../src/db/client.js");
const { usernameFrom, looksLikeClientId } = await import("../src/routes/google.js");
const { looksLikePlaceholder } = await import("../src/config.js");

let app;

before(async () => {
  await migrate();
  app = await buildApp();
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("the button knows whether it will work, and why not when it will not", async () => {
  const res = await app.inject({ method: "GET", url: "/auth/google/available" });
  const body = res.json();

  assert.equal(body.available, true);
  assert.equal(body.reason, null);

  // The settings are described, never echoed: a secret in the wrong box must
  // not be handed out by the very endpoint meant to catch that.
  assert.equal(body.settings.GOOGLE_CLIENT_ID.endsWithGoogleSuffix, true);
  assert.equal(body.settings.GOOGLE_CLIENT_ID.hasSpacesOrBrackets, false);
  assert.equal(body.settings.GOOGLE_CLIENT_SECRET.set, true);
  assert.ok(!JSON.stringify(body).includes(process.env.GOOGLE_CLIENT_SECRET));
  assert.ok(!JSON.stringify(body).includes(process.env.GOOGLE_CLIENT_ID));
});

test("starting sends you to Google, with a state we remember", async () => {
  const res = await app.inject({ method: "GET", url: "/auth/google?next=/creators-hub" });
  assert.equal(res.statusCode, 302);

  const to = new URL(res.headers.location);
  assert.equal(to.origin + to.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(to.searchParams.get("client_id"), "test-client-id.apps.googleusercontent.com");
  assert.equal(
    to.searchParams.get("redirect_uri"),
    "https://api.vantaorigin.com/auth/google/callback"
  );
  assert.equal(to.searchParams.get("response_type"), "code");
  assert.equal(to.searchParams.get("scope"), "openid email profile");

  const state = to.searchParams.get("state");
  assert.ok(state && state.length > 10);

  const cookie = [].concat(res.headers["set-cookie"]).join(";");
  assert.match(cookie, new RegExp(`vo_oauth=${state}`));
  assert.match(cookie, /HttpOnly/i);
});

test("a reply carrying somebody else's state is turned away", async () => {
  const start = await app.inject({ method: "GET", url: "/auth/google" });
  const cookie = [].concat(start.headers["set-cookie"])[0].split(";")[0];

  const res = await app.inject({
    method: "GET",
    url: "/auth/google/callback?code=abc&state=not-the-one-we-sent",
    headers: { cookie },
  });

  assert.equal(res.statusCode, 302);
  assert.match(res.headers.location, /^https:\/\/www\.vantaorigin\.com\/signin\?error=/);
  assert.match(decodeURIComponent(res.headers.location), /expired/i);
});

test("a reply with no state at all is turned away", async () => {
  const res = await app.inject({ method: "GET", url: "/auth/google/callback?code=abc" });
  assert.equal(res.statusCode, 302);
  assert.match(res.headers.location, /\/signin\?error=/);
});

test("cancelling at Google comes back saying so", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/auth/google/callback?error=access_denied",
  });
  assert.match(decodeURIComponent(res.headers.location), /cancelled/i);
});

test("the journey only returns to somewhere inside the app", async () => {
  const start = await app.inject({
    method: "GET",
    url: "/auth/google?next=https://somewhere-else.example/steal",
  });
  const cookie = [].concat(start.headers["set-cookie"])[0];
  // Whatever was asked for, what we stored is one of our own pages.
  assert.match(cookie, /vo_oauth=[^;]*%3A|vo_oauth=[^;]*:\/creators-hub/);
  assert.ok(!cookie.includes("somewhere-else.example"));
});

test("a username is made from the email, and never taken twice", async () => {
  const first = await usernameFrom("ola.oriola@gmail.com", "Ola Oriola");
  assert.equal(first, "@ola.oriola");

  await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "taken@vantaorigin.test", username: "ola.oriola", password: "supersecret1" },
  });

  const second = await usernameFrom("ola.oriola@outlook.com", "Ola Oriola");
  assert.notEqual(second, "@ola.oriola");
  assert.match(second, /^@ola\.oriola\d{4}$/);

  // Even a name of one character comes out usable.
  const short = await usernameFrom("a@gmail.com", "");
  assert.match(short, /^@a00/);
});


// What actually happened live: the client id on the server was still the
// example from the instructions, "<the client id>", angle brackets and all,
// so the browser was sent to Google with nonsense and came back with
// "invalid client". A setting like that is worse than a missing one, because
// everything carries on as though it were real.
test("example text is not mistaken for a client id", () => {
  for (const wrong of [
    "<the client id>",
    "<account-id>",
    "<GOOGLE_CLIENT_ID>",
    "not-a-client-id",
    "123-abc.apps.googleusercontent.com extra",
    "",
    undefined,
  ]) {
    assert.equal(looksLikeClientId(wrong), false, JSON.stringify(wrong));
  }

  for (const right of [
    "123456-abc123.apps.googleusercontent.com",
    "  123456-abc123.apps.googleusercontent.com  ",
  ]) {
    assert.equal(looksLikeClientId(right), true, JSON.stringify(right));
  }
});

test("anything still in angle brackets is treated as unset", () => {
  for (const placeholder of ["<the client id>", "<account-id>", "  <whatever>  "]) {
    assert.equal(looksLikePlaceholder(placeholder), true, placeholder);
  }
  for (const real of ["abc", "<not closed", "a<b>c", ""]) {
    assert.equal(looksLikePlaceholder(real), false, JSON.stringify(real));
  }
});

// The gap this closes: somebody who signed up with Google got no welcome
// letter at all, because it was only ever sent from the sign-up form.
test("a new account made with Google is welcomed, a returning one is not", async () => {
  const { mailer } = await import("../src/adapters/email.js");
  const sent = [];
  const realSend = mailer.send;
  mailer.send = async (message) => {
    sent.push(message);
    return { id: "test" };
  };

  const realFetch = globalThis.fetch;
  const asGoogle = (email) => async (url) => {
    if (String(url).includes("token")) {
      return { ok: true, status: 200, json: async () => ({ access_token: "t" }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        email,
        email_verified: true,
        name: "Ola Studios",
        given_name: "Ola",
        family_name: "Studios",
        picture: "https://example.com/a.png",
      }),
    };
  };

  const walkThrough = async (email) => {
    const start = await app.inject({ method: "GET", url: "/auth/google" });
    const state = new URL(start.headers.location).searchParams.get("state");
    const cookie = [].concat(start.headers["set-cookie"])[0].split(";")[0];
    globalThis.fetch = asGoogle(email);
    return app.inject({
      method: "GET",
      url: `/auth/google/callback?code=abc&state=${state}`,
      headers: { cookie },
    });
  };

  try {
    const first = await walkThrough("welcome-me@vantaorigin.test");
    assert.equal(first.statusCode, 302);
    assert.equal(sent.length, 1, "a new account gets the letter");
    assert.equal(sent[0].subject, "Welcome to VantaOrigin");
    assert.match(sent[0].html, /I'm Ola, the founder/);
    assert.equal(sent[0].replyTo, "hello@vantaorigin.com");

    // And joins the newsletter, like anybody else who makes an account.
    const [subscriber] = await db
      .select()
      .from(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.email, "welcome-me@vantaorigin.test"))
      .limit(1);
    assert.equal(subscriber.status, "subscribed");
    assert.equal(subscriber.source, "google");

    // Signing in again is not a new beginning.
    await walkThrough("welcome-me@vantaorigin.test");
    assert.equal(sent.length, 1, "coming back does not send it again");
  } finally {
    mailer.send = realSend;
    globalThis.fetch = realFetch;
  }
});
