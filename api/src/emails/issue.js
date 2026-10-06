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
const asWritten = (code) =>
  String(code || "")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");

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
    case "html":
      // The plain part gets the words out of the markup, so a reader on a
      // text-only client still gets something.
      return asWritten(block.code)
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    default:
      return "";
  }
};

// What an empty issue looks like: one heading and one paragraph, so the editor
// opens on something to type over rather than on nothing at all.
export const startingBlocks = () => [
  { type: "heading", text: "What's new at VantaOrigin" },
  { type: "text", text: "" },
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
