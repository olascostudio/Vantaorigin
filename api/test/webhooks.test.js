// What the sender tells us afterwards.
//
// This is the one route where an unauthenticated stranger can stop somebody
// else's mail, so the signature gets more attention here than the happy
// path does. After that: a hard bounce suppresses and the next send skips
// the address, a soft one does not, and a replay changes nothing.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { createHmac, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

const dataDir = ".pglite-webhooks-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
// A real-looking secret: `whsec_` plus base64, which is what the dashboard
// hands out.
const SECRET = `whsec_${Buffer.from("a-secret-nobody-else-has").toString("base64")}`;
process.env.RESEND_WEBHOOK_SECRET = SECRET;

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { db, endConnection } = await import("../src/db/client.js");
const { emailLog, suppressionList, webhookEvents } = await import("../src/db/schema.js");
const { mailer } = await import("../src/adapters/email.js");
const { TRANSACTIONAL, MARKETING } = await import("../src/email-classes.js");

let app;

// Signed the way Svix documents it: HMAC-SHA256 over `id.timestamp.body`,
// base64, with the key being the base64-decoded part after `whsec_`.
const sign = (id, timestamp, body, secret = SECRET) =>
  `v1,${createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64"))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64")}`;

const deliver = (payload, { id = randomUUID(), at = Math.floor(Date.now() / 1000), signature, secret } = {}) => {
  const body = JSON.stringify(payload);
  return app.inject({
    method: "POST",
    url: "/webhooks/resend",
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": String(at),
      "svix-signature": signature ?? sign(id, String(at), body, secret),
    },
    payload: body,
  });
};

const event = (type, extra = {}) => ({
  type,
  created_at: new Date().toISOString(),
  data: {
    email_id: "msg-from-resend",
    to: ["reader@example.com"],
    subject: "A letter",
    ...extra,
  },
});

const logRow = async (id = "msg-from-resend") => {
  const [row] = await db
    .select()
    .from(emailLog)
    .where(sql`${emailLog.providerMessageId} = ${id}`);
  return row ?? null;
};

const suppressions = () => db.select().from(suppressionList);

before(async () => {
  await migrate();
  app = await buildApp();
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await db.delete(webhookEvents);
  await db.delete(suppressionList);
  await db.delete(emailLog);
  await db.insert(emailLog).values({
    email: "reader@example.com",
    class: MARKETING,
    template: "issue",
    providerMessageId: "msg-from-resend",
    status: "sent",
  });
});

// --- the signature -------------------------------------------------------

test("an unsigned webhook is refused and changes nothing", async () => {
  const body = JSON.stringify(event("email.bounced", { bounce: { type: "Permanent" } }));
  const res = await app.inject({
    method: "POST",
    url: "/webhooks/resend",
    headers: { "content-type": "application/json" },
    payload: body,
  });

  assert.equal(res.statusCode, 401);
  assert.equal((await suppressions()).length, 0);
  assert.equal((await logRow()).status, "sent");
});

test("a wrong signature is refused", async () => {
  const res = await deliver(event("email.delivered"), { signature: "v1,bm90LWEtc2lnbmF0dXJl" });
  assert.equal(res.statusCode, 401);
  assert.equal((await logRow()).status, "sent");
});

test("a signature made with another secret is refused", async () => {
  const res = await deliver(event("email.delivered"), {
    secret: `whsec_${Buffer.from("the-wrong-secret").toString("base64")}`,
  });
  assert.equal(res.statusCode, 401);
});

test("a genuine signature over a body somebody edited afterwards is refused", async () => {
  const id = randomUUID();
  const at = String(Math.floor(Date.now() / 1000));
  const honest = JSON.stringify(event("email.delivered"));

  // Signed over one body, sent with another. This is the attack the raw
  // body exists to stop: parse and re-serialise and both would match.
  const res = await app.inject({
    method: "POST",
    url: "/webhooks/resend",
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": at,
      "svix-signature": sign(id, at, honest),
    },
    payload: JSON.stringify(event("email.bounced", { bounce: { type: "Permanent" } })),
  });

  assert.equal(res.statusCode, 401);
  assert.equal((await suppressions()).length, 0);
});

