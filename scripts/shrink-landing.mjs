// Making the first screen lighter.
//
// The landing page was sending a megabyte, and most of it was the hero
// artwork. Two things were wrong with it. The cards were encoded for print
// rather than for a card drawn a few hundred pixels wide; and every visitor
// got the full-size version, including a phone that draws those cards at
// about 150 pixels because the whole stage is scaled down.
//
// So each one is re-encoded, and a small version is written beside it for the
// browser to choose when the card is being drawn small. Run with
// `node scripts/shrink-landing.mjs [--dry]`.
import { readFile, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DRY = process.argv.includes("--dry");

// What the first screen actually loads, and how wide it is really drawn.
//
// The hero cards sit in a 372px box, but the stage around them is scaled from
// 0.4 on a phone to 1 on a wide screen -- so the card is drawn at about 150px
// on a phone and 372px on a desktop, and wants two sizes rather than one.
const WORK = [
  { file: "landing/hero/card-ink-centaur.webp", wide: 744, small: 380, quality: 72 },
  { file: "landing/hero/card-winged-wolf.webp", wide: 744, small: 380, quality: 72 },
  { file: "landing/hero/card-hooded-gunman.webp", wide: 744, small: 380, quality: 72 },
  { file: "landing/hero/card-knife-dancer.webp", wide: 744, small: 380, quality: 72 },
  { file: "landing/hero/card-vtuber.webp", wide: 744, small: 380, quality: 72 },

  // The two character cards further down, drawn at most 578px wide.
  { file: "landing/pages/urokojin.webp", wide: 900, small: 640, quality: 74 },
  { file: "landing/pages/hope-breaker.webp", wide: 900, small: 640, quality: 74 },
];

const kb = (bytes) => Math.round(bytes / 1024);

let before = 0;
let after = 0;

for (const job of WORK) {
  const path = join(ROOT, "src/assets", job.file);
  const original = await readFile(path);
  const was = original.length;
  before += was;

  const big = await sharp(original)
    .resize({ width: job.wide, withoutEnlargement: true })
    .webp({ quality: job.quality, effort: 6 })
    .toBuffer();

  const small = await sharp(original)
    .resize({ width: job.small, withoutEnlargement: true })
    .webp({ quality: job.quality + 4, effort: 6 })
    .toBuffer();

  const smallPath = path.replace(/\.webp$/, "-small.webp");
  after += big.length + small.length;

  if (!DRY) {
    await writeFile(path, big);
    await writeFile(smallPath, small);
  }

  console.log(
    `  ${job.file.padEnd(40)} ${String(kb(was)).padStart(4)}KB -> ${String(kb(big.length)).padStart(3)}KB` +
      `  (+ ${kb(small.length)}KB for small screens)`
  );
}

// A 1024x148 gradient kept as a PNG, which is the one thing PNG is worst at.
const fade = join(ROOT, "src/assets/landing/hero/bottom-fade.png");
try {
  const original = await readFile(fade);
  before += original.length;
  const out = await sharp(original).webp({ quality: 80, effort: 6 }).toBuffer();
  after += out.length;
  if (!DRY) await writeFile(fade.replace(/\.png$/, ".webp"), out);
  console.log(
    `  ${"landing/hero/bottom-fade.png".padEnd(40)} ${String(kb(original.length)).padStart(4)}KB -> ${kb(out.length)}KB as webp`
  );
} catch {
  console.log("  bottom-fade.png: already dealt with");
}

console.log(`\n  first screen: ${kb(before)}KB -> ${kb(after)}KB${DRY ? "  (dry run, nothing written)" : ""}`);
