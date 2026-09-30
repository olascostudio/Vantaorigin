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

test("the record says who did not get it, and what was said", async () => {
  const issue = await writtenIssue("The letter with a bad address");
  await join("bounces@example.com");
  sent = [];

  const working = mailer.send;
  mailer.send = async (message) => {
    if (message.to === "bounces@example.com") {
      throw new Error("Email failed (422): that address does not exist");
    }
    return working(message);
  };

  const result = await deliver(null, issue.id);
  mailer.send = working;

  assert.equal(result.failed, 1);

  const after = (
    await app.inject({
      method: "GET",
      url: `/admin/newsletter/issues/${issue.id}`,
      headers: { cookie: editor },
    })
  ).json();

  assert.equal(after.status, "sent");
  assert.equal(after.failedCount, 1);
  // A number on its own could not be acted on.
  assert.equal(after.failures.length, 1);
  assert.equal(after.failures[0].email, "bounces@example.com");
  assert.match(after.failures[0].reason, /does not exist/);
  assert.ok(after.failures[0].at);

  // Everybody else still got theirs.
  assert.ok(after.sentCount > 0);
});

test("the history says what went out, when, and to how many", async () => {
  const listed = (
    await app.inject({
      method: "GET",
      url: "/admin/newsletter/issues",
      headers: { cookie: editor },
    })
  ).json();

  const gone = listed.filter((issue) => issue.status === "sent");
  assert.ok(gone.length >= 2, "more than one letter has been sent by now");

  for (const issue of gone) {
    assert.ok(issue.sentAt, "a sent letter knows when it went");
    assert.equal(typeof issue.sentCount, "number");
    assert.equal(typeof issue.failedCount, "number");
    assert.equal(issue.author, "@editor");
  }

  // Newest first, so the history reads as history.
  const dates = gone.map((issue) => new Date(issue.createdAt).getTime());
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a));
});

test("each copy is counted as it goes, not once a batch is through", async () => {
  const issue = await writtenIssue("The counted letter");
  await join("counted-one@example.com");
  await join("counted-two@example.com");
  sent = [];

  // What the issue row said at the moment each copy went out. A count kept
  // only at the end of a batch would read 0, 0, 0 here, and a server that
  // stopped midway would lose every copy it had really sent.
  const seen = [];
  const working = mailer.send;
  mailer.send = async (message) => {
    const [row] = await db
      .select({ sentCount: schema.newsletterIssues.sentCount })
      .from(schema.newsletterIssues)
      .where(eq(schema.newsletterIssues.id, issue.id));
    seen.push(row.sentCount);
    return working(message);
  };

  await deliver(null, issue.id);
  mailer.send = working;

  // Climbing one at a time: nobody who received a copy is missing from the
  // count for longer than the copy itself takes.
  assert.deepEqual(seen, seen.map((_, index) => index));
  assert.ok(seen.length >= 2);
});

test("a send left stranded by a restart can be picked up and finished", async () => {
  const issue = await writtenIssue("The stranded letter");
  await join("stranded@example.com");

  // What a restart leaves behind: marked "sending", with nobody sending it.
  await deliver(null, issue.id);
  await db
    .update(schema.newsletterIssues)
    .set({ status: "sending" })
    .where(eq(schema.newsletterIssues.id, issue.id));

  // The screen asks this to tell "going out now" from "stopped partway".
  const asked = await app.inject({
    method: "GET",
    url: `/admin/newsletter/issues/${issue.id}/waiting`,
    headers: { cookie: editor },
  });
  assert.equal(asked.json().sending, false, "nobody is working on it");

  // Picking it up finishes it rather than refusing because nobody is left.
  const res = await app.inject({
    method: "POST",
    url: `/admin/newsletter/issues/${issue.id}/send`,
    headers: { cookie: editor },
  });
  assert.equal(res.statusCode, 202);

  await new Promise((resolve) => setTimeout(resolve, 300));
  const after = (
    await app.inject({
      method: "GET",
      url: `/admin/newsletter/issues/${issue.id}`,
      headers: { cookie: editor },
    })
  ).json();
  assert.equal(after.status, "sent");
});

test("a stranded send carries on to whoever was still owed it", async () => {
  const issue = await writtenIssue("The half-finished letter");
  const latecomer = "still-owed@example.com";
  await join(latecomer);

  // One copy goes, then the server "stops".
  let allowed = 1;
  const working = mailer.send;
  sent = [];
  mailer.send = async (message) => {
    if (allowed <= 0) throw new Error("stopped");
    allowed -= 1;
    return working(message);
  };
  await deliver(null, issue.id);
  mailer.send = working;

  // Put back the one that "failed" so it is owed the letter again, and mark
  // the issue the way a restart would leave it.
  await db
    .update(schema.newsletterSubscribers)
    .set({ lastIssueId: null })
    .where(eq(schema.newsletterSubscribers.email, latecomer));
  await db
    .update(schema.newsletterIssues)
    .set({ status: "sending" })
    .where(eq(schema.newsletterIssues.id, issue.id));

  sent = [];
  await deliver(null, issue.id);

  assert.ok(
    sent.map((message) => message.to).includes(latecomer),
    "whoever was still owed it gets it"
  );
});
