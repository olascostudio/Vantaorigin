// Pictures, made smaller on the way in and after the fact.
//
// Real bytes throughout: a picture is only smaller if it is smaller once
// encoded, and a claim about that cannot be made against a stub.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import sharp from "sharp";

const dataDir = ".pglite-images-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.STORAGE_DRIVER = "memory";
process.env.ADMIN_EMAILS = "keeper@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");
const { describe, limitFor, renameTo, shrink } = await import("../src/images.js");
const { storage } = await import("../src/adapters/storage.js");
const { shrinkEverything, progress } = await import("../src/shrink-existing.js");

let app;
let keeper;

// Something that behaves like a photograph: detailed enough that resizing
// and re-encoding really save something, smooth enough that it compresses
// the way a camera's output does. Flat colour would prove nothing, and pure
// noise is larger than any real picture of the same size.
const photograph = async (width, height, format = "jpeg") => {
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = (y * width + x) * 3;
      pixels[at] = 128 + 120 * Math.sin(x / 40) * Math.cos(y / 55);
      pixels[at + 1] = 128 + 110 * Math.sin((x + y) / 70);
      pixels[at + 2] = 128 + 100 * Math.cos(x / 25 + y / 90);
    }
  }
  const image = sharp(pixels, { raw: { width, height, channels: 3 } });
  return format === "png" ? image.png().toBuffer() : image.jpeg({ quality: 92 }).toBuffer();
};

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

before(async () => {
  await migrate();
  app = await buildApp();
  keeper = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "keeper@vantaorigin.test", username: "keeper", password: "supersecret1" },
    })
  );
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

test("a picture is capped at the size it will be drawn", async () => {
  const huge = await photograph(2400, 3000);
  const smaller = await shrink(huge, { limit: 1200 });

  assert.ok(smaller, "there was something to save");
  assert.equal(Math.max(smaller.width, smaller.height), 1200);
  assert.ok(smaller.now < smaller.was, `${smaller.now} < ${smaller.was}`);
  // New uploads become webp, which is smaller than what they arrived as.
  assert.equal(smaller.format, "webp");
  assert.equal(smaller.contentType, "image/webp");
});

test("a picture that is already sensible is left alone", async () => {
  const tidy = await sharp(await photograph(400, 400))
    .webp({ quality: 70 })
    .toBuffer();

  // Nothing to gain, so nothing is done -- rather than re-encoding it and
  // losing a little of it each time.
  assert.equal(await shrink(tidy, { limit: 1200 }), null);
});

test("each folder is capped at what that picture is used for", () => {
  assert.equal(limitFor("avatars"), 512);
  assert.equal(limitFor("covers"), 1200);
  assert.equal(limitFor("banners"), 1600);
  // Anything unrecognised gets the careful answer, not no answer.
  assert.equal(limitFor("something-else"), 1600);
});

test("a name follows its bytes", () => {
  assert.equal(renameTo("a/b/c.jpg", "webp"), "a/b/c.webp");
  assert.equal(renameTo("a/b/c.PNG", "jpeg"), "a/b/c.jpg");
});

test("uploading stores the smaller picture, not the one that was sent", async () => {
  const huge = await photograph(2400, 3000);

  const form = new FormData();
  form.append("file", new Blob([huge], { type: "image/jpeg" }), "photo.jpg");
  const encoded = new Response(form);
  const payload = Buffer.from(await encoded.arrayBuffer());

  const res = await app.inject({
    method: "POST",
    url: "/uploads?folder=covers",
    headers: { cookie: keeper, "content-type": encoded.headers.get("content-type") },
    payload,
  });

  assert.equal(res.statusCode, 201);
  const { url, key } = res.json();

  // The name follows the bytes: a jpeg went up, webp is what is kept.
  assert.match(key, /.webp$/);
  assert.match(url, /.webp$/);

  const stored = await storage.read(key);
  assert.ok(stored.length < huge.length / 4, `${stored.length} is far under ${huge.length}`);

  const what = await describe(stored);
  assert.equal(what.format, "webp");
  // Capped at what a cover is ever drawn at, rather than what the camera made.
  assert.equal(Math.max(what.width, what.height), 1200);
});

