// The picture a link preview shows, drawn when a post goes out.
//
// Nothing here reaches the network: these posts have no hero, which is the
// typographic case, and the one test that needs artwork makes its own.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import sharp from "sharp";

const dataDir = ".pglite-blog-share-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.STORAGE_DRIVER = "memory";
process.env.ADMIN_EMAILS = "boss@vantaorigin.test";

const { buildApp } = await import("../src/app.js");
const { migrate } = await import("../src/db/migrate.js");
const { endConnection } = await import("../src/db/client.js");
const { shareImage } = await import("../src/blog-share.js");

let app;
let boss;

const cookieFrom = (res) => {
  const header = res.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  return first ? first.split(";")[0] : "";
};

before(async () => {
  await migrate();
  app = await buildApp();

  const made = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: { email: "boss@vantaorigin.test", username: "ola", password: "supersecret1" },
  });
  boss = cookieFrom(made);
  const code = made.json().devCode;
  if (code) {
    await app.inject({
      method: "POST",
      url: "/auth/verify-email",
      headers: { cookie: boss },
      payload: { code },
    });
  }
});

after(async () => {
  await app?.close();
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

const write = (payload) =>
  app.inject({ method: "POST", url: "/admin/blog", headers: { cookie: boss }, payload });

const change = (id, payload) =>
  app.inject({ method: "PATCH", url: `/admin/blog/${id}`, headers: { cookie: boss }, payload });

test("it is the right size and shape for a link preview", async () => {
  const body = await shareImage({ title: "A short title", label: "Story" });
  const meta = await sharp(body).metadata();

  // What every scraper expects, and a format all of them read.
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  assert.equal(meta.format, "jpeg");
});

test("a long title is made to fit rather than running off the edge", async () => {
  const body = await shareImage({
    title:
      "How to Structure Character Cards for Your Webcomic or Dark Fantasy Novel Without Losing Your Mind Entirely",
    label: "Worldbuilding Guides",
  });
  const meta = await sharp(body).metadata();
  assert.equal(meta.width, 1200);
  assert.ok(body.length > 2000, "something was actually drawn");
});

test("a post gets one when it is written, and the preview points at it", async () => {
  const made = await write({ title: "Drawn on publishing", status: "published" });
  assert.equal(made.statusCode, 201);

  const post = made.json().post;
  assert.ok(post.seo.ogImageUrl, "a link preview should have a picture");
  assert.match(post.seo.ogImageUrl, /\/share\//);

  // And a reader's copy says the same.
  const read = await app.inject({ method: "GET", url: `/blog/${post.slug}` });
  assert.equal(read.json().post.seo.ogImageUrl, post.seo.ogImageUrl);
});

test("a picture somebody chose by hand is never replaced by a drawn one", async () => {
  const made = await write({
    title: "My own card",
    ogImageUrl: "https://example.com/mine.jpg",
    status: "published",
  });

  assert.equal(made.json().post.seo.ogImageUrl, "https://example.com/mine.jpg");
});

test("changing the title gives the picture a new address", async () => {
  const made = await write({ title: "First name for it", status: "published" });
  const id = made.json().post.id;
  const before = made.json().post.seo.ogImageUrl;

  const retitled = await change(id, { title: "A different name entirely" });
  const after = retitled.json().post.seo.ogImageUrl;

  // Scrapers cache these hard and by URL. At a fixed name the old card would
  // keep showing long after the post had been renamed.
  assert.notEqual(after, before);
  assert.match(after, /\/share\//);
});

test("editing only the writing does not draw it again", async () => {
  const made = await write({ title: "Left alone", status: "published" });
  const id = made.json().post.id;
  const before = made.json().post.seo.ogImageUrl;

  const edited = await change(id, { body: "<p>Quite different words in the article.</p>" });
  assert.equal(edited.json().post.seo.ogImageUrl, before);
});

test("a hero that cannot be fetched leaves the post alone", async () => {
  // The picture is worth having and never worth failing a publish over.
  const made = await write({
    title: "Hero is not there",
    heroUrl: "https://localhost:1/not-a-real-host.webp",
    status: "published",
  });

  assert.equal(made.statusCode, 201);
  const post = made.json().post;
  assert.equal(post.title, "Hero is not there");
  // No drawn picture, so the preview falls back to the hero it was given.
  assert.equal(post.seo.ogImageUrl, "https://localhost:1/not-a-real-host.webp");
});

test("a post written before any of this gets one the next time it is saved", async () => {
  // Exactly the state the live posts were in: published, no card, and
  // nothing about them about to change on its own.
  const made = await write({ title: "Written before the cards existed", status: "published" });
  const id = made.json().post.id;

  // Take the card away, as though it had never been drawn.
  const { db } = await import("../src/db/client.js");
  const { blogPosts } = await import("../src/db/schema.js");
  const { eq } = await import("drizzle-orm");
  await db.update(blogPosts).set({ shareImageUrl: null }).where(eq(blogPosts.id, id));

  const before = await app.inject({ method: "GET", url: "/blog/written-before-the-cards-existed" });
  assert.ok(!before.json().post.seo.ogImageUrl, "no card to start with");

  // A save that changes nothing at all, which is what somebody would do.
  const saved = await change(id, {});
  assert.match(saved.json().post.seo.ogImageUrl, /\/share\//);
});

// How much white the words put on the page, in the strip the title sits in,
// and the pixels themselves so two cards can be compared.
const inkIn = async (body) => {
  const { data, info } = await sharp(body)
    .extract({ left: 60, top: 400, width: 900, height: 180 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let lit = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] > 170 && data[i + 1] > 170 && data[i + 2] > 170) lit += 1;
  }
  return { lit, of: info.width * info.height, pixels: data };
};

test("the words are drawn, and they are these words", async () => {
  // The first version of this shipped as a row of empty boxes, because the
  // machine it ran on had no fonts, and nothing in the code complained. A
  // test that asks whether anything in the strip is bright passes on that
  // card too: an empty box is a white outline. So the question has to be
  // whether the ink is the shape of these particular words.
  const plain = await inkIn(await shareImage({ title: "Readable anywhere", label: "Craft" }));

  // Measured at 7.7 per cent for this title. Nothing drawn at all is zero,
  // and a strip gone solid white is not type either.
  const covered = (plain.lit / plain.of) * 100;
  assert.ok(covered > 3 && covered < 40, `the title strip is ${covered.toFixed(1)} per cent ink`);

  // Two titles of exactly the same length, including where the space falls,
  // in letters of very different weight. Set properly, these cover the strip
  // quite differently: 13.8 per cent against 7.7. Drawn as one identical box
  // per character they would come out the same, which is the whole failure.
  const heavy = await inkIn(await shareImage({ title: "WWWWWWWW MMMMMMMM", label: "Craft" }));
  assert.ok(
    heavy.lit > plain.lit * 1.3,
    `W and M should lay down far more ink than lowercase: ${heavy.lit} against ${plain.lit}`
  );

  // And not simply more ink in the same places.
  let differing = 0;
  for (let i = 0; i < plain.pixels.length; i += 1) {
    if (plain.pixels[i] !== heavy.pixels[i]) differing += 1;
  }
  assert.ok(
    differing > plain.pixels.length * 0.05,
    `two unlike titles drew nearly the same picture, ${differing} bytes apart`
  );

  // They are shapes rather than text, which is what makes any of this
  // independent of whatever fonts the machine underneath happens to have.
  const { inkOf } = await import("../src/type.js");
  const drawn = inkOf("Hello", { x: 0, y: 0, size: 40 });
  assert.match(drawn, /^<path d="/);
  assert.ok(!drawn.includes("<text"), "a text element would need a font at draw time");
});

test("a title too long for three lines is still set, not dropped", async () => {
  const { fitLines } = await import("../src/type.js");
  const { size, lines } = fitLines(
    "An extraordinarily long title about worldbuilding and character design that simply refuses to stop going on and on",
    { room: 1056, sizes: [62, 56, 50, 44, 40, 36], weight: 800, maxLines: 3 }
  );

  assert.ok(lines.length > 0 && lines.length <= 3, `got ${lines.length} lines`);
  assert.ok(size >= 36);
  assert.ok(lines.join(" ").length > 20, "something of the title survived");
});

test("a card drawn by an older version is replaced, not kept", async () => {
  const made = await write({ title: "Drawn the old way", status: "published" });
  const id = made.json().post.id;
  const proper = made.json().post.seo.ogImageUrl;

  // Exactly the state the live posts were in: a card on file, drawn by a
  // version that got it wrong, with inputs that are never going to change.
  const { db } = await import("../src/db/client.js");
  const { blogPosts } = await import("../src/db/schema.js");
  const { eq } = await import("drizzle-orm");
  await db
    .update(blogPosts)
    .set({ shareImageUrl: "https://example.com/old/drawn-by-version-one.jpg" })
    .where(eq(blogPosts.id, id));

  // A save that changes nothing, which is all somebody should have to do.
  const saved = await change(id, {});
  const now = saved.json().post.seo.ogImageUrl;

  assert.notEqual(now, "https://example.com/old/drawn-by-version-one.jpg");
  assert.match(now, /\/share\//);
  // Same inputs, so it lands back at the address it should always have had.
  assert.equal(now, proper);
});

test("a card that is already right is left alone", async () => {
  const made = await write({ title: "Already correct", status: "published" });
  const id = made.json().post.id;
  const before = made.json().post.seo.ogImageUrl;

  const saved = await change(id, { body: "<p>Only the writing moved.</p>" });
  assert.equal(saved.json().post.seo.ogImageUrl, before);
});

// ---- what must never be stored --------------------------------------------
//
// A card carries the creator's title and the site's name. One that carries
// neither is worse than no card at all, and the first run of these shipped
// exactly that: a row of empty boxes, stored and served, found by somebody
// pasting a link into a chat. Outlines fixed the case where the machine had
// no fonts. These cover the case where the font has no letter, which no
// amount of looking at the finished picture would catch, because a box inks
// its area much as a letter does.

test("a title the font cannot set is refused, not drawn as boxes", async () => {
  await assert.rejects(
    () => shareImage({ title: "雷の審判者", label: "Story" }),
    /cannot set this title/
  );
  await assert.rejects(() => shareImage({ title: "🔥💀⚡🌙✨", label: "Story" }), /cannot set/);
});

test("a stray emoji does not cost you the card", async () => {
  // One box among a line of letters is nobody's problem, and refusing here
  // would take away a good card over a decoration.
  const card = await shareImage({ title: "Judge 🔥 of the Vantaverse", label: "Story" });
  assert.ok(card.length > 2000, "should still be drawn");
});

test("accents are letters, not missing glyphs", async () => {
  const card = await shareImage({ title: "Café Noir, a Résumé of Ruin", label: "Story" });
  assert.ok(card.length > 2000);
});

test("a post whose title cannot be set still publishes, with its hero", async () => {
  // The picture is worth having and never worth failing a publish over, so a
  // refusal has to leave a working post behind it.
  const made = await write({
    title: "雷の審判者",
    heroUrl: "https://example.com/the-artwork.jpg",
    status: "published",
  });

  assert.equal(made.statusCode, 201);
  const post = made.json().post;
  // No drawn card, so the preview falls back to the artwork itself.
  assert.equal(post.seo.ogImageUrl, "https://example.com/the-artwork.jpg");
});

test("the words cover their own box, by a wide margin", async () => {
  // The guard refuses anything under 5 per cent. Measured here so a renderer
  // that quietly starts drawing less has somewhere to fail.
  const { titleBox } = await import("../src/blog-share.js");
  const { fitLines } = await import("../src/type.js");

  for (const title of ["Hi", "Urokojin, The Thunder Judge", "iiiii lll"]) {
    const card = await shareImage({ title, label: "Craft" });
    const { size, lines } = fitLines(title, {
      room: 1056,
      sizes: [62, 56, 50, 44, 40, 36],
      weight: 800,
      maxLines: 3,
    });
    const lineHeight = Math.round(size * 1.14);
    const first = 630 - 72 - lines.length * lineHeight + size;

    const { data, info } = await sharp(card)
      .extract(titleBox({ lines, size, first, lineHeight }))
      .raw()
      .toBuffer({ resolveWithObject: true });

    let lit = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i] > 170 && data[i + 1] > 170 && data[i + 2] > 170) lit += 1;
    }
    const covered = lit / (info.width * info.height);
    assert.ok(covered > 0.2, `"${title}" inked only ${(covered * 100).toFixed(1)}% of its box`);
  }
});

test("the font is asked, rather than the picture guessed at", async () => {
  const { unmappable } = await import("../src/type.js");

  assert.equal(unmappable("Urokojin", { weight: 800 }).missing, 0);
  assert.equal(unmappable("Café Noir", { weight: 800 }).missing, 0);
  // Glyph 0 is .notdef, and in Inter .notdef is a drawn box.
  assert.equal(unmappable("雷の審判者", { weight: 800 }).fraction, 1);
});

// ---- the card a post is stuck to ------------------------------------------
//
// The editor loaded the resolved preview picture into the field that holds a
// hand-picked one. Opening a post and saving it therefore wrote the drawn
// card into the column meaning "somebody chose this", and the post was pinned
// to whatever card existed at that moment. Three live posts were pinned to a
// card drawn before the lettering worked, so every redraw afterwards was made
// correctly, stored correctly, and ignored.

test("a drawn card in the hand-picked column is not treated as a choice", async () => {
  const { chosenImage } = await import("../src/blog.js");
  const id = "cffb3ced-3d56-4a60-bb69-3c751d28708b";

  // What a save used to write: this post's own drawn card.
  assert.equal(
    chosenImage({ id, ogImageUrl: `https://cdn.example.com/u1/share/${id}-85db2e136a.jpg` }),
    null
  );

  // A picture somebody really did choose is still a choice.
  assert.equal(
    chosenImage({ id, ogImageUrl: "https://example.com/my-own-banner.jpg" }),
    "https://example.com/my-own-banner.jpg"
  );

  // Including one drawn for a different post, which somebody could have
  // pasted in deliberately.
  const other = "https://cdn.example.com/u1/share/0000-abc1234567.jpg";
  assert.equal(chosenImage({ id, ogImageUrl: other }), other);

  assert.equal(chosenImage({ id, ogImageUrl: null }), null);
});

test("a post pinned to its own old card comes unstuck", async () => {
  const made = await write({ title: "Pinned to a bad card", status: "published" });
  const id = made.json().post.id;
  const drawn = made.json().post.seo.ogImageUrl;
  assert.match(drawn, /\/share\//);

  // Exactly what the editor used to send back: the drawn card, written into
  // the column that means somebody picked it.
  const { db } = await import("../src/db/client.js");
  const { blogPosts } = await import("../src/db/schema.js");
  const { eq } = await import("drizzle-orm");
  await db.update(blogPosts).set({ ogImageUrl: drawn }).where(eq(blogPosts.id, id));

  // Retitling draws a new card, which the pin used to hide for good.
  const retitled = await change(id, { title: "A different name for it" });
  const after = retitled.json().post.seo.ogImageUrl;

  assert.notEqual(after, drawn, "the post should not still be showing the old card");
  assert.match(after, /\/share\//);
  // And nothing is reported as hand-picked, so the editor shows an empty field.
  assert.equal(retitled.json().post.seo.ogImageChosen, null);
});

test("a picture somebody really chose still wins, and is reported as chosen", async () => {
  const made = await write({
    title: "My own banner please",
    ogImageUrl: "https://example.com/chosen.jpg",
    status: "published",
  });

  const post = made.json().post;
  assert.equal(post.seo.ogImageUrl, "https://example.com/chosen.jpg");
  assert.equal(post.seo.ogImageChosen, "https://example.com/chosen.jpg");
});
