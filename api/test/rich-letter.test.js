// A letter written in one go, rather than assembled out of blocks.
//
// The thing that matters is that it survives Gmail. Gmail throws stylesheets
// away, so every element has to carry its own styling or the letter arrives
// as black Times New Roman on a white page.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "pglite://.pglite-rich-letter-test";
process.env.NODE_ENV = "test";
process.env.EMAIL_DRIVER = "console";

const { renderIssue } = await import("../src/emails/issue.js");

const written = (html) =>
  renderIssue({
    subject: "A letter",
    preheader: "",
    blocks: [{ type: "rich", html }],
  });

test("the writing arrives with its styling on each element", () => {
  const { html } = written(
    "<h2>A heading</h2><p>Some words with <strong>weight</strong> and a <a href=\"https://www.vantaorigin.com\">link</a>.</p><ul><li>One</li></ul>"
  );

  // Not a stylesheet: the style is on the tag itself.
  assert.match(html, /<h2 style="[^"]*font-size:22px/);
  assert.match(html, /<p style="[^"]*line-height:1\.65/);
  assert.match(html, /<a href="https:\/\/www\.vantaorigin\.com" style="[^"]*text-decoration:underline/);
  assert.match(html, /<ul style="[^"]*padding-left:22px/);
  assert.match(html, /<li style="margin:0 0 6px;">One<\/li>/);
});

test("a style the writer set themselves is left alone", () => {
  const { html } = written('<p style="color:#ff0000">Red on purpose</p>');
  assert.match(html, /<p style="color:#ff0000">Red on purpose<\/p>/);
  assert.ok(!/color:#ff0000[^"]*line-height/.test(html));
});

test("nothing that runs survives the trip", () => {
  const { html } = written(
    '<p onclick="steal()">Hello</p><script>bad()</script><a href="javascript:go()">x</a>'
  );
  assert.ok(!html.includes("<script"), html);
  assert.ok(!html.includes("onclick"), html);
  assert.ok(!html.includes("javascript:"), html);
  assert.match(html, /Hello/);
});

test("the plain part carries the words for anyone reading text only", () => {
  const { text } = written("<h2>A heading</h2><p>And a sentence under it.</p>");
  assert.match(text, /A heading/);
  assert.match(text, /And a sentence under it/);
  assert.ok(!text.includes("<"), text);
});

test("letters written the old way still render", () => {
  const { html, text } = renderIssue({
    subject: "An older letter",
    preheader: "",
    blocks: [
      { type: "heading", text: "Still here" },
      { type: "text", text: "Assembled out of blocks, and unchanged." },
    ],
  });

  assert.match(html, /Still here/);
  assert.match(text, /Assembled out of blocks/);
});