test("the pass over stored pictures makes them smaller and keeps their address", async () => {
  const key = "someone/covers/already-here.jpg";
  const before = await photograph(2400, 3000);
  await storage.put(key, before, "image/jpeg");

  const answer = await shrinkEverything(null);

  assert.equal(answer.shrunk, 1);
  assert.ok(answer.saved > 0, "bytes were saved");

  // The address is exactly what it was: every link already shared still works.
  const after = await storage.read(key);
  assert.ok(after.length < before.length, `${after.length} < ${before.length}`);

  // A .jpg is still a jpeg, so the name still tells the truth.
  const what = await describe(after);
  assert.equal(what.format, "jpeg");
  assert.equal(Math.max(what.width, what.height), 1200);
});

test("running the pass again leaves the pictures alone", async () => {
  const key = "someone/covers/already-here.jpg";
  const before = await storage.read(key);

  const answer = await shrinkEverything(null);

  assert.equal(answer.shrunk, 0, "nothing left worth doing");
  const after = await storage.read(key);
  assert.equal(after.length, before.length, "and the picture is byte for byte what it was");
});

test("something that is not a picture is never touched", async () => {
  await storage.put("someone/assets/notes.txt", Buffer.from("not a picture"), "text/plain");
  await shrinkEverything(null);
  assert.equal((await storage.read("someone/assets/notes.txt")).toString(), "not a picture");
});

test("the pass is closed to everybody but an admin, and says how it is going", async () => {
  const passerby = cookieFrom(
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "nosy@vantaorigin.test", username: "nosy", password: "supersecret1" },
    })
  );

  const refused = await app.inject({
    method: "POST",
    url: "/admin/images/shrink",
    headers: { cookie: passerby },
  });
  assert.equal(refused.statusCode, 404);

  const started = await app.inject({
    method: "POST",
    url: "/admin/images/shrink",
    headers: { cookie: keeper },
  });
  assert.equal(started.statusCode, 202);

  const asked = await app.inject({
    method: "GET",
    url: "/admin/images/shrink",
    headers: { cookie: keeper },
  });
  assert.equal(asked.statusCode, 200);
  assert.equal(typeof asked.json().looked, "number");
  assert.equal(typeof progress().saved, "number");
});

test("a stored picture says it may be kept for a year", async () => {
  const huge = await photograph(2000, 2000);

  const form = new FormData();
  form.append("file", new Blob([huge], { type: "image/jpeg" }), "photo.jpg");
  const encoded = new Response(form);

  const res = await app.inject({
    method: "POST",
    url: "/uploads?folder=assets",
    headers: { cookie: keeper, "content-type": encoded.headers.get("content-type") },
    payload: Buffer.from(await encoded.arrayBuffer()),
  });
  assert.equal(res.statusCode, 201);

  // Without this a browser has no instruction and asks again every visit.
  const served = await app.inject({ method: "GET", url: `/files/${res.json().key}` });
  assert.equal(served.statusCode, 200);
  assert.equal(served.headers["cache-control"], "public, max-age=31536000, immutable");
});

test("the pass gives a cache header even to the pictures it leaves alone", async () => {
  // Small enough to be passed over, and stored the old way with no header.
  const small = await sharp(await photograph(200, 200)).webp({ quality: 60 }).toBuffer();
  await storage.put("someone/covers/tiny.webp", small, "image/webp", undefined);
  // Put it back the way the old code would have: no instruction at all.
  const raw = await storage.read("someone/covers/tiny.webp");
  await storage.put("someone/covers/tiny.webp", raw, "image/webp", null);

  const answer = await shrinkEverything(null);
  assert.ok(answer.cached > 0, "headers were set on pictures left as they were");

  const served = await app.inject({ method: "GET", url: "/files/someone/covers/tiny.webp" });
  assert.equal(served.headers["cache-control"], "public, max-age=31536000, immutable");
});
