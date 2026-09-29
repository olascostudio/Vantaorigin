// Pages for machines: link previews, search engines and AI agents.
//
// The app itself is a single page that draws everything in the browser, so a
// crawler that does not run JavaScript sees an empty shell. Facebook, X,
// WhatsApp, Discord and every AI crawler are exactly that kind of reader, so
// each character and each creator page also exists here as plain HTML: the tags a
// preview needs, the same words a visitor reads, and schema.org notes saying
// who made what.
//
// Vercel sends those readers here; a person opening the link still gets the
// app. What they read is the same either way, which is the only honest way to
// do this.
import { and, desc, eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { characterAssets, characters, highlights, users } from "../db/schema.js";
import { userByHandle } from "../db/handles.js";

const SITE = (config.SITE_URL || "https://www.vantaorigin.com").replace(/\/$/, "");

// The places creators gather. Kept here as well as on the page itself: two
// short lists that rarely change beat a request to the app for its own copy.
const COMMUNITY = [
  ["Discord", "https://discord.gg/4E5dFcaEAa"],
  ["TikTok", "https://www.tiktok.com/@vantaorigin"],
  ["Instagram", "https://www.instagram.com/vantaoriginstudio/"],
  ["Facebook", "https://facebook.com/groups/1640856640355085/"],
  ["X", "https://x.com/vantaorigin"],
];

// The studio's portfolio, published by the app's build at /portfolio.json.
// Held for ten minutes so a crawl of a hundred pages fetches it once.
let portfolioCache = { at: 0, data: null };

// Held between requests, which is the point — and a thing a test must be
// able to put back, or one test decides what the next one sees.
export function forgetPortfolio() {
  portfolioCache = { at: 0, data: null };
}

async function studioPortfolio() {
  const fresh = Date.now() - portfolioCache.at < 10 * 60_000;
  if (fresh && portfolioCache.data) return portfolioCache.data;

  const response = await fetch(`${SITE}/portfolio.json`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`portfolio.json came back ${response.status}`);

  const data = await response.json();
  portfolioCache = { at: Date.now(), data };
  return data;
}

const escape = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// A preview box shows a couple of lines; this keeps a whole backstory from
// spilling into it while leaving whole words intact.
function summarise(text, limit = 200) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" ") || limit)}…`;
}

const fullName = (user) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
  user.username.replace(/^@/, "");

function page({ title, description, canonical, image, jsonLd, body }) {
  const tags = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<link rel="canonical" href="${escape(canonical)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="VantaOrigin" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${escape(canonical)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(title)}" />`,
    `<meta name="twitter:description" content="${escape(description)}" />`,
  ];

  if (image) {
    tags.push(
      `<meta property="og:image" content="${escape(image)}" />`,
      `<meta property="og:image:alt" content="${escape(title)}" />`,
      `<meta name="twitter:image" content="${escape(image)}" />`
    );
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${tags.join("\n    ")}
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body>
    ${body}
  </body>
</html>
`;
}

// Abilities and stats read as a list, which is what a crawler wants.
function detailsHtml(details = {}) {
  const parts = [];
  const entry = (label, value) =>
    value?.name || value?.description
      ? `<li><strong>${escape(label)}:</strong> ${escape(value.name || "")}${
          value.description ? ` — ${escape(value.description)}` : ""
        }</li>`
      : "";

  const abilities = [
    entry("Core ability", details.core),
    ...(details.core?.extras || []).map((extra) => entry("Also", extra)),
    entry("Signature move", details.signature),
    entry("Weakness", details.weakness),
    entry("Alignment", details.alignment),
  ].filter(Boolean);

  if (abilities.length) parts.push(`<h2>Abilities</h2>\n<ul>${abilities.join("")}</ul>`);

  const stats = (details.stats || []).filter((stat) => stat?.attribute);
  if (stats.length) {
    parts.push(
      `<h2>Stats</h2>\n<ul>${stats
        .map(
          (stat) =>
            `<li><strong>${escape(stat.attribute)}:</strong> ${escape(String(stat.level))}/10${
              stat.note ? ` — ${escape(stat.note)}` : ""
            }</li>`
        )
        .join("")}</ul>`
    );
  }

  return parts.join("\n");
}

export default async function previewRoutes(app) {
  // ---- one character ----
  app.get("/preview/character/:id", async (request, reply) => {
    const [row] = await db
      .select({ character: characters, creator: users })
      .from(characters)
      .innerJoin(users, eq(users.id, characters.userId))
      .where(and(eq(characters.id, request.params.id), eq(characters.isPublic, true)))
      .limit(1);

    if (!row) return reply.code(404).type("text/html").send(notFound("character"));

    const { character, creator } = row;
    const artwork = await db
      .select({ url: characterAssets.url })
      .from(characterAssets)
      .where(eq(characterAssets.characterId, character.id));

    const handle = creator.username.replace(/^@/, "");
    const canonical = `${SITE}/character?id=${character.id}`;
    const creatorUrl = `${SITE}/creator/${handle}`;
    const maker = fullName(creator);
    const title = `${character.name}${character.universe ? ` — ${character.universe}` : ""} | VantaOrigin`;
    const description = summarise(
      character.tagline
        ? `${character.tagline} A character by ${maker} (${creator.username}) on VantaOrigin. ${character.backstory}`
        : `A character by ${maker} (${creator.username}) on VantaOrigin. ${character.backstory}`
    );

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: character.name,
      alternateName: character.tagline || undefined,
      url: canonical,
      description: summarise(character.backstory, 500) || character.tagline || undefined,
      image: character.coverUrl || undefined,
      dateCreated: character.createdAt,
      dateModified: character.updatedAt,
      inLanguage: "en",
      isPartOf: character.universe
        ? { "@type": "CreativeWorkSeries", name: character.universe }
        : undefined,
      author: {
        "@type": "Person",
        name: maker,
        alternateName: creator.username,
        url: creatorUrl,
      },
      creator: {
        "@type": "Person",
        name: maker,
        alternateName: creator.username,
        url: creatorUrl,
      },
      publisher: { "@type": "Organization", name: "VantaOrigin", url: SITE },
    };

    const body = `
    <article>
      <h1>${escape(character.name)}</h1>
      ${character.tagline ? `<p><em>${escape(character.tagline)}</em></p>` : ""}
      <p>Created by <a href="${escape(creatorUrl)}">${escape(maker)} (${escape(
        creator.username
      )})</a>${character.universe ? ` · Universe: ${escape(character.universe)}` : ""}</p>
      ${character.coverUrl ? `<img src="${escape(character.coverUrl)}" alt="${escape(character.name)}" width="400" />` : ""}
      ${character.backstory ? `<h2>Origin story</h2>\n<p>${escape(character.backstory)}</p>` : ""}
      ${detailsHtml(character.details)}
      ${
        artwork.length
          ? `<h2>Artwork</h2>\n${artwork
              .map(
                (asset) =>
                  `<img src="${escape(asset.url)}" alt="${escape(character.name)} artwork" width="400" />`
              )
              .join("\n")}`
          : ""
      }
      <p><a href="${escape(canonical)}">See ${escape(character.name)} on VantaOrigin</a></p>
    </article>`;

    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=60, s-maxage=300")
      .send(page({ title, description, canonical, image: character.coverUrl, jsonLd, body }));
  });

  // ---- one creator's page ----
  app.get("/preview/creator/:username", async (request, reply) => {
    const creator = await userByHandle(request.params.username);
    if (!creator) return reply.code(404).type("text/html").send(notFound("page"));

    const [published, posts] = await Promise.all([
      db
        .select()
        .from(characters)
        .where(and(eq(characters.userId, creator.id), eq(characters.isPublic, true)))
        .orderBy(desc(characters.createdAt)),
      db
        .select({ title: highlights.title, content: highlights.content })
        .from(highlights)
        .where(eq(highlights.userId, creator.id))
        .orderBy(desc(highlights.createdAt))
        .limit(10),
    ]);

    const handle = creator.username.replace(/^@/, "");
    const canonical = `${SITE}/creator/${handle}`;
    const maker = fullName(creator);
    const title = `${maker} (${creator.username}) | VantaOrigin`;
    const description = summarise(
      creator.bio ||
        `${maker} shares ${published.length} character${
          published.length === 1 ? "" : "s"
        } on VantaOrigin${published.length ? `: ${published.map((c) => c.name).join(", ")}` : ""}.`
    );

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: canonical,
      mainEntity: {
        "@type": "Person",
        name: maker,
        alternateName: creator.username,
        url: canonical,
        description: creator.bio || undefined,
        image: creator.avatarUrl || undefined,
      },
      hasPart: published.map((character) => ({
        "@type": "CreativeWork",
        name: character.name,
        url: `${SITE}/character?id=${character.id}`,
        description: character.tagline || undefined,
        image: character.coverUrl || undefined,
      })),
    };

    const body = `
    <main>
      <h1>${escape(maker)} (${escape(creator.username)})</h1>
      ${creator.bio ? `<p>${escape(creator.bio)}</p>` : ""}
      ${creator.avatarUrl ? `<img src="${escape(creator.avatarUrl)}" alt="${escape(maker)}" width="200" />` : ""}
      <h2>Characters</h2>
      ${
        published.length
          ? `<ul>${published
              .map(
                (character) =>
                  `<li><a href="${SITE}/character?id=${escape(character.id)}">${escape(
                    character.name
                  )}</a>${character.tagline ? ` — ${escape(character.tagline)}` : ""}${
                    character.universe ? ` (${escape(character.universe)})` : ""
                  }</li>`
              )
              .join("")}</ul>`
          : "<p>No characters published yet.</p>"
      }
      ${
        posts.length
          ? `<h2>Highlights</h2>\n<ul>${posts
              .map(
                (post) =>
                  `<li><strong>${escape(post.title || "Untitled")}</strong> ${escape(
                    summarise(post.content, 300)
                  )}</li>`
              )
              .join("")}</ul>`
          : ""
      }
      <p><a href="${escape(canonical)}">Visit this page on VantaOrigin</a></p>
    </main>`;

    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=60, s-maxage=300")
      .send(
        page({
          title,
          description,
          canonical,
          image: creator.bannerUrl || creator.avatarUrl,
          jsonLd,
          body,
        })
      );
  });

  // ---- the discovery page, as a crawler reads it ----
  //
  // The way in. A crawler that lands here should be able to walk to every
  // published character without running a line of JavaScript, which is what
  // turns "who is Urokojin?" into a page it can actually quote.
  app.get("/preview/discover", async (request, reply) => {
    const rows = await db
      .select({ character: characters, creator: users })
      .from(characters)
      .innerJoin(users, eq(users.id, characters.userId))
      .where(eq(characters.isPublic, true))
      .orderBy(desc(characters.createdAt))
      .limit(500);

    const canonical = `${SITE}/discover`;
    const names = rows.slice(0, 12).map(({ character }) => character.name);
    const description = summarise(
      rows.length
        ? `Discover ${rows.length} character${rows.length === 1 ? "" : "s"} published by creators on VantaOrigin${
            names.length ? `, including ${names.join(", ")}` : ""
          }.`
        : "Characters published by creators on VantaOrigin."
    );

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Discover characters on VantaOrigin",
      url: canonical,
      description,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: rows.length,
        itemListElement: rows.map(({ character, creator }, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE}/character?id=${character.id}`,
          name: character.name,
          author: { "@type": "Person", name: fullName(creator), alternateName: creator.username },
        })),
      },
    };

    const body = `
    <main>
      <h1>Discover characters on VantaOrigin</h1>
      <p>Every character below is published by the creator who made it. Each one has a page of its own.</p>
      ${
        rows.length
          ? `<ul>${rows
              .map(({ character, creator }) => {
                const handle = creator.username.replace(/^@/, "");
                return `<li>
        <a href="${SITE}/character?id=${escape(character.id)}">${escape(character.name)}</a>${
                  character.universe ? ` of ${escape(character.universe)}` : ""
                }${character.tagline ? ` — ${escape(character.tagline)}` : ""}, created by
        <a href="${SITE}/creator/${escape(handle)}">${escape(fullName(creator))} (${escape(
          creator.username
        )})</a>.${character.backstory ? ` ${escape(summarise(character.backstory, 240))}` : ""}
      </li>`;
              })
              .join("\n")}</ul>`
          : "<p>No characters published yet.</p>"
      }
      <p><a href="${escape(canonical)}">Browse discovery on VantaOrigin</a></p>
    </main>`;

    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=60, s-maxage=300")
      .send(page({ title: "Discover characters | VantaOrigin", description, canonical, jsonLd, body }));
  });

  // ---- how a crawler finds all of it ----
  app.get("/sitemap.xml", async (request, reply) => {
    const [published, creators] = await Promise.all([
      db
        .select({ id: characters.id, updatedAt: characters.updatedAt })
        .from(characters)
        .where(eq(characters.isPublic, true))
        .orderBy(desc(characters.updatedAt)),
      db.select({ username: users.username, updatedAt: users.updatedAt }).from(users),
    ]);

    const urls = [
      { loc: SITE, priority: "1.0" },
      { loc: `${SITE}/discover`, priority: "0.8" },
      { loc: `${SITE}/marketplace`, priority: "0.6" },
      { loc: `${SITE}/community`, priority: "0.5" },
      { loc: `${SITE}/help`, priority: "0.4" },
      { loc: `${SITE}/about`, priority: "0.4" },
      ...creators.map((creator) => ({
        loc: `${SITE}/creator/${creator.username.replace(/^@/, "")}`,
        lastmod: creator.updatedAt,
        priority: "0.7",
      })),
      ...published.map((character) => ({
        loc: `${SITE}/character?id=${character.id}`,
        lastmod: character.updatedAt,
        priority: "0.9",
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, lastmod, priority }) =>
      `  <url><loc>${escape(loc)}</loc>${
        lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ""
      }<priority>${priority}</priority></url>`
  )
  .join("\n")}
</urlset>
`;

    return reply
      .type("application/xml")
      .header("cache-control", "public, max-age=300, s-maxage=3600")
      .send(xml);
  });

  // ---- a plain list for agents that would rather read than crawl ----
  // ---- the studio's work for hire ----
  //
  // The marketplace draws itself from a file bundled into the app, which a
  // crawler never sees. The same file is published at /portfolio.json, so it
  // is read from there — once every ten minutes rather than once per crawler.
  app.get("/preview/marketplace", async (request, reply) => {
    const portfolio = await studioPortfolio().catch(() => null);
    if (!portfolio) {
      return reply.code(503).type("text/html").send(notFound("marketplace"));
    }

    const albums = portfolio.albums || [];
    const projects = portfolio.projects || [];
    const canonical = `${SITE}/marketplace`;
    const description = summarise(
      `Character art, 3D, props, covers, cards and comic work by VantaOrigin Studio — ${projects.length} pieces across ${albums.length} kinds of work, made for creators.`
    );

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "VantaOrigin Studio",
      url: canonical,
      description,
      about: albums.map((album) => ({ "@type": "Thing", name: album.title })),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: projects.length,
        itemListElement: projects.slice(0, 100).map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: project.title,
          url: project.permalink,
        })),
      },
    };

    const byAlbum = albums
      .map((album) => {
        const inside = projects.filter((project) => project.albumId === album.id);
        if (!inside.length) return "";
        return `<h2>${escape(album.title)}</h2>
      <ul>${inside
        .slice(0, 60)
        .map(
          (project) =>
            `<li>${escape(project.title)}${project.artist ? ` — by ${escape(project.artist)}` : ""}</li>`
        )
        .join("")}</ul>`;
      })
      .filter(Boolean)
      .join("\n");

    const body = `
    <main>
      <h1>VantaOrigin Studio</h1>
      <p>Creative services for creators: character illustration, 3D characters and assets, prop design, book and cover design, cards and TCG assets, comic art, worldbuilding and brand design.</p>
      ${byAlbum}
      <p><a href="${escape(canonical)}">See the studio on VantaOrigin</a></p>
    </main>`;

    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=300, s-maxage=3600")
      .send(page({ title: "VantaOrigin Studio — creative services", description, canonical, jsonLd, body }));
  });

  // ---- where creators gather ----
  app.get("/preview/community", async (request, reply) => {
    const canonical = `${SITE}/community`;
    const description =
      "Join the VantaOrigin community of creators on Discord, TikTok, Instagram and Facebook.";

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "VantaOrigin community",
      url: canonical,
      description,
      mainEntity: {
        "@type": "Organization",
        name: "VantaOrigin",
        url: SITE,
        sameAs: COMMUNITY.map(([, url]) => url),
      },
    };

    const body = `
    <main>
      <h1>The VantaOrigin community</h1>
      <p>${escape(description)}</p>
      <ul>${COMMUNITY.map(
        ([name, url]) => `<li><a href="${escape(url)}">${escape(name)}</a></li>`
      ).join("")}</ul>
      <p><a href="${escape(canonical)}">Open the community page on VantaOrigin</a></p>
    </main>`;

    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=300, s-maxage=3600")
      .send(page({ title: "Community | VantaOrigin", description, canonical, jsonLd, body }));
  });

  app.get("/llms.txt", async (request, reply) => {
    const rows = await db
      .select({ character: characters, creator: users })
      .from(characters)
      .innerJoin(users, eq(users.id, characters.userId))
      .where(eq(characters.isPublic, true))
      .orderBy(desc(characters.createdAt))
      .limit(500);

    const lines = [
      "# VantaOrigin",
      "",
      "> A home for characters. Creators make character cards, organise them,",
      "> and share one page with anyone who wants to discover them.",
      "",
      `Site: ${SITE}`,
      `Sitemap: ${SITE}/sitemap.xml`,
      "",
      "## Characters",
      "",
      ...rows.map(({ character, creator }) => {
        const maker = fullName(creator);
        const about = summarise(character.backstory || character.tagline, 220);
        return `- [${character.name}](${SITE}/character?id=${character.id}): created by ${maker} (${creator.username})${
          character.universe ? `, of ${character.universe}` : ""
        }${about ? `. ${about}` : ""}`;
      }),
    ];

    return reply
      .type("text/plain; charset=utf-8")
      .header("cache-control", "public, max-age=300, s-maxage=3600")
      .send(`${lines.join("\n")}\n`);
  });
}

const notFound = (what) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Not found | VantaOrigin</title><meta name="robots" content="noindex" /></head><body><h1>Not found</h1><p>That ${what} is private, removed, or the link is wrong.</p><p><a href="${SITE}">VantaOrigin</a></p></body></html>`;
