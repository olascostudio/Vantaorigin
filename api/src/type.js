// Words, as shapes.
//
// The share pictures are drawn on a server, and a server has no reason to
// have fonts installed. Asking the renderer to set text in "Inter, sans-serif"
// got a row of empty boxes: it found nothing it could use. Nothing threw,
// every test passed, and it was obvious the first time somebody pasted a link
// into a chat.
//
// Pointing fontconfig at a bundled font would be the usual answer, and it
// might even work, but I cannot test it from here: this laptop resolves fonts
// its own way and renders the same either way, so the only place to find out
// would be production, again.
//
// So the words are turned into outlines before they ever reach the renderer.
// The font is read here, the glyphs come out as paths, and what gets drawn is
// geometry. No lookup happens at draw time, which means it cannot depend on
// what the machine underneath happens to have.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as fontkit from "fontkit";

const FILE = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/fonts/Inter.ttf");

// Inter is a variable font, so a weight is chosen rather than a file picked.
const faces = new Map();
const face = (weight) => {
  if (!faces.has(weight)) {
    faces.set(weight, fontkit.openSync(FILE).getVariation({ wght: weight }));
  }
  return faces.get(weight);
};

// What a line of this text would measure, so wrapping is exact rather than a
// guess at the average width of a letter.
export const widthOf = (text, { size, weight = 400, tracking = 0 }) => {
  const font = face(weight);
  const run = font.layout(String(text));
  const scale = size / font.unitsPerEm;
  return run.advanceWidth * scale + Math.max(0, run.glyphs.length - 1) * tracking;
};

// The line as SVG paths, sitting on the baseline at (x, y).
export const inkOf = (text, { x, y, size, weight = 400, fill = "#ffffff", tracking = 0 }) => {
  const font = face(weight);
  const run = font.layout(String(text));
  const scale = size / font.unitsPerEm;

  const parts = [];
  let pen = 0;

  run.glyphs.forEach((glyph, index) => {
    const d = glyph.path.toSVG();
    if (d) {
      // Font coordinates run upwards and SVG's run downwards, so the glyph is
      // flipped as it is placed.
      parts.push(
        `<path d="${d}" transform="translate(${(x + pen).toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" fill="${fill}"/>`
      );
    }
    pen += (run.positions[index]?.xAdvance ?? glyph.advanceWidth) * scale + tracking;
  });

  return parts.join("");
};

// Greedy wrapping on real measurements, stepping the size down until it fits
// in the number of lines allowed.
export const fitLines = (text, { room, sizes, weight = 800, maxLines = 3 }) => {
  const words = String(text).trim().split(/\s+/).filter(Boolean);

  for (const size of sizes) {
    const lines = [];
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (widthOf(next, { size, weight }) > room && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);

    // A single word longer than the whole line can never fit; stepping down
    // forever would not help, so the smallest size takes it and it is cut.
    if (lines.length <= maxLines) return { size, lines };
  }

  const size = sizes[sizes.length - 1];
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (widthOf(next, { size, weight }) > room && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  return { size, lines };
};