test("a correctly signed but stale webhook is refused", async () => {
  const res = await deliver(event("email.delivered"), {
    at: Math.floor(Date.now() / 1000) - 3600,
  });
  assert.equal(res.statusCode, 401);
});

test("the header may carry several signatures, and one matching is enough", async () => {
  const id = randomUUID();
  const at = String(Math.floor(Date.now() / 1000));
  const body = JSON.stringify(event("email.delivered"));

  // What a secret mid-rotation looks like: the old one first, then the real
  // one.
  const res = await deliver(event("email.delivered"), {
    id,
    at: Number(at),
    signature: `v1,b2xkLXNpZ25hdHVyZQ== ${sign(id, at, body)}`,
  });

  assert.equal(res.statusCode, 200);
});

test("with no secret configured, nothing is believed", async () => {
  const { whyNotSigned } = await import("../src/webhooks/signature.js");
  // An unset secret must not read as "allow": that would turn a missing
  // environment variable into an open door onto the suppression list.
  assert.match(whyNotSigned({ secret: "", id: "a", timestamp: "1", signature: "v1,x", body: "" }), /no webhook secret/);
});

// --- what the events do --------------------------------------------------

test("a delivery is recorded against the message it is about", async () => {
  const res = await deliver(event("email.delivered"));

  assert.equal(res.statusCode, 200);
  assert.equal((await logRow()).status, "delivered");
});

test("a hard bounce suppresses the address, and the next send skips it", async () => {
  const res = await deliver(
    event("email.bounced", { bounce: { type: "Permanent", subType: "General" } })
  );
  assert.equal(res.statusCode, 200);

  const [row] = await suppressions();
  assert.equal(row.email, "reader@example.com");
  assert.equal(row.reason, "hard_bounce");
  assert.equal((await logRow()).status, "bounced");

  // The point of the whole exercise: the sender itself now refuses.
  const answer = await mailer.send({
    to: "reader@example.com",
    kind: MARKETING,
    template: "issue",
    subject: "The next letter",
    html: "<p>Hello</p>",
    text: "Hello",
  });
  assert.equal(answer.blocked, true);
  assert.match(answer.reason, /hard bounced/);
});

test("a hard bounce stops even a password reset, because the mailbox is gone", async () => {
  await deliver(event("email.bounced", { bounce: { type: "Permanent" } }));

  const answer = await mailer.send({
    to: "reader@example.com",
    kind: TRANSACTIONAL,
    template: "reset",
    subject: "Your code",
    html: "<p>123456</p>",
    text: "123456",
  });

  // Not a policy choice. An address that does not exist cannot be told
  // anything, and insisting damages delivery for everybody else.
  assert.equal(answer.blocked, true);
});

test("a soft bounce does not suppress: a full mailbox is not a gone one", async () => {
  for (const type of ["Temporary", "Transient", "Undetermined"]) {
    await db.delete(suppressionList);
    await db.delete(webhookEvents);

    const res = await deliver(event("email.bounced", { bounce: { type } }));
    assert.equal(res.statusCode, 200);
    assert.equal((await suppressions()).length, 0, `${type} must not suppress`);
  }
});

test("a bounce type nobody has seen before does not suppress either", async () => {
  // The documentation gives two different lists of these strings, so an
  // unknown value is expected rather than impossible. Suppressing wrongly
  // stops somebody's mail for good and shows up nowhere; not suppressing
  // costs one more bounce.
  const res = await deliver(event("email.bounced", { bounce: { type: "SomethingNew" } }));

  assert.equal(res.statusCode, 200);
  assert.equal((await suppressions()).length, 0);
  // Still recorded, so the real set of values can be read off the log.
  assert.equal((await db.select().from(webhookEvents)).length, 1);
});

test("a bounce with no type at all does not suppress", async () => {
  await deliver(event("email.bounced"));
  assert.equal((await suppressions()).length, 0);
});

