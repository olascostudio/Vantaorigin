// Turning a written issue into an email.
//
// A letter is kept as blocks -- a heading, a paragraph, a picture, a button --
// and becomes HTML here, at the moment it is sent or previewed. That way every
// issue lands in the same shell as every other VantaOrigin email, including the
// unsubscribe line, and improving the shell improves letters already written.
//
// Everything typed by a person is escaped before any markup is added, so a
// subject or a paragraph can contain < and & without breaking the email, and
// nothing typed into the editor can introduce HTML of its own.
import { escape, shell } from "./layout.js";
import { safeHtml } from "../html.js";

const INK = "#ffffff";
const BODY = "#e8ecf5";
const PINK = "#df1871";

// Only addresses a mail client will follow safely. Anything else (javascript:,
// data:) becomes a dead link rather than a live risk.
const safeHref = (value) => {
  const href = String(value || "").trim();
  return /^(https?:\/\/|mailto:)/i.test(href) ? href : "";
};

// The small amount of markup a writer can use inside a paragraph: **bold** and
// [words](address). Applied after escaping, so the text itself cannot smuggle
// in tags.
const inline = (text) =>
  escape(text)
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${INK};">$1</strong>`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, words, href) => {
      const target = safeHref(href.replace(/&amp;/g, "&"));
      if (!target) return words;
      return `<a href="${escape(target)}" style="color:${PINK};font-weight:bold;text-decoration:underline;">${words}</a>`;
    });

// The same markup, spoken plainly for the text part.
const inlinePlain = (text) =>
  String(text || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)");

// Code written by whoever runs the site, dropped into the letter as it is.
//
// Two things are taken out of it. Scripts and inline handlers, because the
// preview on the dashboard renders this in a frame that shares the app's
// origin -- an email client would throw them away regardless, so nothing is
// lost from the letter and a pasted surprise cannot run against the
// dashboard. And <style> blocks, because an email's styling has to live on
// the elements themselves: a style tag is ignored by Gmail and would quietly
// leave the letter looking wrong everywhere it matters.
// Shared with the blog, which stores the same kind of written-by-hand HTML.
const asWritten = (code) => safeHtml(code);

// A letter written in the rich text editor arrives as ordinary HTML: <h2>,
// <p>, <a>, <ul>. On a web page a stylesheet dresses those. Gmail throws
// stylesheets away, so the styling has to be put on each element here, or the
// letter lands as black Times New Roman on white.
//
// An element already carrying a style of its own is left alone: the writer
// meant that one.
const EMAIL_STYLES = {
  h1: `margin:28px 0 10px;color:${INK};font-size:26px;line-height:1.3;font-weight:bold;`,
  h2: `margin:28px 0 10px;color:${INK};font-size:22px;line-height:1.35;font-weight:bold;`,
  h3: `margin:24px 0 8px;color:${INK};font-size:18px;line-height:1.4;font-weight:bold;`,
  h4: `margin:22px 0 8px;color:${INK};font-size:16px;line-height:1.4;font-weight:bold;`,
  p: `margin:0 0 16px;color:${BODY};font-size:16px;line-height:1.65;`,
  a: `color:${PINK};font-weight:bold;text-decoration:underline;`,
  ul: `margin:0 0 16px;padding-left:22px;color:${BODY};font-size:16px;line-height:1.65;`,
  ol: `margin:0 0 16px;padding-left:22px;color:${BODY};font-size:16px;line-height:1.65;`,
  li: "margin:0 0 6px;",
  blockquote: `margin:18px 0;padding:2px 0 2px 16px;border-left:3px solid ${PINK};color:${BODY};font-style:italic;`,
  img: "max-width:100%;height:auto;border-radius:12px;",
  hr: "border:0;border-top:1px solid rgba(255,255,255,0.22);margin:26px 0;",
  strong: `color:${INK};`,
};

const styleForEmail = (html) =>
  String(html).replace(
    /<(h1|h2|h3|h4|p|a|ul|ol|li|blockquote|img|hr|strong)(\s[^>]*)?(\/?)>/gi,
    (whole, tag, attrs, closing) => {
      const style = EMAIL_STYLES[tag.toLowerCase()];
      if (!style) return whole;
      const carried = attrs || "";
      if (/\sstyle\s*=/i.test(carried)) return whole;
      return `<${tag}${carried} style="${style}"${closing}>`;
    }
  );

