// A character card that can live on somebody else's site.
//
// Served as one small self-contained page rather than the app, because the
// app is most of a megabyte of JavaScript and nobody should pay that to show
// one card on their devlog. This is a few kilobytes of HTML with its styling
// inside it: no scripts, no fonts fetched, no tracking.
//
// Framing is the whole point here, so these are the only routes on the API
// that allow it. Everything else refuses, which is set in app.js.
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { characterByIdOrSlug } from "../db/slugs.js";
import { SITE, escape } from "./preview.js";

const PINK = "#fc187b";

// Dark by default, because most places that embed a character card are dark,
// and a light version for the ones that are not. Asked for with ?theme=light.
const THEMES = {
  dark: { bg: "#0e0e0e", panel: "#141a27", ink: "#ffffff", muted: "#9aa4b8", line: "rgba(255,255,255,0.14)" },
  light: { bg: "#ffffff", panel: "#f3f4f8", ink: "#111827", muted: "#5b6478", line: "rgba(0,0,0,0.12)" },
};

const card = (character, creator, theme, accent) => {
  const t = THEMES[theme] || THEMES.dark;
  const href = `${SITE}/character/${escape(character.slug || character.id)}`;
  const name = escape(character.name);
  const universe = character.universe ? escape(character.universe) : "";
  const tagline = character.tagline ? escape(character.tagline) : "";
  const by = escape(creator?.username || "");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${name} on VantaOrigin</title>
    <meta name="robots" content="noindex" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: transparent; }
      body {
        font-family: Inter, "Segoe UI", system-ui, -apple-system, sans-serif;
        color: ${t.ink};
      }
      a.card {
        display: flex; flex-direction: column; overflow: hidden;
        height: 100vh; min-height: 220px;
        border: 1.5px solid ${accent}; border-radius: 18px;
        background: ${t.bg}; text-decoration: none; color: inherit;
      }
      .art { position: relative; flex: 1 1 auto; min-height: 0; background: ${t.panel}; }
      .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .art .none {
        width: 100%; height: 100%;
        background: linear-gradient(135deg, #2b1a3d, #141a27);
      }
      .body { flex: 0 0 auto; padding: 14px 16px 15px; }
      .universe {
        margin: 0 0 4px; font-size: 11px; font-weight: 700;
        letter-spacing: 0.14em; text-transform: uppercase; color: ${accent};
      }
      .name { margin: 0; font-size: 19px; font-weight: 800; line-height: 1.2; }
      .tagline {
        margin: 6px 0 0; font-size: 13px; line-height: 1.45; color: ${t.muted};
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .foot {
        margin-top: 11px; padding-top: 10px; border-top: 1px solid ${t.line};
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        font-size: 11.5px; color: ${t.muted};
      }
      .foot b { color: ${t.ink}; font-weight: 700; }
      .on { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
      .dot { width: 6px; height: 6px; border-radius: 50%; background: ${accent}; }
      a.card:hover .name { color: ${accent}; }
    </style>
  </head>
  <body>
    <a class="card" href="${href}" target="_blank" rel="noopener">
      <div class="art">
        ${
          character.coverUrl
            ? `<img src="${escape(character.coverUrl)}" alt="${name}" loading="lazy" />`
            : `<div class="none"></div>`
        }
      </div>
      <div class="body">
        ${universe ? `<p class="universe">${universe}</p>` : ""}
        <h1 class="name">${name}</h1>
        ${tagline ? `<p class="tagline">${tagline}</p>` : ""}
        <div class="foot">
          <span>${by ? `by <b>${by}</b>` : ""}</span>
          <span class="on"><span class="dot"></span>VantaOrigin</span>
        </div>
      </div>
    </a>
  </body>
</html>
`;
};

const plain = (message) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8" />
   <style>body{margin:0;font:14px Inter,system-ui,sans-serif;color:#9aa4b8;
   display:flex;align-items:center;justify-content:center;height:100vh}</style>
   </head><body>${message}</body></html>`;

export default async function embedRoutes(app) {
  app.get("/embed/character/:idOrSlug", async (request, reply) => {
    const theme = request.query.theme === "light" ? "light" : "dark";

    const character = await characterByIdOrSlug(request.params.idOrSlug);

    // A card nobody published is not a card anybody else can show. The same
    // answer either way, so an embed cannot be used to find out whether a
    // private character exists.
    if (!character || !character.isPublic) {
      return reply
        .code(404)
        .type("text/html; charset=utf-8")
        .header("content-security-policy", "frame-ancestors *")
        .send(plain("This character is not available."));
    }

    const [creator] = await db
      .select({ username: users.username, allowEmbeds: users.allowEmbeds })
      .from(users)
      .where(eq(users.id, character.userId))
      .limit(1);

    if (creator && creator.allowEmbeds === false) {
      return reply
        .code(403)
        .type("text/html; charset=utf-8")
        .header("content-security-policy", "frame-ancestors *")
        .send(plain("This creator has turned off embedding."));
    }

    return reply
      .type("text/html; charset=utf-8")
      // The one place on this API that may be framed, and by anyone: a card
      // that cannot be put on somebody's site is not an embed.
      .header("content-security-policy", "frame-ancestors *")
      .header("cache-control", "public, max-age=300, s-maxage=3600")
      .send(card(character, creator, theme, character.accent || PINK));
  });
}
