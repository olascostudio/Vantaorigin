// A hero for a blog post, in about ten seconds.
//
// Drawing one by hand every time is how a blog stops having posts. This makes
// a consistent, on-brand one from a title, with or without artwork, so the
// picture is never the reason a post does not go out.
//
//   node scripts/blog-hero.mjs --title "Every character lived in five places"
//   node scripts/blog-hero.mjs --title "Meet Urokojin" --art src/assets/landing/pages/urokojin.webp
//   node scripts/blog-hero.mjs --title "..." --label "Craft" --out hero.webp
//
// Two shapes. Without artwork it is typographic: the title on the brand
// background, which suits a post about building the thing. With artwork it is
// the art, darkened just enough that the title stays readable on top.
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import sharp from "sharp";

const W = 1600;
const H = 840;
const PAD = 110;

const INK = "#0e0e0e";
const PINK = "#fc187b";
const PURPLE = "#9333ea";

const args = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const title = flag("title");
const label = flag("label", "The VantaOrigin blog");
const art = flag("art");
const out = flag("out", "blog-hero.webp");

if (!title) {
  console.error("A hero needs a title.\n\n  node scripts/blog-hero.mjs --title \"Your post title\" [--art path] [--label Craft] [--out hero.webp]");
  process.exit(1);
}

const escape = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Bold sans runs at roughly half the font size per character. Close enough to
// wrap on, and the size steps down until the longest line fits.
const wrap = (text, size) => {
  const room = W - PAD * 2;
  const perChar = size * 0.52;
  const max = Math.floor(room / perChar);

  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

// Big title, unless it is a long one, in which case smaller until it fits in
// three lines without crowding the frame.
const typeset = (text) => {
  for (const size of [86, 76, 68, 60, 54, 48]) {
    const lines = wrap(text, size);
    if (lines.length <= 3) return { size, lines };
  }
  return { size: 44, lines: wrap(text, 44).slice(0, 4) };
};

const { size, lines } = typeset(title);
const lineHeight = Math.round(size * 1.12);
const blockHeight = lines.length * lineHeight;
// Sat on the lower half, so artwork keeps its top half visible.
const firstBaseline = H - PAD - blockHeight + size;

const titleSvg = lines
  .map(
    (line, index) =>
      `<text x="${PAD}" y="${firstBaseline + index * lineHeight}" font-family="Sora, Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="${size}" font-weight="800" fill="#ffffff" letter-spacing="-1">${escape(line)}</text>`
  )
  .join("\n    ");

const chrome = `
    <rect x="${PAD}" y="${firstBaseline - size - 54}" width="64" height="5" rx="2.5" fill="${PINK}"/>
    <text x="${PAD}" y="${firstBaseline - size - 26}" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif"
          font-size="21" font-weight="700" letter-spacing="3" fill="${PINK}">${escape(label.toUpperCase())}</text>
    ${titleSvg}
    <text x="${PAD}" y="${H - 44}" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif"
          font-size="20" fill="#8e97a8">vantaorigin.com</text>`;

const background = art
  ? // The artwork carries it; this only darkens the bottom so words stay legible.
    `<rect width="${W}" height="${H}" fill="url(#scrim)"/>`
  : `<rect width="${W}" height="${H}" fill="${INK}"/>
     <rect width="${W}" height="${H}" fill="url(#grid)" opacity="0.5"/>
     <rect width="${W}" height="${H}" fill="url(#glow)"/>`;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="76%" cy="26%" r="62%">
      <stop offset="0%" stop-color="${PURPLE}" stop-opacity="0.38"/>
      <stop offset="52%" stop-color="${PINK}" stop-opacity="0.13"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.12"/>
      <stop offset="42%" stop-color="#000000" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.92"/>
    </linearGradient>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#1a1a1a" stroke-width="1"/>
    </pattern>
  </defs>
  ${background}
  ${chrome}
</svg>`;

const layers = [];

if (art) {
  // Artwork is usually taller than this frame, so something gets cropped.
  // "attention" lets sharp find the busiest part and keep that, which beats
  // guessing from the top and cutting the character's head off. --focus top
  // or centre or bottom overrides it when it picks wrong.
  const focus = flag("focus", "attention");
  const artwork = await sharp(await readFile(art))
    .resize({ width: W, height: H, fit: "cover", position: focus })
    .toBuffer();
  layers.push({ input: artwork, top: 0, left: 0 });
}
layers.push({ input: Buffer.from(svg), top: 0, left: 0 });

const canvas = sharp({
  create: { width: W, height: H, channels: 4, background: INK },
});

const webp = await canvas.composite(layers).webp({ quality: 84, effort: 6 }).toBuffer();
await writeFile(out, webp);

console.log(
  `  ${basename(out)}  ${W}x${H}  ${Math.round(webp.length / 1024)}KB  ` +
    `${art ? `over ${basename(art)}` : "typographic"}  ${lines.length} line${lines.length === 1 ? "" : "s"}`
);
