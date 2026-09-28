// Pages for machines: link previews, search engines and AI agents.
//
// The app itself is a single page that draws everything in the browser, so a
// crawler that does not run JavaScript sees an empty shell. Facebook, X,
// WhatsApp, Discord and every AI crawler are exactly that kind of reader, so
// each character and each Realm also exists here as plain HTML: the tags a
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
    const realmUrl = `${SITE}/realm/${handle}`;
    const maker = fullName(creator);
    const title = `${character.name}${character.realm ? ` — ${character.realm}` : ""} | VantaOrigin`;
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
      isPartOf: character.realm
        ? { "@type": "CreativeWorkSeries", name: character.realm }
        : undefined,
      author: {
        "@type": "Person",
        name: maker,
        alternateName: creator.username,
        url: realmUrl,
      },
      creator: {
        "@type": "Person",
        name: maker,
        alternateName: creator.username,
        url: realmUrl,
      },
      publisher: { "@type": "Organization", name: "VantaOrigin", url: SITE },
    };

    const body = `
    <article>
      <h1>${escape(character.name)}</h1>
      ${character.tagline ? `<p><em>${escape(character.tagline)}</em></p>` : ""}
      <p>Created by <a href="${escape(realmUrl)}">${escape(maker)} (${escape(
        creator.username
      )})</a>${character.realm ? ` · Realm: ${escape(character.realm)}` : ""}</p>
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

  // ---- one creator's Realm ----
  app.get("/preview/realm/:username", async (request, reply) => {
    const creator = await userByHandle(request.params.username);
    if (!creator) return reply.code(404).type("text/html").send(notFound("Realm"));

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
    const canonical = `${SITE}/realm/${handle}`;
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
                    character.realm ? ` (${escape(character.realm)})` : ""
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
      <p><a href="${escape(canonical)}">Visit this Realm on VantaOrigin</a></p>
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
      { loc: `${SITE}/about`, priority: "0.4" },
      ...creators.map((creator) => ({
        loc: `${SITE}/realm/${creator.username.replace(/^@/, "")}`,
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
      "> A home for characters. Creators build a Realm, add their characters,",
      "> and share everything with one link.",
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
          character.realm ? `, of ${character.realm}` : ""
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
