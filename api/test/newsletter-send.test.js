// Sending a letter: a test copy first, then the real one -- to the people on
// the list, each with their own way out, and never twice.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";

const dataDir = ".pglite-send-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "editor@vantaorigin.test";
process.env.API_PUBLIC_URL = "https://api.vantaorigin.com";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db, schema } = await import("../src/db/client.js");
const { mailer } = await import("../src/adapters/email.js");
const { deliver, whyNotSendable } = await import("../src/newsletter-send.js");

let app;
let editor;
let sent = [];
const realSend = mailer.send;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

// A draft with something in it, ready to go out.
const writtenIssue = async (subject = "A letter") => {
  const made = await app.inject({
    method: "POST",
    url: "/admin/newsletter/issues",
    headers: { cookie: editor },
    payload: {
      subject,
      blocks: [
        { type: "heading", text: "Hello" },
        { type: "text", text: "Something worth reading." },
      ],
    },
  });
  return made.json();
};

const join = (email) =>
  app.inject({ method: "POST", url: "/newsletter/subscribe", payload: { email } });

before(async () => {
  await migrate();
  app = await buildApp();

  editor = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "editor@vantaorigin.test", username: "editor", password: "supersecret1" },
    })
  );

  // Making an account joins the list, which would put the writer among the
  // readers. Taken off, so the list here is exactly the readers named below.
  const [writer] = await db
    .select()
    .from(schema.newsletterSubscribers)
    .where(eq(schema.newsletterSubscribers.email, "editor@vantaorigin.test"));
  await app.inject({ method: "GET", url: `/newsletter/unsubscribe?token=${writer.token}` });

  // Three readers, one of whom has since left.
  await join("one@example.com");
  await join("two@example.com");
  await join("gone@example.com");
  const [leaver] = await db
    .select()
    .from(schema.newsletterSubscribers)
    .where(eq(schema.newsletterSubscribers.email, "gone@example.com"));
  await app.inject({ method: "GET", url: `/newsletter/unsubscribe?token=${leaver.token}` });

  mailer.send = async (message) => {
    sent.push(message);
    return { id: `test-${sent.length}` };
  };
});

