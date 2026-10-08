// Writing a letter: drafts, what a preview shows, and what a sent issue
// refuses to let you do.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";

const dataDir = ".pglite-issues-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "editor@vantaorigin.test";
process.env.API_PUBLIC_URL = "https://api.vantaorigin.com";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db, schema } = await import("../src/db/client.js");
const { renderIssue } = await import("../src/emails/issue.js");

let app;
let editor;
let outsider;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

// Making an account is not the same as being able to use one: nothing can be
// created until the address has been confirmed. These helpers answer the code
// as a real person would, so each suite starts from a usable account.
const signUp = async (name) => {
  const made = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: `${name}@vantaorigin.test`, username: name, password: "supersecret1" },
  });
  const cookie = cookieFrom(made);
  const code = made.json().devCode;
  if (code) {
    await app.inject({
      method: "POST",
      url: "/auth/verify-email",
      headers: { cookie },
      payload: { code },
    });
  }
  return cookie;
};

before(async () => {
  await migrate();
  app = await buildApp();
  editor = await signUp("editor");
  outsider = await signUp("passerby");
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("writing is closed to everybody but an admin", async () => {
  for (const cookie of [outsider, ""]) {
    const res = await app.inject({
      method: "GET",
      url: "/admin/newsletter/issues",
      headers: cookie ? { cookie } : {},
    });
    assert.ok(res.statusCode === 404 || res.statusCode === 401);
  }
});

test("a written letter saves, and previews the way it will send", async () => {
  const made = await app.inject({
    method: "POST",
    url: "/admin/newsletter/issues",
    headers: { cookie: editor },
    payload: {},
  });
  const id = made.json().id;

  const written =
    "<h2>Written in one go</h2><p>With a <a href=\"https://www.vantaorigin.com\">link</a>.</p>";

  const saved = await app.inject({
    method: "PATCH",
    url: `/admin/newsletter/issues/${id}`,
    headers: { cookie: editor },
    payload: { subject: "A letter", blocks: [{ type: "rich", html: written }] },
  });

  // The shape the editor sends has to be a shape the API accepts, or writing
  // a letter fails at the moment somebody tries to keep it.
  assert.equal(saved.statusCode, 200, saved.body);
  assert.equal(saved.json().blocks[0].type, "rich");

  const preview = await app.inject({
    method: "POST",
    url: "/admin/newsletter/preview",
    headers: { cookie: editor },
    payload: { subject: "A letter", blocks: [{ type: "rich", html: written }] },
  });

  assert.equal(preview.statusCode, 200);
  // Gmail drops stylesheets, so the styling has to be on the elements.
  assert.match(preview.json().html, /<h2 style="[^"]*font-size:22px/);
  assert.match(preview.json().html, /<a [^>]*text-decoration:underline/);
});

test("a new draft opens on something to type over", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/admin/newsletter/issues",
    headers: { cookie: editor },
    payload: {},
  });

  assert.equal(res.statusCode, 201);
  const issue = res.json();
  assert.equal(issue.status, "draft");
  // One piece of writing, not two blocks: a letter is written in the editor
  // in one go now rather than assembled out of parts.
  assert.equal(issue.blocks.length, 1);
  assert.equal(issue.blocks[0].type, "rich");
  assert.match(issue.blocks[0].html, /What's new at VantaOrigin/);
});

test("a draft keeps what is written into it, and says who wrote it", async () => {
  const made = await app.inject({
    method: "POST",
    url: "/admin/newsletter/issues",
    headers: { cookie: editor },
    payload: {},
  });
  const { id } = made.json();

  const saved = await app.inject({
    method: "PATCH",
    url: `/admin/newsletter/issues/${id}`,
    headers: { cookie: editor },
    payload: {
      subject: "Three new characters this week",
      preheader: "And a look at what people are making",
      blocks: [
        { type: "heading", text: "Three new characters" },
        { type: "text", text: "Here is **what** happened.\n\nAnd a second thought." },
        { type: "button", text: "See them", href: "https://www.vantaorigin.com/discover" },
      ],
    },
  });

  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().subject, "Three new characters this week");
  assert.equal(saved.json().blocks.length, 3);

  const listed = await app.inject({
    method: "GET",
    url: "/admin/newsletter/issues",
    headers: { cookie: editor },
  });
  const row = listed.json().find((issue) => issue.id === id);
  assert.equal(row.author, "@editor");
  // A list of letters does not carry the letters.
  assert.equal(row.blocks, undefined);
});

