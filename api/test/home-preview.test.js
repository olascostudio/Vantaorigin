// The front page, as something that does not run JavaScript sees it.
//
// Measured against the live site, the front page gave a crawler five words,
// all of them the title. Characters and creators had plain HTML served for
// them; the most important page on the site did not. Google renders scripts
// eventually, which is presumably how it got indexed at all, but that is a
// second pass and it is not promised.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const dataDir = ".pglite-home-preview-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");
// The same escaping the pages use, for comparing them with the app's copy.
const { escape } = await import("../src/routes/preview.js");

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
  const pages = [
    "/preview/home",
    "/preview/about",
    "/preview/help",
    "/preview/creator/maker",
    "/preview/marketplace/how-it-works",
    "/preview/marketplace/project-request",
  ];

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

test("the commissioning pages carry the words the browser shows", async () => {
  const how = await app.inject({ method: "GET", url: "/preview/marketplace/how-it-works" });
  assert.equal(how.statusCode, 200);

  // Five words is the shell. This is the page someone deciding whether to
  // pay a creator reads before they decide.
  assert.ok(words(how.body) > 120, `how it works had ${words(how.body)} words`);
  assert.match(how.body, /<h1>How it Works<\/h1>/);
  assert.match(how.body, /01: Post Your Project Brief/);
  assert.match(how.body, /payment is released to the creator/);
  assert.match(
    how.body,
    /rel="canonical" href="[^"]*\/marketplace\/how-it-works"/,
    "how it works should point at itself"
  );

  // Steps marked up as steps, the way help marks up its questions.
  const ld = JSON.parse(how.body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(ld["@type"], "HowTo");
  assert.equal(ld.step.length, 6);
  assert.equal(ld.step[0].name, "Post Your Project Brief");

  const ask = await app.inject({ method: "GET", url: "/preview/marketplace/project-request" });
  assert.equal(ask.statusCode, 200);

  // Thinner on purpose: that page is mostly a form on Google's domain, which
  // cannot be read from here, so what is left is its own words and the way in.
  assert.ok(words(ask.body) > 70, `project request had ${words(ask.body)} words`);
  assert.match(ask.body, /<h1>Project Request<\/h1>/);
  assert.match(ask.body, /vetted creator from the VantaOrigin network/);
  assert.match(ask.body, /docs\.google\.com\/forms/);
  assert.match(
    ask.body,
    /rel="canonical" href="[^"]*\/marketplace\/project-request"/,
    "the request page should point at itself"
  );
});

test("the steps a crawler reads are the steps the page shows", async () => {
  // The API ships as a container with only api/ inside it, so the route
  // keeps its own copy of the commissioning steps instead of importing the
  // app's. This is the thing that notices when one is edited and the other
  // is not.
  const data = new URL("../../src/data/marketplace.js", import.meta.url);
  const request = new URL("../../src/pages/ProjectRequest.jsx", import.meta.url);

  // Deployed, the app is not checked out beside the API and there is
  // nothing to compare against.
  if (!existsSync(data) || !existsSync(request)) return;

  const steps = [
    ...(await readFile(data, "utf8")).matchAll(/title:\s*"([^"]+)",\s*body:\s*"([^"]+)"/g),
  ];
  assert.equal(steps.length, 6, "could not read the steps out of src/data/marketplace.js");

  const how = await app.inject({ method: "GET", url: "/preview/marketplace/how-it-works" });
  for (const [, title, text] of steps) {
    assert.ok(how.body.includes(escape(title)), `a crawler is no longer told "${title}"`);
    assert.ok(how.body.includes(escape(text)), `a crawler is no longer told "${text}"`);
  }

  const jsx = (await readFile(request, "utf8")).replace(/\s+/g, " ");
  const ask = await app.inject({ method: "GET", url: "/preview/marketplace/project-request" });
  const pitch = ask.body.match(/<p>(Tell us what[^<]+)<\/p>/)[1];
  assert.ok(jsx.includes(pitch), "the request page and the copy drawn for a crawler have drifted");
});
