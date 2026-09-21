// One-off: shrink the heavy bitmaps in src/assets to WebP and repoint imports.
//
// Several "SVGs" exported from Figma are really multi-megabyte bitmaps wrapped
// in an <image> tag, so those get rasterised too. Small icon SVGs are left
// alone. Run with `node scripts/compress-assets.mjs [--dry]`.

import { readdir, readFile, stat, writeFile, unlink } from "node:fs/promises";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "src", "assets");
const SRC = join(ROOT, "src");

const DRY = process.argv.includes("--dry");
const MIN_BYTES = 150 * 1024; // leave anything already small alone
const MAX_EDGE = 2000; // nothing on the site is displayed larger than this
const QUALITY = 82;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)}KB`;

async function main() {
  const files = await walk(ASSETS);
  const converted = [];
  let before = 0;
  let after = 0;

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const { size } = await stat(file);
    if (![".png", ".jpg", ".jpeg", ".svg"].includes(ext)) continue;
    if (size < MIN_BYTES) continue;
    // only rasterise SVGs that are really embedded bitmaps
    if (ext === ".svg") {
      const text = await readFile(file, "utf8");
      if (!text.includes("<image")) continue;
    }

    const target = file.replace(/\.(png|jpe?g|svg)$/i, ".webp");

    // For bitmap-in-SVG files, pull the embedded image out rather than asking
    // the SVG renderer to parse megabytes of base64.
    let input = file;
    if (ext === ".svg") {
      const text = await readFile(file, "utf8");
      const embedded = [...text.matchAll(/data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)/g)]
        .map((match) => match[2])
        .sort((a, b) => b.length - a.length)[0];
      if (!embedded) continue;
      input = Buffer.from(embedded, "base64");
    }

    const image = sharp(input, { density: 200 });
    const meta = await image.metadata();
    const resized =
      Math.max(meta.width || 0, meta.height || 0) > MAX_EDGE
        ? image.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside" })
        : image;

    const buffer = await resized.webp({ quality: QUALITY }).toBuffer();
    before += size;
    after += buffer.length;
    converted.push({ file, target, size, newSize: buffer.length });

    console.log(
      `${relative(ROOT, file)}  ${kb(size)} -> ${kb(buffer.length)}  (${Math.round(
        (1 - buffer.length / size) * 100
      )}% smaller)`
    );

    if (!DRY) {
      await writeFile(target, buffer);
      if (target !== file) await unlink(file);
    }
  }

  if (!DRY && converted.length) {
    // repoint every import that referenced a converted file
    const sources = (await walk(SRC)).filter((file) => /\.(jsx?|css)$/.test(file));
    for (const source of sources) {
      let text = await readFile(source, "utf8");
      let touched = false;
      for (const { file, target } of converted) {
        const from = file.split(/[\\/]/).pop();
        const to = target.split(/[\\/]/).pop();
        if (from !== to && text.includes(from)) {
          text = text.split(from).join(to);
          touched = true;
        }
      }
      if (touched) await writeFile(source, text);
    }
  }

  console.log(
    `\n${converted.length} files: ${kb(before)} -> ${kb(after)} (saved ${(
      (before - after) /
      1024 /
      1024
    ).toFixed(1)}MB)${DRY ? " [dry run]" : ""}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