test("nonsense in a block is refused rather than quietly stored", async () => {
  const made = await app.inject({
    method: "POST",
    url: "/admin/newsletter/issues",
    headers: { cookie: editor },
    payload: {},
  });

  const res = await app.inject({
    method: "PATCH",
    url: `/admin/newsletter/issues/${made.json().id}`,
    headers: { cookie: editor },
    payload: { blocks: [{ type: "iframe", src: "https://example.com" }] },
  });

  assert.equal(res.statusCode, 400);
});

test("the preview is the email, footer and all", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/admin/newsletter/preview",
    headers: { cookie: editor },
    payload: {
      subject: "A letter",
      preheader: "The line beside the subject",
      blocks: [
        { type: "heading", text: "Hello" },
        { type: "text", text: "Something **worth** reading." },
        { type: "button", text: "Read on", href: "https://www.vantaorigin.com/discover" },
      ],
    },
  });

  assert.equal(res.statusCode, 200);
  const { subject, html, text } = res.json();

  assert.equal(subject, "A letter");
  assert.match(html, /<h2[^>]*>Hello<\/h2>/);
  assert.match(html, /<strong[^>]*>worth<\/strong>/);
  assert.match(html, /vantaorigin\.com\/discover/);
  // The footer that will really appear, including the way out.
  assert.match(html, /Unsubscribe/);
  assert.match(html, /Connect with us/);
  assert.match(text, /Read on: https:\/\/www\.vantaorigin\.com\/discover/);
});

test("an empty subject still arrives as something", () => {
  const { subject } = renderIssue({ subject: "   ", blocks: [] });
  assert.equal(subject, "A letter from VantaOrigin");
});

test("nothing typed can become HTML of its own", () => {
  const { html } = renderIssue({
    subject: "x",
    blocks: [
      { type: "text", text: "<script>alert(1)</script> & <b>bold</b>" },
      { type: "button", text: "Go", href: "javascript:alert(1)" },
      { type: "image", url: "javascript:alert(1)", alt: "nope" },
      { type: "text", text: "[a link](javascript:alert(1))" },
    ],
  });

  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&amp; &lt;b&gt;bold&lt;\/b&gt;/);
  // An address a mail client should not follow becomes no link at all.
  assert.ok(!html.includes("javascript:"));
});

test("blank lines become paragraphs, and single ones stay in the paragraph", () => {
  const { html } = renderIssue({
    blocks: [{ type: "text", text: "One.\n\nTwo.\nStill two." }],
  });

  // Body paragraphs only; the shell's own footer has paragraphs too.
  assert.equal(html.match(/line-height:1\.7;/g).length, 2);
  assert.match(html, /Two\.<br \/>Still two\./);
});

test("a block with nothing in it is left out of the email", () => {
  const { html } = renderIssue({
    blocks: [
      { type: "heading", text: "Kept" },
      { type: "button", text: "", href: "" },
      { type: "image", url: "" },
    ],
  });

  assert.match(html, /Kept/);
  assert.ok(!html.includes("border-radius:999px"));
});

test("a sent issue cannot be rewritten or thrown away", async () => {
  const made = await app.inject({
    method: "POST",
    url: "/admin/newsletter/issues",
    headers: { cookie: editor },
    payload: { subject: "Already gone" },
  });
  const { id } = made.json();

  // Standing in for step 4, which is what will really set this.
  await db
    .update(schema.newsletterIssues)
    .set({ status: "sent", sentAt: new Date(), sentCount: 40 })
    .where(eq(schema.newsletterIssues.id, id));

  const edit = await app.inject({
    method: "PATCH",
    url: `/admin/newsletter/issues/${id}`,
    headers: { cookie: editor },
    payload: { subject: "Changed my mind" },
  });
  assert.equal(edit.statusCode, 409);

  const removed = await app.inject({
    method: "DELETE",
    url: `/admin/newsletter/issues/${id}`,
    headers: { cookie: editor },
  });
  assert.equal(removed.statusCode, 409);

  const still = await app.inject({
    method: "GET",
    url: `/admin/newsletter/issues/${id}`,
    headers: { cookie: editor },
  });
  assert.equal(still.json().subject, "Already gone");
});

