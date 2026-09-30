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
