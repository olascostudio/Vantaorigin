// The shell every VantaOrigin email is poured into: banner, dark body, and
// the same footer.
//
// Email is not the web. Tables and inline styles, because Outlook still runs
// on Word's rendering engine; explicit background colours on every cell,
// because a client that ignores the outer one would otherwise put dark text
// on dark. No webp and no SVG, which several clients refuse to draw.
import { config } from "../config.js";

const INK = "#ffffff";
const MUTED = "#9aa4b8";
const PINK = "#df1871";
const PAGE = "#0e1320";
const PANEL = "#151c2c";

// Icon, where it goes, and how wide it is at 26px tall: each is drawn from
// the same artwork as the site, in pink. The alt text is what someone sees
// when their mail app refuses to load pictures, so it names the place.
const SOCIALS = [
  ["Discord", "https://discord.gg/4E5dFcaEAa", "discord.png", 34],
  ["X", "https://x.com/vantaorigin", "x.png", 24],
  ["Instagram", "https://www.instagram.com/vantaoriginstudio/", "instagram.png", 26],
];

// Hosted beside the app, so the address holds wherever the API runs. Several
// origins may be allowed; the marketplace subdomain is not the one to point
// pictures at, so it is passed over.
const appOrigin = () => {
  const origins = config.APP_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
  return origins.find((origin) => !origin.includes("studio.")) || origins[0] || "https://vantaorigin.com";
};

const bannerUrl = () => config.EMAIL_BANNER_URL || `${appOrigin()}/emails/banner.jpg`;

export const escape = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// A paragraph in body copy. `html` is trusted: it is written here, not typed.
export const p = (html, { color = "#e8ecf5", size = 16, top = 18 } = {}) =>
  `<p style="margin:${top}px 0 0;color:${color};font-size:${size}px;line-height:1.6;">${html}</p>`;

export const strong = (text) => `<strong style="color:${INK};">${escape(text)}</strong>`;

export const link = (text, href) =>
  `<a href="${escape(href)}" style="color:${PINK};font-weight:bold;text-decoration:underline;">${escape(
    text
  )}</a>`;

// The four digits, in a box of their own.
export const codeBlock = (code) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;">
    <tr>
      <td style="background:#2b3547;border-radius:12px;padding:14px 26px;font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:bold;letter-spacing:12px;color:#ff2d78;">
        ${escape(code)}
      </td>
    </tr>
  </table>`;

// A single call to action.
export const button = (text, href) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;">
    <tr>
      <td style="background:${PINK};border-radius:999px;">
        <a href="${escape(href)}" style="display:inline-block;padding:14px 34px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;">${escape(
          text
        )}</a>
      </td>
    </tr>
  </table>`;

export function shell({ preview = "", body }) {
  const year = new Date().getFullYear();
  const socials = SOCIALS.map(
    ([label, href, file, width]) =>
      `<a href="${href}" style="text-decoration:none;padding:0 9px;"><img src="${appOrigin()}/emails/${file}" width="${width}" height="26" alt="${label}" style="border:0;vertical-align:middle;color:${PINK};font-size:13px;font-weight:bold;" /></a>`
  ).join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <title>VantaOrigin</title>
  </head>
  <body style="margin:0;padding:0;background:${PAGE};">
    <!-- The line shown beside the subject in an inbox list. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preview)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE};">
      <tr>
        <td align="center" style="padding:0 0 32px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${PANEL};">
            <tr>
              <td style="padding:0;font-size:0;line-height:0;">
                <img src="${bannerUrl()}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
              </td>
            </tr>

            <tr>
              <td style="padding:34px 34px 40px;font-family:Helvetica,Arial,sans-serif;">
                ${body}
              </td>
            </tr>

            <tr>
              <td style="border-top:1px solid #262f42;padding:26px 24px 30px;text-align:center;font-family:Helvetica,Arial,sans-serif;">
                <p style="margin:0;color:${INK};font-size:15px;font-weight:bold;">Connect with us</p>
                <p style="margin:12px 0 0;font-size:15px;">${socials}</p>
                <p style="margin:18px 0 0;color:${MUTED};font-size:13px;line-height:1.5;">
                  You are receiving this email because this address was registered on
                  <a href="https://vantaorigin.com" style="color:${PINK};font-weight:bold;text-decoration:none;">VantaOrigin</a>.
                </p>
                <p style="margin:8px 0 0;color:${MUTED};font-size:13px;">© ${year} VantaOrigin.com, All Rights Reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
