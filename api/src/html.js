// Rich text, made safe to put on a page.
//
// Both the letters and the blog store HTML that a person wrote in an editor.
// Only an admin can write it, so this is not the only thing standing between
// the site and a stranger, but stored HTML is rendered later in somebody
// else's browser and a mistake there is permanent. The dangerous parts come
// out: anything that runs, and anything that can be made to run.
//
// What stays is deliberate. Tables, inline styles, images and iframes all
// survive, because an article embeds a video and an email is laid out with
// tables, and stripping those would make the editor useless.
export const safeHtml = (code) =>
  String(code || "")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<base\b[^>]*>/gi, "")
    // Event handlers, quoted three ways and unquoted.
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    // An iframe that carries its own document is a script by another name.
    .replace(/\ssrcdoc\s*=\s*"[^"]*"/gi, "")
    .replace(/\ssrcdoc\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "");

// The words a reader actually meets, with the markup taken off. Used for
// reading time and for falling back to an excerpt nobody wrote.
export const textOf = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

// Reading speed is roughly 200 words a minute. Anything with words in it
// takes at least a minute, because "0 min read" reads like a mistake.
export const readingMinutes = (html) => {
  const words = textOf(html).split(" ").filter(Boolean).length;
  return words ? Math.max(1, Math.round(words / 200)) : 0;
};