const blockHtml = (block, first) => {
  const top = first ? 0 : 22;

  switch (block?.type) {
    case "heading":
      return `<h2 style="margin:${first ? 0 : 30}px 0 0;color:${INK};font-size:22px;line-height:1.35;font-weight:bold;">${inline(
        block.text
      )}</h2>`;

    case "text":
      // Blank lines in the box become separate paragraphs, the way anybody
      // writing prose expects.
      return String(block.text || "")
        .split(/\n{2,}/)
        .filter((part) => part.trim())
        .map(
          (part, index) =>
            `<p style="margin:${index === 0 ? top : 16}px 0 0;color:${BODY};font-size:16px;line-height:1.7;">${inline(
              part
            ).replace(/\n/g, "<br />")}</p>`
        )
        .join("");

    case "image": {
      const src = safeHref(block.url);
      if (!src) return "";
      // Width is set on the tag as well as in CSS: Outlook ignores the style.
      const picture = `<img src="${escape(src)}" width="532" alt="${escape(
        block.alt || ""
      )}" style="display:block;width:100%;max-width:532px;height:auto;border:0;border-radius:12px;" />`;
      const href = safeHref(block.href);
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:${top}px 0 0;width:100%;"><tr><td style="font-size:0;line-height:0;">${
        href ? `<a href="${escape(href)}" style="text-decoration:none;">${picture}</a>` : picture
      }</td></tr></table>`;
    }

    case "button": {
      const href = safeHref(block.href);
      if (!href || !String(block.text || "").trim()) return "";
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:${
        top + 6
      }px 0 0;"><tr><td style="background:${PINK};border-radius:999px;"><a href="${escape(
        href
      )}" style="display:inline-block;padding:14px 34px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;">${escape(
        block.text
      )}</a></td></tr></table>`;
    }

    case "divider":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:${
        top + 6
      }px 0 0;"><tr><td style="border-top:1px solid #262f42;font-size:0;line-height:0;">&nbsp;</td></tr></table>`;

    // A letter written as rich text: one block holding the whole thing.
    case "rich": {
      const written = styleForEmail(asWritten(block.html)).trim();
      if (!written) return "";
      return `<div style="margin:${top}px 0 0;">${written}</div>`;
    }

    case "html": {
      const code = asWritten(block.code).trim();
      if (!code) return "";
      return `<div style="margin:${top}px 0 0;">${code}</div>`;
    }

    default:
      return "";
  }
};

const blockText = (block) => {
  switch (block?.type) {
    case "heading":
      return inlinePlain(block.text).toUpperCase();
    case "text":
      return inlinePlain(block.text);
    case "image":
      return block.alt ? `[${block.alt}]` : "";
    case "button": {
      const href = safeHref(block.href);
      return href ? `${block.text}: ${href}` : "";
    }
    case "divider":
      return "--";
    case "rich":
    case "html":
      // The plain part gets the words out of the markup, so a reader on a
      // text-only client still gets something.
      return asWritten(block.code ?? block.html)
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    default:
      return "";
  }
};

// What an empty issue looks like: a heading and a place to start, so the
// editor opens on something to type over rather than on nothing at all. One
// piece of writing rather than two blocks, because that is what the editor
// now hands back.
export const startingBlocks = () => [
  { type: "rich", html: "<h2>What's new at VantaOrigin</h2><p></p>" },
];

export function renderIssue(issue, { unsubscribeUrl = "" } = {}) {
  const blocks = Array.isArray(issue?.blocks) ? issue.blocks : [];
  const shown = blocks.filter((block) => blockHtml(block, false));

  const body = shown.map((block, index) => blockHtml(block, index === 0)).join("\n");

  const text = shown
    .map(blockText)
    .filter((part) => part.trim())
    .join("\n\n");

  return {
    subject: String(issue?.subject || "").trim() || "A letter from VantaOrigin",
    html: shell({
      preview: issue?.preheader || "",
      body: body || "",
      unsubscribeUrl,
      newsletter: true,
    }),
    text: unsubscribeUrl ? `${text}\n\n--\nTo leave the newsletter: ${unsubscribeUrl}` : text,
  };
}