test("a draft can be thrown away", async () => {
  const made = await app.inject({
    method: "POST",
    url: "/admin/newsletter/issues",
    headers: { cookie: editor },
    payload: { subject: "Never mind" },
  });
  const { id } = made.json();

  const res = await app.inject({
    method: "DELETE",
    url: `/admin/newsletter/issues/${id}`,
    headers: { cookie: editor },
  });
  assert.equal(res.statusCode, 200);

  const gone = await app.inject({
    method: "GET",
    url: `/admin/newsletter/issues/${id}`,
    headers: { cookie: editor },
  });
  assert.equal(gone.statusCode, 404);
});

test("a newsletter says why it arrived in its own words, not the welcome letter's", async () => {
  const { welcomeEmail } = await import("../src/emails/templates.js");
  const leave = "https://api.vantaorigin.com/newsletter/unsubscribe?token=abc";

  const issue = renderIssue({ blocks: [{ type: "text", text: "Hello" }] }, { unsubscribeUrl: leave });
  // An issue goes to people who joined a list, who may have no account at all.
  assert.match(issue.html, /you joined the/);
  assert.ok(!issue.html.includes("this address was registered on"));

  // The welcome letter is a different thing and keeps its own reason.
  const welcome = welcomeEmail({ user: { firstName: "Ola" }, unsubscribeUrl: leave });
  assert.match(welcome.html, /this address was registered on/);
  assert.match(welcome.html, /also on the creator newsletter/);
});

test("the welcome letter can be sent again to somebody who missed it", async () => {
  const { mailer } = await import("../src/adapters/email.js");
  const sent = [];
  const realSend = mailer.send;
  mailer.send = async (message) => {
    sent.push(message);
    return { id: "test" };
  };

  try {
    const res = await app.inject({
      method: "POST",
      url: "/admin/welcome",
      headers: { cookie: editor },
      payload: { to: "Editor@vantaorigin.test" },
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().to, "editor@vantaorigin.test");

    const letter = sent.find((message) => message.subject === "Welcome to VantaOrigin");
    assert.ok(letter, "the letter went out");
    // Addressed to the person, by the name on their account.
    assert.match(letter.html, /editor/i);
    // And carries a way out that belongs to a real subscription.
    assert.match(letter.unsubscribeUrl, /token=/);
    const token = new URL(letter.unsubscribeUrl).searchParams.get("token");
    const goodbye = await app.inject({ method: "GET", url: `/newsletter/unsubscribe?token=${token}` });
    assert.match(goodbye.body, /unsubscribed/i);
  } finally {
    mailer.send = realSend;
  }
});

test("the welcome letter is not sent to an address with no account", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/admin/welcome",
    headers: { cookie: editor },
    payload: { to: "stranger@example.com" },
  });
  assert.equal(res.statusCode, 404);
});

test("everybody who had an account before the list existed is on it", async () => {
  // The backfill migration runs at boot; every account should be covered.
  const missing = await db
    .select({ email: schema.users.email })
    .from(schema.users)
    .where(
      sql`not exists (select 1 from newsletter_subscribers n where lower(n.email) = lower(users.email))`
    );

  assert.deepEqual(missing, [], "no account is left unable to be written to");
});

// --- code, and templates ----------------------------------------------------

test("a letter can carry code written elsewhere, as it was written", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/admin/newsletter/preview",
    headers: { cookie: editor },
    payload: {
      subject: "From my own code",
      blocks: [
        {
          type: "html",
          code: '<table width="100%"><tr><td style="padding:20px;background:#111"><h1 style="color:#fc187b">Hand-built</h1><p>Straight from my template.</p></td></tr></table>',
        },
      ],
    },
  });

  assert.equal(res.statusCode, 200);
  const { html, text } = res.json();

  // Kept whole, inline styles and all.
  assert.match(html, /<h1 style="color:#fc187b">Hand-built<\/h1>/);
  assert.match(html, /background:#111/);
  // And still inside the VantaOrigin shell, with the way out.
  assert.match(html, /Unsubscribe/);
  // The plain part gets the words out of the markup.
  assert.match(text, /Hand-built Straight from my template\./);
});

