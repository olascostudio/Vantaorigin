// Making pictures smaller on the way in.
//
// Until now a file was stored exactly as it arrived: an eight-megabyte phone
// photograph was kept, and sent, at eight megabytes, for a card drawn at a
// few hundred pixels wide. Every visitor paid for that, and on a phone they
// paid twice -- once in waiting and once in data.
//
// So every picture is capped to the largest size it is ever drawn at and
// re-encoded. The original is never what is stored, and never what is sent.
import sharp from "sharp";

// The widest a picture is ever shown, doubled for sharp screens. Anything
// larger is detail nobody will ever see.
export const LIMITS = {
  avatars: 512,
  banners: 1600,
  covers: 1200,
  assets: 1600,
  newsletter: 1200,
  // A hero runs the full width of an article, and inline pictures sit
  // inside the column, so one limit covers both.
  blog: 1600,
};

export const limitFor = (folder) => LIMITS[folder] ?? 1600;

const QUALITY = 82;

// An animated GIF has to be read and written as every frame it has, or it
// arrives as a still.
const isAnimated = (metadata) => (metadata.pages ?? 1) > 1;

// What the bytes really are, whatever the name says.
export async function describe(buffer) {
  const { format, width, height, pages, size } = await sharp(buffer).metadata();
  return { format, width, height, pages: pages ?? 1, size: size ?? buffer.length };
}

// Re-encodes a picture at or under `limit` pixels on its longest side.
//
// `keepFormat` is for pictures already stored under a name that says what
// they are: changing a .jpg into webp bytes would make the name a lie. New
// uploads have no name yet, so they become webp, which is smaller than both.
//
// Returns null when the work is not worth doing -- when the result would be
// no smaller than what came in, which is what happens to a picture that was
// already sensible.
export async function shrink(buffer, { limit = 1600, keepFormat = false } = {}) {
  const before = await describe(buffer);
  const animated = isAnimated(before);

  const pipeline = sharp(buffer, { animated })
    // Never enlarge: a small picture is left at the size it was drawn.
    .resize({ width: limit, height: limit, fit: "inside", withoutEnlargement: true })
    // Orientation lives in EXIF, which is dropped on re-encode; without this
    // a photograph taken sideways would be stored sideways.
    .rotate();

  const format = keepFormat && before.format !== "gif" ? before.format : "webp";
  const encoded =
    format === "jpeg" || format === "jpg"
      ? pipeline.jpeg({ quality: QUALITY, mozjpeg: true })
      : format === "png"
        ? pipeline.png({ compressionLevel: 9, palette: true })
        : pipeline.webp({ quality: QUALITY, effort: 4 });

  const output = await encoded.toBuffer();
  if (output.length >= buffer.length) return null;

  const after = await describe(output);
  return {
    buffer: output,
    format: after.format,
    contentType: `image/${after.format === "jpg" ? "jpeg" : after.format}`,
    width: after.width,
    height: after.height,
    was: buffer.length,
    now: output.length,
  };
}

// "…/cover.jpg" becomes "…/cover.webp" when the bytes became webp.
export const renameTo = (key, format) =>
  key.replace(/\.[a-z0-9]+$/i, "") + "." + (format === "jpeg" ? "jpg" : format);

// The colour a picture is really about.
//
// Used for a character card's edge, so the card is trimmed in its own
// artwork's colour rather than in one house colour for everybody.
//
// The most saturated pixels decide it, weighted so that neither a black
// background nor a white page can win, and the result is pushed into a
// lightness that still reads as a line on a dark screen.
export async function accentOf(buffer) {
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let best = null;
  let bestScore = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;
    const chroma = max - min;
    if (chroma < 0.08) continue;

    const saturation = chroma / (1 - Math.abs(2 * lightness - 1) || 1);
    // Mid lightness is what a line wants: near-black and near-white are
    // common in artwork and useless as an accent.
    const usable = 1 - Math.abs(lightness - 0.52) * 1.7;
    const score = saturation * Math.max(0, usable) * (0.45 + chroma);

    if (score > bestScore) {
      bestScore = score;
      best = { r, g, b, lightness };
    }
  }

  // Nothing colourful in it: the house pink, rather than a muddy grey.
  if (!best) return "#fc187b";

  // Lift or settle it into a band that holds against the dark card.
  const target = 0.58;
  const shift = target / (best.lightness || target);
  const channel = (v) => {
    const scaled = Math.min(1, Math.max(0, v * shift));
    return Math.round(scaled * 255)
      .toString(16)
      .padStart(2, "0");
  };

  return `#${channel(best.r)}${channel(best.g)}${channel(best.b)}`;
}
