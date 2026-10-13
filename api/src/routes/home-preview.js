// The pages that had nothing for a crawler at all.
//
// The front page, the about page and the help centre are drawn entirely in
// the browser, and unlike characters and creators nothing was serving them as
// plain HTML. A crawler that does not run scripts got the empty shell: five
// words, all of them in the title. That is the front page of the site.
//
// Google does run scripts eventually, which is presumably how it indexed
// them at all, but it is a second pass, it is slower, and it is not promised.
// The most important page on a site should not depend on it.
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { characters, users } from "../db/schema.js";
import { SITE, escape, page, summarise } from "./preview.js";

const PITCH =
  "VantaOrigin is one address for the characters you make. Each character gets a card with " +
  "their artwork, their name, the universe they belong to, their origin and their abilities, " +
  "grouped by project and shared from one page with your name on it.";

const WHAT_YOU_DO = [
  ["Make a character", "A name and a picture is all it takes to start. The origin, the abilities, the universe and the stats can be added whenever you like."],
  ["Keep them together", "Group characters by comic, book or project, so the cast of one story stays in one place instead of mixing with everything else you have drawn."],
  ["Share one link", "Your page is the address you give people. One link instead of a portfolio, a document, a drive folder and a pinned post."],
];

const QUESTIONS = [
  ["What is VantaOrigin?", "A home for the characters you make. You build a card for each one, organise them by project, and share them all from a single page."],
  ["What does it cost?", "Making and sharing characters is free."],
  ["Who is it for?", "Comic artists, illustrators, VTubers, writers and anyone who runs a long tabletop campaign: people who make characters and have nowhere good to put them."],
  ["What do I need to start?", "A name and a picture. Everything else about a character can wait until you feel like writing it."],
  ["Can other people see my characters?", "Only the ones you publish. A character stays private until you say otherwise."],
];

export default async function homePreviewRoutes(app) {
  app.get("/preview/home", async (request, reply) => {
    // A few real characters, so the front page a crawler reads has the site's
    // actual work on it rather than only its description of itself.
    const rows = await db
      .select({
        name: characters.name,
        slug: characters.slug,
        id: characters.id,
        universe: characters.universe,
        tagline: characters.tagline,
        username: users.username,
      })
      .from(characters)
      .innerJoin(users, eq(users.id, characters.userId))
      .where(eq(characters.isPublic, true))
      .orderBy(desc(characters.updatedAt))
      .limit(12);

    const description =
      "Create character cards, organize your characters, and share one simple page with anyone who wants to discover them.";

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "VantaOrigin",
      url: SITE,
      description,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE}/discover?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
      publisher: { "@type": "Organization", name: "VantaOrigin", url: SITE },
    };

    const made = rows
      .map(
        (row) =>
          `<li><a href="${SITE}/character/${escape(row.slug || row.id)}">${escape(row.name)}</a>${
            row.universe ? `, of ${escape(row.universe)}` : ""
          }${row.tagline ? `: ${escape(summarise(row.tagline, 90))}` : ""}, by ${escape(row.username)}</li>`
      )
      .join("");

    const body = [
      "<main>",
      "  <h1>Your characters. One link.</h1>",
      `  <p>${escape(PITCH)}</p>`,
      "  <h2>What you do here</h2>",
      ...WHAT_YOU_DO.map(
        ([heading, text]) => `  <h3>${escape(heading)}</h3>\n  <p>${escape(text)}</p>`
      ),
      rows.length
        ? `  <h2>Characters creators have published</h2>\n  <ul>${made}</ul>`
        : "",
      "  <h2>Questions</h2>",
      ...QUESTIONS.map(([q, a]) => `  <h3>${escape(q)}</h3>\n  <p>${escape(a)}</p>`),
      `  <p><a href="${SITE}/discover">Browse every published character</a> or <a href="${SITE}/blog">read the blog</a>.</p>`,
      "</main>",
    ]
      .filter(Boolean)
      .join("\n    ");

    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=300, s-maxage=3600")
      .send(
        page({
          title: "VantaOrigin: Your characters. One link.",
          description,
          canonical: SITE,
          jsonLd,
          body,
        })
      );
  });

  app.get("/preview/about", async (request, reply) => {
    const canonical = `${SITE}/about`;
    const description =
      "VantaOrigin is a platform made by creators, for creators, and for the characters they build.";

    const body = `<main>
      <h1>About VantaOrigin</h1>
      <p>${escape(description)}</p>
      <p>${escape(PITCH)}</p>
      <p>Creators have been making the same workaround out of four different products: a links
      page for the accounts, a document for the lore, a drive folder for the art, and a pinned
      post holding it together. A character is none of those things. It is a name, a face, an
      origin, a set of abilities and a world it belongs to, and those only mean anything in the
      same place.</p>
      <p><a href="${SITE}/blog/why-i-built-vantaorigin">Why this was built</a>,
      <a href="${SITE}/discover">the characters on it</a>,
      <a href="${SITE}/community">where the creators are</a>.</p>
    </main>`;

    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=300, s-maxage=3600")
      .send(
        page({
          title: "About VantaOrigin",
          description,
          canonical,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About VantaOrigin",
            url: canonical,
            description,
          },
          body,
        })
      );
  });

  app.get("/preview/help", async (request, reply) => {
    const canonical = `${SITE}/help`;
    const description =
      "How to make a character, publish it, share your page, and get help with your VantaOrigin account.";

    const body = `<main>
      <h1>VantaOrigin help</h1>
      <p>${escape(description)}</p>
      ${QUESTIONS.map(([q, a]) => `<h2>${escape(q)}</h2>\n      <p>${escape(a)}</p>`).join("\n      ")}
      <p>Anything else: <a href="mailto:hello@vantaorigin.com">hello@vantaorigin.com</a>.</p>
    </main>`;

    // Questions and answers, marked up as what they are, so a search engine
    // can show them as such.
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      url: canonical,
      mainEntity: QUESTIONS.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    };

    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=300, s-maxage=3600")
      .send(page({ title: "Help | VantaOrigin", description, canonical, jsonLd, body }));
  });
}
