// The front page, as something that does not run JavaScript sees it.
//
// Measured against the live site, the front page gave a crawler five words,
// all of them the title. Characters and creators had plain HTML served for
// them; the most important page on the site did not. Google renders scripts
// eventually, which is presumably how it got indexed at all, but that is a
// second pass and it is not promised.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-home-preview-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;

const words = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;

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
    payload: { email: "maker@vantaorigin.test", username: "maker", password: "supersecret1" },
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

  const category = await app.inject({
    method: "POST",
    url: "/categories",
    headers: { cookie },
    payload: { name: "The Vantaverse" },
  });

  await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie },
    payload: {
      name: "Urokojin",
      categoryId: category.json().id,
      universe: "The Vantaverse",
      tagline: "The Thunder Judge",
      isPublic: true,
    },
  });
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("the front page says what this is, in words a crawler can read", async () => {
  const res = await app.inject({ method: "GET", url: "/preview/home" });
  assert.equal(res.statusCode, 200);

  // The live page gave five. Anything near that is an empty shell.
  assert.ok(words(res.body) > 180, `only ${words(res.body)} words`);

  assert.match(res.body, /<h1>Your characters\. One link\.<\/h1>/);
  assert.match(res.body, /one address for the characters you make/);
  assert.match(res.body, /rel="canonical" href="[^"]*vantaorigin\.com"/);
});

test("it shows real work, not only a description of itself", async () => {
  const res = await app.inject({ method: "GET", url: "/preview/home" });

  assert.match(res.body, /Urokojin/);
  assert.match(res.body, /The Vantaverse/);
  assert.match(res.body, /@maker/);
  // And links onward, so a crawler has somewhere to go from here.
  assert.match(res.body, /\/discover/);
  assert.match(res.body, /\/blog/);
});

test("about and help carry their own words too", async () => {
  const about = await app.inject({ method: "GET", url: "/preview/about" });
  assert.equal(about.statusCode, 200);
  assert.ok(words(about.body) > 100, `about had ${words(about.body)} words`);
  assert.match(about.body, /<h1>About VantaOrigin<\/h1>/);

  const help = await app.inject({ method: "GET", url: "/preview/help" });
  assert.equal(help.statusCode, 200);
  assert.ok(words(help.body) > 100, `help had ${words(help.body)} words`);

  // Questions marked up as questions, so they can be shown as such.
  const ld = JSON.parse(help.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(ld["@type"], "FAQPage");
  assert.ok(ld.mainEntity.length >= 4);
});

test("the sitemap stops offering creators who have published nothing", async () => {
  // A second account that has made nothing at all.
  const empty = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "quiet@vantaorigin.test", username: "quiet", password: "supersecret1" },
  });
  const cookie = cookieFrom(empty);
  const code = empty.json().devCode;
  if (code) {
    await app.inject({
      method: "POST",
      url: "/auth/verify-email",
      headers: { cookie },
      payload: { code },
    });
  }

  const res = await app.inject({ method: "GET", url: "/sitemap.xml" });

  // "No characters published yet" is not a page worth asking Google to index,
  // and a pile of them is how the coverage report fills with warnings.
  assert.ok(!res.body.includes("/creator/quiet"), "an empty profile should not be offered");
  assert.match(res.body, /\/creator\/maker/);
});

test("every page drawn for a crawler links onward, the blog among them", async () => {
  // The crawlers that feed language models mostly follow links rather than
  // reading a sitemap, and the blog was linked from the dashboard and nowhere
  // else: not from a character, not from a creator, not from the front page.
  // So nothing could be led to it, which is the whole point of writing it.
  const pages = ["/preview/home", "/preview/about", "/preview/help", "/preview/creator/maker"];

  for (const url of pages) {
    const res = await app.inject({ method: "GET", url });
    assert.equal(res.statusCode, 200, `${url} answered ${res.statusCode}`);
    assert.match(res.body, /<a href="[^"]*\/blog">Blog<\/a>/, `${url} does not link to the blog`);
    assert.match(res.body, /<a href="[^"]*\/discover">/, `${url} does not link to discover`);
  }
});

test("a page does not offer a link to itself", async () => {
  // The front page is canonical with no trailing slash and the link carries
  // one, so without trimming both it would have linked to itself.
  const home = await app.inject({ method: "GET", url: "/preview/home" });
  const homeFooter = home.body.slice(home.body.indexOf("<footer>"));
  assert.ok(!homeFooter.includes(">VantaOrigin</a>"), "the front page should not link to itself");

  const res = await app.inject({ method: "GET", url: "/preview/help" });

  // The footer is a way out of the page, so the page it is on is left off it.
  const footer = res.body.slice(res.body.indexOf("<footer>"));
  assert.ok(!footer.includes('/help">Help</a>'), "help should not link to help");
  assert.match(footer, /\/blog">Blog<\/a>/);
});