after(async () => {
  mailer.send = realSend;
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("a letter with nothing in it refuses to go", () => {
  assert.match(whyNotSendable({ subject: "", blocks: [] }, 5), /subject/i);
  assert.match(whyNotSendable({ subject: "Hi", blocks: [] }, 5), /nothing written/i);
  assert.match(
    whyNotSendable({ subject: "Hi", blocks: [{ type: "text", text: "  " }] }, 5),
    /nothing written/i
  );
  // Written, but to nobody.
  assert.match(
    whyNotSendable({ subject: "Hi", blocks: [{ type: "text", text: "Words" }] }, 0),
    /Nobody is waiting/i
  );
  assert.equal(whyNotSendable({ subject: "Hi", blocks: [{ type: "text", text: "Words" }] }, 2), null);
});

test("the send route turns away a letter that is not ready", async () => {
  const empty = await app.inject({
    method: "POST",
    url: "/admin/newsletter/issues",
    headers: { cookie: editor },
    payload: { subject: "" },
  });

  const res = await app.inject({
    method: "POST",
    url: `/admin/newsletter/issues/${empty.json().id}/send`,
    headers: { cookie: editor },
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.json().error, /subject/i);
  assert.equal(sent.length, 0);
});

test("a test copy goes to the writer, says it is a test, and touches nothing", async () => {
  const issue = await writtenIssue("Testing one two");
  sent = [];

  const res = await app.inject({
    method: "POST",
    url: `/admin/newsletter/issues/${issue.id}/test`,
    headers: { cookie: editor },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.json().to, "editor@vantaorigin.test");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "editor@vantaorigin.test");
  assert.equal(sent[0].subject, "[Test] Testing one two");

  // A test is not a send.
  const after = await app.inject({
    method: "GET",
    url: `/admin/newsletter/issues/${issue.id}`,
    headers: { cookie: editor },
  });
  assert.equal(after.json().status, "draft");
  assert.equal(after.json().sentCount, 0);

  const untouched = await db
    .select({ value: sql`count(*)::int` })
    .from(schema.newsletterSubscribers)
    .where(sql`${schema.newsletterSubscribers.lastIssueId} is not null`);
  assert.equal(Number(untouched[0].value), 0);
});

test("a test copy can be sent somewhere else", async () => {
  const issue = await writtenIssue();
  sent = [];

  const res = await app.inject({
    method: "POST",
    url: `/admin/newsletter/issues/${issue.id}/test`,
    headers: { cookie: editor },
    payload: { to: "somebody@example.com" },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(sent[0].to, "somebody@example.com");
});

test("the count on the button is who it will really go to", async () => {
  const issue = await writtenIssue();
  const res = await app.inject({
    method: "GET",
    url: `/admin/newsletter/issues/${issue.id}/waiting`,
    headers: { cookie: editor },
  });

  // Three joined; one left.
  assert.equal(res.json().waiting, 2);
});

test("sending reaches everybody on the list, each with their own way out", async () => {
  const issue = await writtenIssue("The first letter");
  sent = [];

  const { sent: count, failed } = await deliver(null, issue.id);
  assert.equal(count, 2);
  assert.equal(failed, 0);

  const addresses = sent.map((message) => message.to).sort();
  assert.deepEqual(addresses, ["one@example.com", "two@example.com"]);
  // Nobody who left hears from us.
  assert.ok(!addresses.includes("gone@example.com"));

  // One copy per person, each carrying that person's own link.
  const links = sent.map((message) => message.unsubscribeUrl);
  assert.equal(new Set(links).size, 2);
  for (const message of sent) {
    assert.match(message.unsubscribeUrl, /^https:\/\/api\.vantaorigin\.com\/newsletter\/unsubscribe\?token=/);
    assert.ok(message.html.includes(message.unsubscribeUrl));
    assert.match(message.subject, /^The first letter$/);
  }

  const after = await app.inject({
    method: "GET",
    url: `/admin/newsletter/issues/${issue.id}`,
    headers: { cookie: editor },
  });
  assert.equal(after.json().status, "sent");
  assert.equal(after.json().sentCount, 2);
  assert.ok(after.json().sentAt);
});

test("sending the same letter again reaches nobody twice", async () => {
  const [issue] = await db
    .select()
    .from(schema.newsletterIssues)
    .where(eq(schema.newsletterIssues.subject, "The first letter"));

  sent = [];
  const again = await deliver(null, issue.id);

  assert.equal(sent.length, 0);
  assert.equal(again.sent, 2, "the count still describes the whole send");
});

test("a send stopped halfway carries on from where it stopped", async () => {
  const issue = await writtenIssue("The interrupted letter");
  sent = [];

  // One copy gets through; the next throws, the way a restart would cut in.
  let allowed = 1;
  mailer.send = async (message) => {
    if (allowed <= 0) throw new Error("stopped");
    allowed -= 1;
    sent.push(message);
    return { id: "part" };
  };

  await deliver(null, issue.id);
  assert.equal(sent.length, 1);

  // Whoever was reached is marked; whoever failed is marked too, so a second
  // press does not send them a second copy of what may have arrived.
  const marked = await db
    .select({ value: sql`count(*)::int` })
    .from(schema.newsletterSubscribers)
    .where(eq(schema.newsletterSubscribers.lastIssueId, issue.id));
  assert.equal(Number(marked[0].value), 2);

  mailer.send = async (message) => {
    sent.push(message);
    return { id: "rest" };
  };
});

test("somebody who joins while a letter is going out still gets it", async () => {
  const issue = await writtenIssue("The letter with a latecomer");
  sent = [];

  // Joining after the first copy has gone.
  let joined = false;
  const record = mailer.send;
  mailer.send = async (message) => {
    const answer = await record(message);
    if (!joined) {
      joined = true;
      await join("latecomer@example.com");
    }
    return answer;
  };

  await deliver(null, issue.id);
  mailer.send = record;

  assert.ok(sent.map((message) => message.to).includes("latecomer@example.com"));
});

test("a sent letter cannot be sent again from the screen", async () => {
  const [issue] = await db
    .select()
    .from(schema.newsletterIssues)
    .where(eq(schema.newsletterIssues.subject, "The first letter"));

  const res = await app.inject({
    method: "POST",
    url: `/admin/newsletter/issues/${issue.id}/send`,
    headers: { cookie: editor },
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.json().error, /already gone out/i);
});

test("sending is closed to everybody but an admin", async () => {
  const issue = await writtenIssue();
  const passerby = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "nosy@vantaorigin.test", username: "nosy", password: "supersecret1" },
    })
  );

  for (const url of [
    `/admin/newsletter/issues/${issue.id}/send`,
    `/admin/newsletter/issues/${issue.id}/test`,
  ]) {
    const res = await app.inject({ method: "POST", url, headers: { cookie: passerby } });
    assert.equal(res.statusCode, 404);
  }
});
