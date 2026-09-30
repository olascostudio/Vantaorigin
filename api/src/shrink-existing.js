// Shrinking the pictures that were stored before anything shrank them.
//
// Everything uploaded up to now was kept exactly as it arrived -- character
// covers of a megabyte for a card drawn at a few hundred pixels. This walks
// the bucket once and re-encodes each picture at the size it is actually
// drawn at.
//
// Two rules make it safe to run, and safe to run again:
//
//   The key never changes, so every address already saved, shared or indexed
//   keeps working. A picture stored as .jpg stays .jpg -- it is re-encoded in
//   its own format rather than turned into webp, because the name would
//   otherwise say one thing and the bytes another.
//
//   A picture is only written back when the saving is worth having. Every
//   re-encode costs a little quality, and re-encoding a picture that is
//   already the right size would shave a few bytes off it and a little more
//   of its detail -- every time the pass was run. So a second run finds
//   nothing to do, which is what makes it safe to run whenever.
import { storage } from "./adapters/storage.js";
import { limitFor, shrink } from "./images.js";

const PICTURES = /\.(jpe?g|png|webp|gif)$/i;

// Below this there is nothing worth saving, and re-encoding would risk
// making it worse.
const WORTH_IT = 120 * 1024;

// And a saving is only worth the quality it costs if it is a real one: a
// tenth of the file, and at least this many bytes.
const ENOUGH_SAVED = 32 * 1024;
const ENOUGH_SMALLER = 0.9;

const worthWriting = (smaller) =>
  smaller.now <= smaller.was * ENOUGH_SMALLER && smaller.was - smaller.now >= ENOUGH_SAVED;

const state = {
  running: false,
  startedAt: null,
  finishedAt: null,
  looked: 0,
  shrunk: 0,
  skipped: 0,
  failed: 0,
  saved: 0,
  last: null,
};

export const progress = () => ({ ...state });

// "<user>/covers/<uuid>.jpg" -> "covers"
const folderOf = (key) => key.split("/").at(-2) || "assets";

export async function shrinkEverything(app) {
  if (state.running) return { alreadyRunning: true };

  Object.assign(state, {
    running: true,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    looked: 0,
    shrunk: 0,
    skipped: 0,
    failed: 0,
    saved: 0,
    last: null,
  });

  try {
    for await (const object of storage.list()) {
      if (!PICTURES.test(object.key)) continue;
      state.looked += 1;

      if (object.size && object.size < WORTH_IT) {
        state.skipped += 1;
        continue;
      }

      try {
        const buffer = await storage.read(object.key);
        if (!buffer) {
          state.skipped += 1;
          continue;
        }

        const smaller = await shrink(buffer, {
          limit: limitFor(folderOf(object.key)),
          // The name already says what this is, so the bytes must agree.
          keepFormat: true,
        });

        if (!smaller || !worthWriting(smaller)) {
          state.skipped += 1;
          continue;
        }

        await storage.put(object.key, smaller.buffer, smaller.contentType);
        state.shrunk += 1;
        state.saved += smaller.was - smaller.now;
        state.last = object.key;
      } catch (error) {
        state.failed += 1;
        app?.log?.error({ err: error, key: object.key }, "could not shrink a stored picture");
      }
    }

    app?.log?.info(
      { shrunk: state.shrunk, skipped: state.skipped, saved: state.saved },
      "finished shrinking stored pictures"
    );
    return progress();
  } finally {
    state.running = false;
    state.finishedAt = new Date().toISOString();
  }
}
