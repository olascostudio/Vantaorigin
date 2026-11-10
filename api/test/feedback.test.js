// A line from somebody using the site.
//
// Open to anyone on purpose: during a beta the message worth having often
// comes from the person who looked, found it confusing and left without ever
// making an account. That also makes it a thing strangers can post to, so
// what is typed must never reach the email as markup.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-feedback-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");
const { mailer } = await import("../src/adapters/email.js");

let app;
let sent;
let realSend;

before(async () => {
  await migrate();
  app = await buildApp();
  realSend = mailer.send;
});

after(async () => {
  mailer.send = realSend;
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

// Caught rather than delivered, so the letter itself can be read.
const catching = () => {
  sent = [];
  mailer.send = async (letter) => {
    sent.push(letter);
    return { id: "caught" };
  };
};

const say = (payload) => app.inject({ method: "POST", url: "/feedback", payload });

test("a visitor who is not signed in can still say something", async () => {
  catching();
  const res = await say({
    message: "The character page is lovely but I could not work out how to publish one.",
    email: "stranger@example.test",
    page: "https://www.vantaorigin.com/character/urokojin",
  });

  assert.equal(res.statusCode, 200);
  assert.equal(sent.length, 1);

  const letter = sent[0];
  assert.equal(letter.to, "boss@vantaorigin.test");
  assert.match(letter.subject, /could not work out/i);
  assert.match(letter.text, /The character page is lovely/);
});

test("it carries the page they were on, which is most of the context", async () => {
  catching();
  await say({
    message: "This button does nothing.",
    page: "https://www.vantaorigin.com/marketplace/project-request",
  });

  assert.match(sent[0].text, /\/marketplace\/project-request/);
  assert.match(sent[0].html, /\/marketplace\/project-request/);
});

test("a reply goes to the person, not to the site", async () => {
  catching();
  await say({ message: "Call me back.", email: "reply@example.test" });
  assert.equal(sent[0].replyTo, "reply@example.test");
});

test("an address is optional, and leaving it out still sends", async () => {
  catching();
  const res = await say({ message: "Just saying this and leaving." });

  assert.equal(res.statusCode, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].replyTo, undefined);
  assert.match(sent[0].text, /no address left/);
});

test("nothing typed reaches the email as markup", async () => {
  catching();
  await say({
    message: '<script>alert(1)</script> and <img src=x onerror="alert(2)">',
    email: "x@example.test",
    page: '"><script>alert(3)</script>',
  });

  const { html } = sent[0];
  // Escaping is what makes it safe: the angle brackets become text, so
  // nothing they contain is markup any more. The words "script" and
  // "onerror" are still in there, as words, which is the point.
  assert.ok(!html.includes("<script>"), "a script tag survived into the letter");
  // Scoped to the one they tried to inject: the letter has pictures of its
  // own, the masthead and the social icons, so "<img" on its own proves
  // nothing either way.
  assert.ok(!html.includes("<img src=x"), "an image tag survived into the letter");
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img src=x onerror=/);
  // And the page they named cannot close an attribute and start a tag.
  assert.ok(!html.includes(`"><script`), "the page field escaped its attribute");
});

test("line breaks survive, because people write in paragraphs", async () => {
  catching();
  await say({ message: "First thought.\nSecond thought." });

  assert.match(sent[0].html, /First thought\.<br \/>Second thought\./);
  assert.match(sent[0].text, /First thought\.\nSecond thought\./);
});

test("an empty message is turned away rather than sent", async () => {
  catching();
  for (const payload of [{ message: "" }, { message: "   " }, {}]) {
    const res = await say(payload);
    assert.equal(res.statusCode, 400, JSON.stringify(payload));
  }
  assert.equal(sent.length, 0, "nothing should have been sent");
});

test("an address that is not an address is turned away", async () => {
  catching();
  const res = await say({ message: "Hello", email: "not-an-address" });
  assert.equal(res.statusCode, 400);
  assert.equal(sent.length, 0);
});

test("a message that will not send says so instead of pretending", async () => {
  // Somebody who has just written out a thought deserves to know it did not
  // arrive, and to be given somewhere else to put it.
  sent = [];
  mailer.send = async () => {
    throw new Error("Email failed (502)");
  };

  const res = await say({ message: "Does this reach anybody?" });
  assert.equal(res.statusCode, 502);
  assert.match(res.json().error, /email/i);
});
