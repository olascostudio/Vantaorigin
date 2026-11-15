// What an announcement looks like, and the two pinks.
//
// A service announcement is the only thing we send that nobody chose, and
// it carries no way out. Most of this is about saying so where somebody
// will read it, rather than leaving them to wonder why they cannot stop
// something they never started.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "pglite://.pglite-announce-tmpl-test";
process.env.NODE_ENV = "test";

const { renderIssue } = await import("../src/emails/issue.js");
const { whyThisArrived, noticeBand } = await import("../src/emails/announcement.js");
const { termsChangeEmail } = await import("../src/emails/templates.js");
const { PINK, BRAND_PINK, button, link } = await import("../src/emails/layout.js");
const { REASON_CATEGORIES } = await import("../src/email-classes.js");

const announcement = (reasonCategory) =>
  renderIssue(
    { subject: "Something has changed", blocks: [{ type: "text", text: "Here is the thing." }] },
    { newsletter: false, reasonCategory }
  );

// --- why it arrived ------------------------------------------------------

test("every reason we can send has words for why it arrived", () => {
  for (const reason of REASON_CATEGORIES) {
    const said = whyThisArrived(reason);
    assert.ok(said, `${reason} has nothing to say for itself`);
    // The part people actually want: not what this is, but why they
    // cannot make it stop.
    assert.match(said, /nothing here to unsubscribe from/i, reason);
    assert.match(said, /because you have a VantaOrigin account/i, reason);
  }
});

test("a reason nobody recognises says nothing rather than guessing", () => {
  assert.equal(whyThisArrived("something_new"), "");
  assert.equal(whyThisArrived(null), "");
  assert.equal(noticeBand("something_new"), "");
});

test("it is at the top, before anything the writer wrote", () => {
  const letter = announcement("terms_change");

  const notice = letter.html.indexOf("because you have a VantaOrigin account");
  const written = letter.html.indexOf("Here is the thing.");
  assert.ok(notice > -1 && written > -1);
  assert.ok(notice < written, "the explanation comes first");
});

test("the plain copy says it too", () => {
  // Somebody reading in plain text has the same question and no band to
  // see.
  const letter = announcement("security_notice");
  assert.match(letter.text, /^This is a security notice/);
  assert.match(letter.text, /nothing here to unsubscribe from/);
});

test("a newsletter gets none of this, having been asked for", () => {
  const letter = renderIssue(
    { subject: "The letter", blocks: [{ type: "text", text: "Hello." }] },
    { unsubscribeUrl: "https://api.vantaorigin.com/newsletter/unsubscribe?token=x" }
  );

  assert.doesNotMatch(letter.html, /nothing here to unsubscribe from/);
  assert.doesNotMatch(letter.text, /nothing here to unsubscribe from/);
  // It has a real way out instead.
  assert.match(letter.text, /To leave the newsletter/);
});

test("the band is grey, not an alarm", () => {
  // A terms change is not an emergency, and a colour that says emergency
  // on a maintenance notice teaches people to ignore the colour.
  const band = noticeBand("downtime");
  assert.match(band, /#f4f5f7/);
  assert.doesNotMatch(band, /#(ff0000|dc2626|b91c1c)/i);
});

// --- the two pinks -------------------------------------------------------

test("a button is filled with the brand pink, where large bold text only needs 3 to 1", () => {
  const markup = button("Read the new terms", "https://www.vantaorigin.com/terms");

  assert.match(markup, new RegExp(BRAND_PINK));
  assert.equal(BRAND_PINK, "#EB1C8D");
});

test("a link in running text keeps the readable one, where body text needs 4.5 to 1", () => {
  const markup = link("here", "https://www.vantaorigin.com/terms");

  assert.match(markup, new RegExp(PINK));
  assert.doesNotMatch(markup, new RegExp(BRAND_PINK));
});

test("the two are measurably what they claim to be", () => {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const onWhite = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    return 1.05 / (l + 0.05);
  };

  // The whole reason there are two. If either of these stops being true,
  // the split has lost its point and somebody should know.
  assert.ok(onWhite(PINK) >= 4.5, `links are ${onWhite(PINK).toFixed(2)}:1, under 4.5`);
  assert.ok(onWhite(BRAND_PINK) >= 3, `buttons are ${onWhite(BRAND_PINK).toFixed(2)}:1, under 3`);
  assert.ok(onWhite(BRAND_PINK) < 4.5, "the brand pink would pass body text, so the split is moot");
});

// --- the terms change letter --------------------------------------------

test("it leads with the date, because that is the part that matters", () => {
  const letter = termsChangeEmail({
    user: { firstName: "Ola" },
    version: "2026-12-01",
    effectiveDate: "2026-12-01T00:00:00Z",
    summary: "Subscriber addresses are shared with the creator you subscribe to.",
  });

  assert.match(letter.subject, /changing on 1 December 2026/);
  assert.match(letter.text, /takes effect on 1 December 2026/);
  assert.match(letter.text, /What is changing: Subscriber addresses/);
  // Sent to read the thing itself rather than to trust a summary.
  assert.match(letter.text, /https:\/\/www\.vantaorigin\.com\/terms/);
  assert.match(letter.text, /version 2026-12-01/);
});

test("it says what somebody can do if they will not accept", () => {
  const letter = termsChangeEmail({ user: {}, version: "v1", effectiveDate: null });

  // "Keep using it and you have agreed" is only fair if the alternative
  // is stated in the same breath.
  assert.match(letter.text, /close your account/i);
  assert.match(letter.text, /means you accept them/i);
});

test("with no date it does not invent one", () => {
  const letter = termsChangeEmail({ user: {}, version: "v1", effectiveDate: null });

  assert.equal(letter.subject, "The VantaOrigin terms are changing");
  assert.doesNotMatch(letter.text, /Invalid Date|NaN|undefined/);
});

test("it is not dressed as a newsletter", () => {
  const letter = termsChangeEmail({ user: {}, version: "v1", effectiveDate: null });

  // They did not join anything, and the footer must not say they did.
  assert.doesNotMatch(letter.html, /creator newsletter/i);
  assert.match(letter.html, /registered on/i);
});

test("no em dashes or en dashes in any of it", () => {
  const all = [
    announcement("terms_change").html,
    announcement("terms_change").text,
    termsChangeEmail({ user: {}, version: "v1", effectiveDate: "2026-12-01T00:00:00Z" }).html,
    ...REASON_CATEGORIES.map(whyThisArrived),
  ].join("");

  assert.doesNotMatch(all, /[—–]/);
});
