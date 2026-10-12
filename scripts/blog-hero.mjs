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

// A hero made of artwork does not need the title burned into it: the article
// prints the title right underneath, and the card on the blog prints it
// beside. Burning it in says the same thing twice.
//
// It earns its place in one spot, which is the picture a link preview shows,
// because there the title is all anybody gets. So: artwork alone for the post,
// artwork with the title for sharing, and the editor has a slot for each.
const quiet = args.includes("--no-title");

if (!title && !quiet) {
  console.error(
    "A hero needs a title, or --no-title with artwork.\n\n" +
      "  node scripts/blog-hero.mjs --title \"Your post title\" [--art path] [--label Craft] [--out hero.webp]\n" +
      "  node scripts/blog-hero.mjs --no-title --art path/to/art.webp --out hero.webp"
  );
  process.exit(1);
}

if (quiet && !art) {
  console.error("--no-title needs --art: without either there is nothing to show.");
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

const { size, lines } = quiet ? { size: 0, lines: [] } : typeset(title);
const lineHeight = Math.round(size * 1.12);
const blockHeight = lines.length * lineHeight;
// Sat on the lower half, so artwork keeps its top half visible.
const firstBaseline = quiet ? H - 44 : H - PAD - blockHeight + size;

const titleSvg = lines
  .map(
    (line, index) =>
      `<text x="${PAD}" y="${firstBaseline + index * lineHeight}" font-family="Sora, Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="${size}" font-weight="800" fill="#ffffff" letter-spacing="-1">${escape(line)}</text>`
  )
  .join("\n    ");

// Small enough to stay out of the way, there so the picture still says where
// it came from if somebody saves it.
const mark = `
    <text x="${PAD}" y="${H - 44}" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif"
          font-size="20" fill="#8e97a8">vantaorigin.com</text>`;

const chrome = quiet
  ? mark
  : `
    <rect x="${PAD}" y="${firstBaseline - size - 54}" width="64" height="5" rx="2.5" fill="${PINK}"/>
    <text x="${PAD}" y="${firstBaseline - size - 26}" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif"
          font-size="21" font-weight="700" letter-spacing="3" fill="${PINK}">${escape(label.toUpperCase())}</text>
    ${titleSvg}${mark}`;

const layers = [];
let artwork = null;
let chosenFocus = "";

if (art) {
  const source = await sharp(await readFile(art));
  const { width: sw = 0, height: sh = 0 } = await source.metadata();

  // Artwork is taller than this frame, so a band of it gets kept and the rest
  // is cut. Which band is the whole question, and no automatic answer gets it
  // right: asking sharp for the busiest region on a portrait drawing picks
  // the middle, which is a torso, and cropping from the top on the same
  // drawing lands in the sky above the character's head.
  //
  // So it is a number instead. --y is where the band sits, 0 at the top of
  // the picture and 1 at the bottom. 0.3 frames head and shoulders on most
  // character art, which is what a hero wants. Run it, look at it, nudge it.
  const tall = sh > sw * 1.1;
  const wanted = Number(flag("y", tall ? "0.3" : "0.5"));
  const y = Number.isFinite(wanted) ? Math.min(1, Math.max(0, wanted)) : 0.3;
  chosenFocus = `y ${y}`;

  // Widened to the frame first, so the band is measured in the picture's own
  // proportions rather than the output's.
  const widened = await source.resize({ width: W }).toBuffer();
  const grown = await sharp(widened).metadata();
  const spare = Math.max(0, (grown.height ?? H) - H);

  artwork =
    spare === 0
      ? await sharp(widened).resize({ width: W, height: H, fit: "cover" }).toBuffer()
      : await sharp(widened)
          .extract({ left: 0, top: Math.round(spare * y), width: W, height: H })
          .toBuffer();
  layers.push({ input: artwork, top: 0, left: 0 });
}

// How dark the scrim needs to be is a question about this particular picture.
// White text over a pale sky needs more than white text over a night scene,
// and the point of this script is not having to think about that.
const scrimStrength = async () => {
  if (!artwork) return 0.92;
  // No words to keep readable, so only enough to settle the artwork onto a
  // dark page rather than ending at a hard edge.
  if (quiet) return 0.45;

  const top = Math.max(0, firstBaseline - size - 70);
  const region = {
    left: 0,
    top,
    width: Math.min(W, 1300),
    height: Math.min(H - top, blockHeight + 120),
  };

  const { channels } = await sharp(artwork).extract(region).stats();
  const [r, g, b] = channels.map((channel) => channel.mean);
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Dark art needs little help; a bright patch under the words needs a lot.
  if (brightness < 0.22) return 0.82;
  if (brightness < 0.4) return 0.9;
  if (brightness < 0.6) return 0.95;
  return 0.97;
};

const deepest = await scrimStrength();

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
      <stop offset="42%" stop-color="#000000" stop-opacity="${(deepest * 0.6).toFixed(2)}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${deepest}"/>
    </linearGradient>
    <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#1a1a1a" stroke-width="1"/>
    </pattern>
  </defs>
  ${background}
  ${chrome}
</svg>`;

layers.push({ input: Buffer.from(svg), top: 0, left: 0 });

const canvas = sharp({
  create: { width: W, height: H, channels: 4, background: INK },
});

const webp = await canvas.composite(layers).webp({ quality: 84, effort: 6 }).toBuffer();
await writeFile(out, webp);

console.log(
  `  ${basename(out)}  ${W}x${H}  ${Math.round(webp.length / 1024)}KB  ` +
    `${art ? `over ${basename(art)}, crop ${chosenFocus}, scrim ${deepest}` : "typographic"}  ${lines.length} line${lines.length === 1 ? "" : "s"}`
);
