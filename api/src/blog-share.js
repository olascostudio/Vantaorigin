// The picture a link preview shows.
//
// Drawn from the post's own hero and its own title, at the size every scraper
// expects, and stored like any other upload so a crawler gets it from the
// bucket rather than waking this service up to draw it.
//
// JPEG rather than WebP on purpose: WebP support across the scrapers that
// matter is still patchy, and a link preview that silently shows nothing is
// worse than a slightly larger file.
import { createHash } from "node:crypto";
import sharp from "sharp";
import { storage } from "./adapters/storage.js";
import { fitLines, inkOf } from "./type.js";

const W = 1200;
const H = 630;
const PAD = 72;

const INK = "#0e0e0e";
const PINK = "#fc187b";
const PURPLE = "#9333ea";

const escape = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Measured against the real letters rather than guessed at from an average
// character width, and stepped down until it fits in three lines.
const typeset = (text) =>
  fitLines(text || "VantaOrigin", {
    room: W - PAD * 2,
    sizes: [62, 56, 50, 44, 40, 36],
    weight: 800,
    maxLines: 3,
  });

// How dark the bottom needs to be is a question about this one picture: white
// words over a pale sky need more than white words over a night scene.
const scrimFor = async (artwork, top, height) => {
  if (!artwork) return 0.92;
  try {
    const { channels } = await sharp(artwork)
      .extract({ left: 0, top, width: W, height })
      .stats();
    const [r, g, b] = channels.map((channel) => channel.mean);
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (brightness < 0.22) return 0.84;
    if (brightness < 0.4) return 0.9;
    if (brightness < 0.6) return 0.95;
    return 0.97;
  } catch {
    return 0.92;
  }
};

// The hero, framed the way the site frames it, so the share picture and the
// article show the same part of the drawing.
const framed = async (heroUrl, focus) => {
  if (!heroUrl) return null;

  const response = await fetch(heroUrl, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`hero came back ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());

  const widened = await sharp(source).resize({ width: W }).toBuffer();
  const { height = H } = await sharp(widened).metadata();
  const spare = Math.max(0, height - H);

  if (spare === 0) {
    return sharp(widened).resize({ width: W, height: H, fit: "cover" }).toBuffer();
  }

  const at = Math.round(spare * (Math.min(100, Math.max(0, focus ?? 50)) / 100));
  return sharp(widened).extract({ left: 0, top: at, width: W, height: H }).toBuffer();
};

export async function shareImage({ title, label, heroUrl, heroFocus }) {
  const artwork = await framed(heroUrl, heroFocus);

  const { size, lines } = typeset(title || "VantaOrigin");
  const lineHeight = Math.round(size * 1.14);
  const block = lines.length * lineHeight;
  const first = H - PAD - block + size;

  const deepest = await scrimFor(artwork, Math.max(0, first - size - 60), Math.min(H, block + 110));

  // Outlines, not text elements: nothing is looked up when this is drawn.
  const words = lines
    .map((line, index) =>
      inkOf(line, { x: PAD, y: first + index * lineHeight, size, weight: 800, fill: "#ffffff" })
    )
    .join("\n    ");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="76%" cy="24%" r="64%">
      <stop offset="0%" stop-color="${PURPLE}" stop-opacity="0.4"/>
      <stop offset="52%" stop-color="${PINK}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.1"/>
      <stop offset="40%" stop-color="#000000" stop-opacity="${(deepest * 0.6).toFixed(2)}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${deepest}"/>
    </linearGradient>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#1a1a1a" stroke-width="1"/>
    </pattern>
  </defs>
  ${
    artwork
      ? `<rect width="${W}" height="${H}" fill="url(#scrim)"/>`
      : `<rect width="${W}" height="${H}" fill="${INK}"/>
         <rect width="${W}" height="${H}" fill="url(#grid)" opacity="0.5"/>
         <rect width="${W}" height="${H}" fill="url(#glow)"/>`
  }
    <rect x="${PAD}" y="${first - size - 46}" width="52" height="4" rx="2" fill="${PINK}"/>
    ${inkOf((label || "The VantaOrigin blog").toUpperCase(), {
      x: PAD,
      y: first - size - 22,
      size: 17,
      weight: 700,
      fill: PINK,
      tracking: 2.4,
    })}
    ${words}
    ${inkOf("vantaorigin.com", { x: PAD, y: H - 32, size: 17, weight: 400, fill: "#8e97a8" })}
</svg>`;

  const layers = [];
  if (artwork) layers.push({ input: artwork, top: 0, left: 0 });
  layers.push({ input: Buffer.from(svg), top: 0, left: 0 });

  return sharp({ create: { width: W, height: H, channels: 4, background: INK } })
    .composite(layers)
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

// Drawn and stored. Never throws at the caller: a link preview is worth
// having and never worth failing a publish over, so trouble here leaves the
// post alone and says so in the log.
export async function storeShareImage(post, app) {
  try {
    const body = await shareImage({
      title: post.title,
      label: post.category,
      heroUrl: post.heroUrl,
      heroFocus: post.heroFocus,
    });

    // The name carries a mark of what it was drawn from, so changing the
    // title gives the picture a new address. Facebook, X and the rest cache
    // these hard and by URL: at a fixed name a retitled post would keep
    // showing its old card for as long as their cache felt like it.
    const key = `${post.authorId || "blog"}/share/${post.id}-${stamp(post)}.jpg`;
    const url = await storage.put(key, body, "image/jpeg");
    app?.log?.info({ post: post.slug, bytes: body.length }, "share picture drawn");
    return url;
  } catch (error) {
    app?.log?.warn({ err: error, post: post.slug }, "could not draw a share picture");
    return null;
  }
}

// What it is drawn from. If none of this changed, the old one still shows the
// right thing and there is no reason to draw it again.
export const shareImageInputs = (post) =>
  [post.title, post.category, post.heroUrl, post.heroFocus].join("\u0000");

// A short, stable mark of those inputs, for the file's name.
const stamp = (post) =>
  createHash("sha256").update(shareImageInputs(post)).digest("hex").slice(0, 10);
