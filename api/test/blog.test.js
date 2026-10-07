// The blog, from writing a post to taking it down.
//
// The part worth being careful about is the address. A post people have
// already linked to must keep working when its slug changes, and a draft must
// be invisible to everyone who is not an admin -- including through the
// address it will eventually have.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-blog-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
let boss;
let reader;
let postId;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

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
  boss = await signUp("boss");
  reader = await signUp("reader");
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("nobody but an admin can write a post", async () => {
  for (const cookie of ["", reader]) {
    const res = await app.inject({
      method: "POST",
      url: "/admin/blog",
      headers: cookie ? { cookie } : {},
      payload: { title: "Not mine to write" },
    });
    // Not on the list is told the route does not exist, on purpose.
    assert.ok(res.statusCode === 401 || res.statusCode === 404, `got ${res.statusCode}`);
  }

  const listed = await app.inject({ method: "GET", url: "/admin/blog", headers: { cookie: reader } });
  assert.ok(listed.statusCode === 401 || listed.statusCode === 404);
});

test("a new post gets an address made from its title", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/admin/blog",
    headers: { cookie: boss },
    payload: {
      title: "10 Ways to Improve Your Website",
      body: "<p>The first way is to make it load.</p>",
      category: "Guides",
      tags: ["websites", "speed"],
    },
  });

  assert.equal(res.statusCode, 201);
  const { post } = res.json();
  postId = post.id;

  assert.equal(post.slug, "10-ways-to-improve-your-website");
  assert.equal(post.status, "draft");
  assert.equal(post.readingMinutes, 1);
  // Nobody wrote a summary, so the opening of the article stands in.
  assert.match(post.excerpt, /The first way is to make it load/);
  // No real name on the account, so the byline falls back to the handle.
  assert.equal(post.author.name, "@boss");
});

test("a draft is not readable by the public", async () => {
  const res = await app.inject({ method: "GET", url: "/blog/10-ways-to-improve-your-website" });
  assert.equal(res.statusCode, 404);

  const listed = await app.inject({ method: "GET", url: "/blog" });
  assert.equal(listed.json().posts.length, 0);
});

test("anything that runs is taken out of the body", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
    payload: {
      body: '<p onclick="steal()">Hello</p><script>bad()</script><a href="javascript:go()">x</a>',
    },
  });

  const { body } = res.json().post;
  assert.ok(!body.includes("<script"), body);
  assert.ok(!body.includes("onclick"), body);
  assert.ok(!body.includes("javascript:"), body);
  assert.match(body, /Hello/);
});

test("publishing puts it on the blog", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
    payload: { status: "published" },
  });
  assert.equal(res.statusCode, 200);
  assert.ok(res.json().post.publishedAt);

  const listed = await app.inject({ method: "GET", url: "/blog" });
  const { posts, total } = listed.json();
  assert.equal(total, 1);
  assert.equal(posts[0].slug, "10-ways-to-improve-your-website");
  // The listing is a list: it has no business carrying an article's HTML.
  assert.equal(posts[0].body, undefined);

  const opened = await app.inject({ method: "GET", url: "/blog/10-ways-to-improve-your-website" });
  assert.equal(opened.statusCode, 200);
  assert.match(opened.json().post.body, /Hello/);
  assert.equal(opened.json().movedFrom, null);
});

test("search metadata falls back to the real thing until it is written", async () => {
  const before = await app.inject({ method: "GET", url: "/blog/10-ways-to-improve-your-website" });
  const fallback = before.json().post.seo;
  assert.equal(fallback.metaTitle, "10 Ways to Improve Your Website");
  // The summary was made when the post was created and has not been
  // rewritten since, which is why it does not mention the edited body.
  assert.match(fallback.metaDescription, /The first way is to make it load/);

  await app.inject({
    method: "PATCH",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
    payload: {
      metaTitle: "Make your website faster in 10 steps",
      metaDescription: "A short, practical list.",
      metaKeywords: ["web development", "SEO"],
    },
  });

  const after = await app.inject({ method: "GET", url: "/blog/10-ways-to-improve-your-website" });
  const written = after.json().post.seo;
  assert.equal(written.metaTitle, "Make your website faster in 10 steps");
  assert.equal(written.metaDescription, "A short, practical list.");
  assert.deepEqual(written.metaKeywords, ["web development", "SEO"]);
});

test("renaming a published post keeps the old link working", async () => {
  const res = await app.inject({
    method: "PATCH",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
    payload: { slug: "make-your-website-faster" },
  });
  assert.equal(res.json().post.slug, "make-your-website-faster");

  // The address people already shared still arrives, and says where it went.
  const old = await app.inject({ method: "GET", url: "/blog/10-ways-to-improve-your-website" });
  assert.equal(old.statusCode, 200);
  assert.equal(old.json().movedFrom, "10-ways-to-improve-your-website");
  assert.equal(old.json().post.slug, "make-your-website-faster");

  const now = await app.inject({ method: "GET", url: "/blog/make-your-website-faster" });
  assert.equal(now.statusCode, 200);
  assert.equal(now.json().movedFrom, null);
});

test("an address already spoken for is not handed to a second post", async () => {
  const made = await app.inject({
    method: "POST",
    url: "/admin/blog",
    headers: { cookie: boss },
    payload: { title: "Make your website faster", body: "<p>Another one.</p>" },
  });

  const { slug } = made.json().post;
  assert.notEqual(slug, "make-your-website-faster");
  assert.match(slug, /^make-your-website-faster-/);

  // And the retired address still belongs to the post that was renamed.
  const old = await app.inject({ method: "GET", url: "/blog/10-ways-to-improve-your-website" });
  assert.equal(old.json().post.id, postId);
});

test("taking a post down hides it again", async () => {
  await app.inject({
    method: "PATCH",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
    payload: { status: "draft" },
  });

  const gone = await app.inject({ method: "GET", url: "/blog/make-your-website-faster" });
  assert.equal(gone.statusCode, 404);

  // An admin can still see it, or it could never be put back.
  const mine = await app.inject({
    method: "GET",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
  });
  assert.equal(mine.statusCode, 200);
  assert.equal(mine.json().post.status, "draft");
});

test("putting it back does not make it new", async () => {
  const first = await app.inject({
    method: "GET",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
  });
  const published = first.json().post.publishedAt;

  const again = await app.inject({
    method: "PATCH",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
    payload: { status: "published" },
  });
  assert.equal(again.json().post.publishedAt, published);
});

test("only an admin can delete, and then it is gone", async () => {
  const theirs = await app.inject({
    method: "DELETE",
    url: `/admin/blog/${postId}`,
    headers: { cookie: reader },
  });
  assert.ok(theirs.statusCode === 401 || theirs.statusCode === 404);

  const mine = await app.inject({
    method: "DELETE",
    url: `/admin/blog/${postId}`,
    headers: { cookie: boss },
  });
  assert.equal(mine.statusCode, 200);

  const gone = await app.inject({ method: "GET", url: "/blog/make-your-website-faster" });
  assert.equal(gone.statusCode, 404);

  // The addresses it used to answer to go with it rather than redirecting
  // to a post that is no longer there.
  const old = await app.inject({ method: "GET", url: "/blog/10-ways-to-improve-your-website" });
  assert.equal(old.statusCode, 404);
});
