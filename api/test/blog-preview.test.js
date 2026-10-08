// What a crawler sees of the blog.
//
// The app draws itself in the browser, so without these pages a search engine
// gets an empty shell where an article should be. An article is the one page
// on this site made entirely of writing, so getting this wrong wastes the
// thing most worth indexing.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-blog-preview-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
let boss;
let postId;

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

  const post = await app.inject({
    method: "POST",
    url: "/admin/blog",
    headers: { cookie: boss },
    payload: {
      title: "How to build a character people remember",
      body: "<h2>Start with the wanting</h2><p>Every character worth remembering wants something.</p>",
      excerpt: "Three questions that turn a drawing into a character.",
      category: "Craft",
      metaKeywords: ["character design"],
      status: "published",
    },
  });
  postId = post.json().post.id;
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("the article arrives as readable HTML, not an empty shell", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/preview/blog/how-to-build-a-character-people-remember",
  });

  assert.equal(res.statusCode, 200);
  const html = res.body;

  // The writing itself, not a summary of it.
  assert.match(html, /Start with the wanting/);
  assert.match(html, /Every character worth remembering wants something/);
  assert.match(html, /<h1>How to build a character people remember<\/h1>/);
  assert.match(html, /By @ola/);
});

test("it carries the tags a link preview and a search engine read", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/preview/blog/how-to-build-a-character-people-remember",
  });
  const html = res.body;

  assert.match(html, /<title>How to build a character people remember<\/title>/);
  assert.match(
    html,
    /<meta name="description" content="Three questions that turn a drawing into a character\."/
  );
  assert.match(html, /rel="canonical" href="[^"]*\/blog\/how-to-build-a-character-people-remember"/);

  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(ld["@type"], "BlogPosting");
  assert.equal(ld.headline, "How to build a character people remember");
  assert.equal(ld.author.name, "@ola");
  assert.equal(ld.publisher.name, "VantaOrigin");
  assert.equal(ld.keywords, "character design");
  assert.ok(ld.datePublished);
});

test("the listing links every published post", async () => {
  const res = await app.inject({ method: "GET", url: "/preview/blog" });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /how-to-build-a-character-people-remember/);

  const ld = JSON.parse(res.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(ld["@type"], "Blog");
  assert.equal(ld.blogPost.length, 1);
});

test("a retired address tells a crawler where the post went", async () => {
  await app.inject({
    method: "PATCH",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
    payload: { slug: "build-a-character-people-remember" },
  });

  const moved = await app.inject({
    method: "GET",
    url: "/preview/blog/how-to-build-a-character-people-remember",
  });

  // A redirect, not the same writing served at two addresses.
  assert.equal(moved.statusCode, 301);
  assert.match(moved.headers.location, /\/blog\/build-a-character-people-remember$/);
});

test("a draft is not served to crawlers either", async () => {
  await app.inject({
    method: "PATCH",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
    payload: { status: "draft" },
  });

  const res = await app.inject({
    method: "GET",
    url: "/preview/blog/build-a-character-people-remember",
  });
  assert.equal(res.statusCode, 404);
});

test("the sitemap lists the blog, and only published posts", async () => {
  await app.inject({
    method: "PATCH",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
    payload: { status: "published" },
  });

  const res = await app.inject({ method: "GET", url: "/sitemap.xml" });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /<loc>[^<]*\/blog<\/loc>/);
  assert.match(res.body, /<loc>[^<]*\/blog\/build-a-character-people-remember<\/loc>/);

  await app.inject({
    method: "PATCH",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
    payload: { status: "draft" },
  });

  const after = await app.inject({ method: "GET", url: "/sitemap.xml" });
  assert.ok(
    !after.body.includes("/blog/build-a-character-people-remember"),
    "a draft must not be offered to search engines"
  );
});
