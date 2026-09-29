// What a crawler, a link preview or an AI agent is handed: real words, the
// tags a preview needs, and notes saying who made what.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-preview-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.SITE_URL = "https://www.vantaorigin.com";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");

let app;
let cookie;
let characterId;
let privateId;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

before(async () => {
  await migrate();
  app = await buildApp();

  cookie = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "ola@vantaorigin.test", username: "Vtgshadowscribe", password: "supersecret1" },
    })
  );

  await app.inject({
    method: "PATCH",
    url: "/me",
    headers: { cookie },
    payload: { firstName: "Ola", lastName: "Oriola", bio: "Character creator from Lagos." },
  });

  const made = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie },
    payload: {
      name: "Urokojin",
      universe: "The Vantaverse",
      tagline: "The Thunder Judge",
      backstory: "Born under a sky that would not stop screaming, he was named by the storm itself.",
      isPublic: true,
      coverUrl: "https://cdn.example.com/urokojin.jpg",
      details: {
        core: {
          name: "Stormscript",
          description: "Writes verdicts in lightning.",
          extras: [{ name: "Thunderstep", description: "Moves between strikes." }],
        },
        signature: { name: "THE FINAL VERDICT", description: "One strike, no appeal." },
        weakness: { name: "The First Law", description: "He cannot judge himself." },
        alignment: { name: "Lawful Neutral", description: "The law above all." },
        stats: [{ attribute: "Energy", level: 9, note: "Tied to the sky" }],
      },
    },
  });
  characterId = made.json().id;

  const hidden = await app.inject({
    method: "POST",
    url: "/characters",
    headers: { cookie },
    payload: { name: "Work In Progress", isPublic: false },
  });
  privateId = hidden.json().id;
});

after(async () => {
  await app.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("a character page carries the tags a link preview reads", async () => {
  const res = await app.inject({ method: "GET", url: `/preview/character/${characterId}` });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /text\/html/);

  const html = res.body;
  assert.match(html, /<title>Urokojin — The Vantaverse \| VantaOrigin<\/title>/);
  assert.match(html, /property="og:title" content="Urokojin — The Vantaverse \| VantaOrigin"/);
  assert.match(html, /property="og:image" content="https:\/\/cdn\.example\.com\/urokojin\.jpg"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(
    html,
    /rel="canonical" href="https:\/\/www\.vantaorigin\.com\/character\?id=/
  );
});

test("it says who made the character, in words and in schema.org", async () => {
  const res = await app.inject({ method: "GET", url: `/preview/character/${characterId}` });
  const html = res.body;

  // The words an agent would quote back.
  assert.match(html, /Created by <a[^>]*>Ola Oriola \(@Vtgshadowscribe\)<\/a>/);
  assert.match(html, /Born under a sky that would not stop screaming/);
  assert.match(html, /Stormscript/);
  assert.match(html, /THE FINAL VERDICT/);
  assert.match(html, /The First Law/);
  assert.match(html, /Energy:<\/strong> 9\/10 — Tied to the sky/);

  const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s)[1]);
  assert.equal(jsonLd["@type"], "CreativeWork");
  assert.equal(jsonLd.name, "Urokojin");
  assert.equal(jsonLd.author.name, "Ola Oriola");
  assert.equal(jsonLd.author.alternateName, "@Vtgshadowscribe");
  assert.equal(jsonLd.isPartOf.name, "The Vantaverse");
});

test("a private character is not served to crawlers", async () => {
  const res = await app.inject({ method: "GET", url: `/preview/character/${privateId}` });
  assert.equal(res.statusCode, 404);
  assert.match(res.body, /noindex/);
});

test("a creator page lists their characters", async () => {
  const res = await app.inject({ method: "GET", url: "/preview/creator/vtgshadowscribe" });
  assert.equal(res.statusCode, 200);

  const html = res.body;
  assert.match(html, /<title>Ola Oriola \(@Vtgshadowscribe\) \| VantaOrigin<\/title>/);
  assert.match(html, /Character creator from Lagos\./);
  assert.match(html, /Urokojin/);
  assert.ok(!html.includes("Work In Progress"), "private work stays private");

  const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s)[1]);
  assert.equal(jsonLd["@type"], "ProfilePage");
  assert.equal(jsonLd.mainEntity.name, "Ola Oriola");
  assert.equal(jsonLd.hasPart[0].name, "Urokojin");
});

test("the sitemap lists every public character and creator", async () => {
  const res = await app.inject({ method: "GET", url: "/sitemap.xml" });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /xml/);
  assert.match(res.body, new RegExp(`character\\?id=${characterId}`));
  assert.match(res.body, /creator\/Vtgshadowscribe/);
  assert.ok(!res.body.includes(privateId), "private work stays out of the sitemap");
});

test("llms.txt reads as a list an agent can use", async () => {
  const res = await app.inject({ method: "GET", url: "/llms.txt" });
  assert.equal(res.statusCode, 200);
  assert.match(res.headers["content-type"], /text\/plain/);
  assert.match(res.body, /# VantaOrigin/);
  assert.match(res.body, /\[Urokojin\]\(https:\/\/www\.vantaorigin\.com\/character\?id=/);
  assert.match(res.body, /created by Ola Oriola \(@Vtgshadowscribe\), of The Vantaverse/);
  assert.ok(!res.body.includes("Work In Progress"));
});

test("an unknown character or creator says so without being indexed", async () => {
  const missing = await app.inject({
    method: "GET",
    url: "/preview/character/00000000-0000-0000-0000-000000000000",
  });
  assert.equal(missing.statusCode, 404);

  const noCreator = await app.inject({ method: "GET", url: "/preview/creator/nobody-at-all" });
  assert.equal(noCreator.statusCode, 404);
  assert.match(noCreator.body, /noindex/);
});

// Discovery is the way in: a crawler that lands there must be able to walk to
// every character without running the app.
test("the discovery page lists every published character in plain HTML", async () => {
  const res = await app.inject({ method: "GET", url: "/preview/discover" });
  assert.equal(res.statusCode, 200);

  const html = res.body;
  assert.match(html, /<h1>Discover characters on VantaOrigin<\/h1>/);
  assert.match(html, /Urokojin/);
  assert.match(html, /of The Vantaverse/);
  assert.match(html, /The Thunder Judge/);
  assert.match(html, /Ola Oriola \(@Vtgshadowscribe\)/);
  assert.ok(html.includes(`/character?id=${characterId}`), "links straight to the character");
  assert.ok(!html.includes("Work In Progress"), "private work stays private");

  const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s)[1]);
  assert.equal(jsonLd["@type"], "CollectionPage");
  assert.equal(jsonLd.mainEntity["@type"], "ItemList");
  assert.equal(jsonLd.mainEntity.itemListElement[0].name, "Urokojin");
  assert.equal(jsonLd.mainEntity.itemListElement[0].author.alternateName, "@Vtgshadowscribe");
});
