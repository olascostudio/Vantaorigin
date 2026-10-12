// The picture a link preview shows, drawn when a post goes out.
//
// Nothing here reaches the network: these posts have no hero, which is the
// typographic case, and the one test that needs artwork makes its own.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import sharp from "sharp";

const dataDir = ".pglite-blog-share-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.STORAGE_DRIVER = "memory";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");
const { shareImage } = await import("../src/blog-share.js");

let app;
let boss;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

before(async () => {
  await migrate();
  app = await buildApp();

  const made = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "boss@vantaorigin.test", username: "ola", password: "supersecret1" },
  });
  boss = cookieFrom(made);
  const code = made.json().devCode;
  if (code) {
    await app.inject({
      method: "POST",
      url: "/auth/verify-email",
      headers: { cookie: boss },
      payload: { code },
    });
  }
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

const write = (payload) =>
  app.inject({ method: "POST", url: "/admin/blog", headers: { cookie: boss }, payload });

const change = (id, payload) =>
  app.inject({ method: "PATCH", url: `/admin/blog/${id}`, headers: { cookie: boss }, payload });

test("it is the right size and shape for a link preview", async () => {
  const body = await shareImage({ title: "A short title", label: "Story" });
  const meta = await sharp(body).metadata();

  // What every scraper expects, and a format all of them read.
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  assert.equal(meta.format, "jpeg");
});

test("a long title is made to fit rather than running off the edge", async () => {
  const body = await shareImage({
    title:
      "How to Structure Character Cards for Your Webcomic or Dark Fantasy Novel Without Losing Your Mind Entirely",
    label: "Worldbuilding Guides",
  });
  const meta = await sharp(body).metadata();
  assert.equal(meta.width, 1200);
  assert.ok(body.length > 2000, "something was actually drawn");
});

