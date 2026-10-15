// Whether the words in an email can be seen.
//
// The shell was dark and was made light. The letters themselves are built in
// issue.js, which kept its own copy of the palette, so for a moment the body
// copy was still being written in #e8ecf5: near white, on white paper. The
// email rendered, every test passed, and the text was simply not there.
//
// That is the same shape as the share cards drawn as empty boxes, and it has
// the same answer: measure the thing, rather than trusting that two files
// agree about a colour.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "pglite://.pglite-email-readable";
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";
process.env.APP_ORIGIN = "https://www.vantaorigin.com";

const { verificationEmail, resetEmail, welcomeEmail } = await import("../src/emails/templates.js");
const { renderIssue } = await import("../src/emails/issue.js");

// The sheet every email is written on.
const PAPER = "#ffffff";

const luminance = (hex) => {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

// Every colour the email asks for text to be drawn in, with the background
// of the cell it sits in where one was set.
const textColours = (html) =>
  [...html.matchAll(/color:(#[0-9a-fA-F]{6})/g)].map((m) => m[1].toLowerCase());

const ISSUE = {
  subject: "The characters you built this week",
  preheader: "Five new worlds, and a word on lore bibles.",
  blocks: [
    { type: "heading", text: "What creators shipped this week" },
    { type: "text", text: "Six characters went up this week, one with a **full faction tree**." },
    { type: "button", text: "Read the issue", href: "https://www.vantaorigin.com/blog" },
    { type: "divider" },
    { type: "rich", html: "<h2>From the blog</h2><p>How we lay a character sheet out.</p><ul><li>Name and face</li></ul>" },
  ],
};

const EVERY_EMAIL = () => ({
  verification: verificationEmail({ user: { firstName: "Ola" }, code: "4821", minutes: 15 }).html,
  reset: resetEmail({ user: { firstName: "Ola" }, code: "9134", minutes: 15 }).html,
  welcome: welcomeEmail({ user: { firstName: "Ola" }, unsubscribeUrl: "https://x.test/u" }).html,
  issue: renderIssue(ISSUE, { unsubscribeUrl: "https://x.test/u" }).html,
});

test("nothing is written in a colour you cannot read on the paper", () => {
  for (const [name, html] of Object.entries(EVERY_EMAIL())) {
    for (const colour of textColours(html)) {
      // White is legitimate: it is the text on a pink button, and that is
      // checked on its own below.
      if (colour === "#ffffff") continue;

      const ratio = contrast(colour, PAPER);
      assert.ok(
        ratio >= 4.5,
        `${name}: ${colour} on white is ${ratio.toFixed(2)} to 1, and body text needs 4.5`
      );
    }
  }
});

test("white text only ever sits on something dark enough to hold it", () => {
  for (const [name, html] of Object.entries(EVERY_EMAIL())) {
    // Each cell that sets a background and then writes in white.
    const onWhite = [...html.matchAll(/background:(#[0-9a-fA-F]{6})[^"]*"[^>]*>\s*<a[^>]*color:#ffffff/gi)];
    for (const [, background] of onWhite) {
      const ratio = contrast("#ffffff", background);
      assert.ok(ratio >= 3, `${name}: white on ${background} is only ${ratio.toFixed(2)} to 1`);
    }
  }
});

test("a letter to the list wears the Daily banner, and nothing else does", () => {
  const { issue, verification, reset, welcome } = EVERY_EMAIL();

  assert.match(issue, /\/emails\/daily\.jpg/);
  assert.match(issue, /alt="VantaOrigin Daily"/);

  // A verification code is not an issue of the newsletter. It opens with the
  // plain lockup, which is also the logo that went missing from the banner.
  for (const [name, html] of Object.entries({ verification, reset, welcome })) {
    assert.match(html, /\/emails\/masthead\.png/, `${name} should wear the plain masthead`);
    assert.ok(!html.includes("daily.jpg"), `${name} should not say DAILY`);
  }
});

test("the header picture is named, for a reader who blocks pictures", () => {
  for (const [name, html] of Object.entries(EVERY_EMAIL())) {
    const alt = html.match(/<img[^>]+\/emails\/(?:daily\.jpg|masthead\.png)[^>]*alt="([^"]*)"/);
    assert.ok(alt, `${name}: could not find the header picture`);
    assert.ok(alt[1].includes("VantaOrigin"), `${name}: the header says "${alt[1]}"`);
  }
});

test("the paper is light, and the email says so", () => {
  for (const [name, html] of Object.entries(EVERY_EMAIL())) {
    assert.match(html, /<body style="[^"]*background:#f4f5f7/, `${name}: the page behind the sheet`);
    // A client that inverts a light email puts the sheet behind the ink.
    assert.match(html, /name="color-scheme" content="light"/, `${name}: should ask not to be inverted`);
  }
});