test("what cannot safely run is taken out, and nothing else is", async () => {
  const { renderIssue } = await import("../src/emails/issue.js");
  const { html } = renderIssue({
    blocks: [
      {
        type: "html",
        code:
          '<div onclick="steal()" style="color:red">Keep me</div>' +
          '<script>steal()</script>' +
          '<style>.x{color:blue}</style>' +
          '<a href="javascript:steal()">Link</a>' +
          '<img src="https://pictures.test/a.png" width="100" />',
      },
    ],
  });

  // The letter keeps its shape.
  assert.match(html, /<div style="color:red">Keep me<\/div>/);
  assert.match(html, /<img src="https:\/\/pictures\.test\/a\.png" width="100" \/>/);

  // The dashboard previews this in a frame on our own origin, so none of
  // this gets to run; an email client would have dropped it anyway.
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("onclick"));
  assert.ok(!html.includes("javascript:"));
  // A style block is ignored by Gmail, so it is removed rather than left to
  // make the letter look right here and wrong where it matters.
  assert.ok(!html.includes("<style"));
});

test("a letter can be kept as a template, and start the next one", async () => {
  const written = await app.inject({
    method: "POST",
    url: "/admin/newsletter/issues",
    headers: { cookie: editor },
    payload: {
      subject: "The monthly one",
      preheader: "What happened this month",
      blocks: [
        { type: "html", code: "<p>My own header</p>" },
        { type: "text", text: "This month we..." },
      ],
    },
  });
  const issue = written.json();

  const saved = await app.inject({
    method: "POST",
    url: "/admin/newsletter/templates",
    headers: { cookie: editor },
    payload: { name: "Monthly", fromIssue: issue.id },
  });
  assert.equal(saved.statusCode, 201);
  const template = saved.json();
  assert.equal(template.name, "Monthly");
  assert.equal(template.subject, "The monthly one");
  assert.equal(template.blocks.length, 2);

  // The next letter starts from it rather than from an empty page.
  const next = await app.inject({
    method: "POST",
    url: "/admin/newsletter/issues",
    headers: { cookie: editor },
    payload: { fromTemplate: template.id },
  });
  assert.equal(next.statusCode, 201);
  assert.equal(next.json().subject, "The monthly one");
  assert.equal(next.json().blocks[0].code, "<p>My own header</p>");

  // And it is its own letter: changing it leaves the template alone.
  await app.inject({
    method: "PATCH",
    url: `/admin/newsletter/issues/${next.json().id}`,
    headers: { cookie: editor },
    payload: { subject: "Changed" },
  });
  const stillThere = await app.inject({
    method: "GET",
    url: `/admin/newsletter/templates/${template.id}`,
    headers: { cookie: editor },
  });
  assert.equal(stillThere.json().subject, "The monthly one");
});

test("templates are listed, and can be thrown away", async () => {
  const listed = await app.inject({
    method: "GET",
    url: "/admin/newsletter/templates",
    headers: { cookie: editor },
  });
  assert.equal(listed.statusCode, 200);
  const monthly = listed.json().find((row) => row.name === "Monthly");
  assert.ok(monthly, "the one just saved is in the list");
  assert.equal(monthly.author, "@editor");

  const removed = await app.inject({
    method: "DELETE",
    url: `/admin/newsletter/templates/${monthly.id}`,
    headers: { cookie: editor },
  });
  assert.equal(removed.statusCode, 200);

  const gone = await app.inject({
    method: "GET",
    url: `/admin/newsletter/templates/${monthly.id}`,
    headers: { cookie: editor },
  });
  assert.equal(gone.statusCode, 404);
});

test("templates are closed to everybody but an admin", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/admin/newsletter/templates",
    headers: { cookie: outsider },
  });
  assert.equal(res.statusCode, 404);
});