test("a post gets one when it is written, and the preview points at it", async () => {
  const made = await write({ title: "Drawn on publishing", status: "published" });
  assert.equal(made.statusCode, 201);

  const post = made.json().post;
  assert.ok(post.seo.ogImageUrl, "a link preview should have a picture");
  assert.match(post.seo.ogImageUrl, /\/share\//);

  // And a reader's copy says the same.
  const read = await app.inject({ method: "GET", url: `/blog/${post.slug}` });
  assert.equal(read.json().post.seo.ogImageUrl, post.seo.ogImageUrl);
});

test("a picture somebody chose by hand is never replaced by a drawn one", async () => {
  const made = await write({
    title: "My own card",
    ogImageUrl: "https://example.com/mine.jpg",
    status: "published",
  });

  assert.equal(made.json().post.seo.ogImageUrl, "https://example.com/mine.jpg");
});

test("changing the title gives the picture a new address", async () => {
  const made = await write({ title: "First name for it", status: "published" });
  const id = made.json().post.id;
  const before = made.json().post.seo.ogImageUrl;

  const retitled = await change(id, { title: "A different name entirely" });
  const after = retitled.json().post.seo.ogImageUrl;

  // Scrapers cache these hard and by URL. At a fixed name the old card would
  // keep showing long after the post had been renamed.
  assert.notEqual(after, before);
  assert.match(after, /\/share\//);
});

test("editing only the writing does not draw it again", async () => {
  const made = await write({ title: "Left alone", status: "published" });
  const id = made.json().post.id;
  const before = made.json().post.seo.ogImageUrl;

  const edited = await change(id, { body: "<p>Quite different words in the article.</p>" });
  assert.equal(edited.json().post.seo.ogImageUrl, before);
});

test("a hero that cannot be fetched leaves the post alone", async () => {
  // The picture is worth having and never worth failing a publish over.
  const made = await write({
    title: "Hero is not there",
    heroUrl: "https://localhost:1/not-a-real-host.webp",
    status: "published",
  });

  assert.equal(made.statusCode, 201);
  const post = made.json().post;
  assert.equal(post.title, "Hero is not there");
  // No drawn picture, so the preview falls back to the hero it was given.
  assert.equal(post.seo.ogImageUrl, "https://localhost:1/not-a-real-host.webp");
});

test("a post written before any of this gets one the next time it is saved", async () => {
  // Exactly the state the live posts were in: published, no card, and
  // nothing about them about to change on its own.
  const made = await write({ title: "Written before the cards existed", status: "published" });
  const id = made.json().post.id;

  // Take the card away, as though it had never been drawn.
  const { db } = await import("../src/db/client.js");
  const { blogPosts } = await import("../src/db/schema.js");
  const { eq } = await import("drizzle-orm");
  await db.update(blogPosts).set({ shareImageUrl: null }).where(eq(blogPosts.id, id));

  const before = await app.inject({ method: "GET", url: "/blog/written-before-the-cards-existed" });
  assert.ok(!before.json().post.seo.ogImageUrl, "no card to start with");

  // A save that changes nothing at all, which is what somebody would do.
  const saved = await change(id, {});
  assert.match(saved.json().post.seo.ogImageUrl, /\/share\//);
});

test("the words are drawn, not asked for", async () => {
  const body = await shareImage({ title: "Readable anywhere", label: "Craft" });

  // The strip the title sits in. On a card whose words failed to render this
  // is flat black; the first version of this shipped exactly that way, as a
  // row of empty boxes, and nothing in the code complained.
  const strip = await sharp(body)
    .extract({ left: 60, top: 400, width: 900, height: 180 })
    .stats();

  const brightest = Math.max(...strip.channels.map((channel) => channel.max));
  assert.ok(brightest > 200, `expected white letters, got a brightest pixel of ${brightest}`);

  // And they are shapes rather than text, which is what makes it independent
  // of whatever fonts the machine underneath happens to have.
  const { inkOf } = await import("../src/type.js");
  const drawn = inkOf("Hello", { x: 0, y: 0, size: 40 });
  assert.match(drawn, /^<path d="/);
  assert.ok(!drawn.includes("<text"), "a text element would need a font at draw time");
});

test("a title too long for three lines is still set, not dropped", async () => {
  const { fitLines } = await import("../src/type.js");
  const { size, lines } = fitLines(
    "An extraordinarily long title about worldbuilding and character design that simply refuses to stop going on and on",
    { room: 1056, sizes: [62, 56, 50, 44, 40, 36], weight: 800, maxLines: 3 }
  );

  assert.ok(lines.length > 0 && lines.length <= 3, `got ${lines.length} lines`);
  assert.ok(size >= 36);
  assert.ok(lines.join(" ").length > 20, "something of the title survived");
});

test("a card drawn by an older version is replaced, not kept", async () => {
  const made = await write({ title: "Drawn the old way", status: "published" });
  const id = made.json().post.id;
  const proper = made.json().post.seo.ogImageUrl;

  // Exactly the state the live posts were in: a card on file, drawn by a
  // version that got it wrong, with inputs that are never going to change.
  const { db } = await import("../src/db/client.js");
  const { blogPosts } = await import("../src/db/schema.js");
  const { eq } = await import("drizzle-orm");
  await db
    .update(blogPosts)
    .set({ shareImageUrl: "https://example.com/old/drawn-by-version-one.jpg" })
    .where(eq(blogPosts.id, id));

  // A save that changes nothing, which is all somebody should have to do.
  const saved = await change(id, {});
  const now = saved.json().post.seo.ogImageUrl;

  assert.notEqual(now, "https://example.com/old/drawn-by-version-one.jpg");
  assert.match(now, /\/share\//);
  // Same inputs, so it lands back at the address it should always have had.
  assert.equal(now, proper);
});

test("a card that is already right is left alone", async () => {
  const made = await write({ title: "Already correct", status: "published" });
  const id = made.json().post.id;
  const before = made.json().post.seo.ogImageUrl;

  const saved = await change(id, { body: "<p>Only the writing moved.</p>" });
  assert.equal(saved.json().post.seo.ogImageUrl, before);
});
