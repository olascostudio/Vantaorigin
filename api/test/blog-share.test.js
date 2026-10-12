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