test("a complaint suppresses, and still lets a password reset through", async () => {
  await deliver(event("email.complained"));

  const [row] = await suppressions();
  assert.equal(row.reason, "complaint");

  const marketing = await mailer.send({
    to: "reader@example.com",
    kind: MARKETING,
    template: "issue",
    subject: "A letter",
    html: "<p>Hello</p>",
    text: "Hello",
  });
  assert.equal(marketing.blocked, true);

  // Pressing "report spam" is not a reason to lock somebody out of their
  // own account.
  const reset = await mailer.send({
    to: "reader@example.com",
    kind: TRANSACTIONAL,
    template: "reset",
    subject: "Your code",
    html: "<p>123456</p>",
    text: "123456",
  });
  assert.equal(reset.blocked, undefined);
});

// --- replays -------------------------------------------------------------

test("the same event twice leaves one row and changes nothing the second time", async () => {
  const id = randomUUID();
  const payload = event("email.complained");

  const first = await deliver(payload, { id });
  const second = await deliver(payload, { id });

  assert.equal(first.statusCode, 200);
  // 200 on purpose: a replay is not an error, and saying otherwise only
  // earns another retry.
  assert.equal(second.statusCode, 200);
  assert.equal(second.json().repeat, true);

  assert.equal((await db.select().from(webhookEvents)).length, 1);
  assert.equal((await suppressions()).length, 1);
});

test("an address that bounces again does not grow a second row", async () => {
  await deliver(event("email.bounced", { bounce: { type: "Permanent" } }));
  await deliver(event("email.bounced", { bounce: { type: "Permanent" } }));

  // Two genuine events, two webhook rows, one suppression. A lookup that
  // runs before every send must not get slower every week.
  assert.equal((await db.select().from(webhookEvents)).length, 2);
  assert.equal((await suppressions()).length, 1);
});

// --- out of order --------------------------------------------------------

test("a status only moves forward, however the events arrive", async () => {
  await deliver(event("email.opened"));
  assert.equal((await logRow()).status, "opened");

  // Delivery turning up after the open is normal: retries reorder freely.
  await deliver(event("email.delivered"));
  assert.equal((await logRow()).status, "opened", "it must not walk backwards");
});

test("an open arriving after a complaint does not bury it", async () => {
  await deliver(event("email.complained"));
  assert.equal((await logRow()).status, "complained");

  await deliver(event("email.opened"));
  assert.equal(
    (await logRow()).status,
    "complained",
    "the most consequential thing anybody told us stays"
  );
});

// --- the id the documentation would not settle ---------------------------

test("a message is found by either id the payload might carry", async () => {
  // The documentation defines both `email_id` and `message_id` and never
  // says which equals the id a send recorded. Guessing wrong would mean
  // every webhook silently matching nothing, so both are tried.
  await db.delete(emailLog);
  await db.insert(emailLog).values({
    email: "reader@example.com",
    class: MARKETING,
    template: "issue",
    providerMessageId: "<111-222@email.example.com>",
    status: "sent",
  });

  const res = await deliver(
    event("email.delivered", {
      email_id: "some-other-id",
      message_id: "<111-222@email.example.com>",
    })
  );

  assert.equal(res.statusCode, 200);
  assert.equal((await logRow("<111-222@email.example.com>")).status, "delivered");
});

test("an event about a message we have no record of is kept, not an error", async () => {
  await db.delete(emailLog);

  const res = await deliver(event("email.delivered"));

  // Mail sent from the dashboard by hand, or from before any of this
  // existed. Nothing to update is not a failure.
  assert.equal(res.statusCode, 200);
  assert.equal((await db.select().from(webhookEvents)).length, 1);
});

test("an event type we do not handle is kept rather than refused", async () => {
  const res = await deliver(event("email.scheduled"));

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().ignored, "email.scheduled");
  assert.equal((await db.select().from(webhookEvents)).length, 1);
  assert.equal((await logRow()).status, "sent");
});
