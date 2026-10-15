// The shell every VantaOrigin email is poured into: a header, a white sheet,
// and the same footer.
//
// Light rather than dark. The dark version opened with a piece of abstract
// purple artwork carrying no logo and no name, so the one glance an email
// gets in an inbox told you nothing about who had sent it.
//
// Two headers, because an email is not always an issue of the newsletter. A
// letter to the list opens with the Daily banner. A code or a welcome opens
// with the plain lockup, since a verification email wearing a masthead that
// says DAILY is a letter the reader did not subscribe to.
//
// Email is not the web. Tables and inline styles, because Outlook still runs
// on Word's rendering engine; explicit background colours on every cell,
// because a client that ignores the outer one would otherwise put white text
// on white. No webp and no SVG, which several clients refuse to draw.
import { config } from "../config.js";

// Measured against white rather than chosen by eye. Body text needs 4.5 to 1
// and the brand pink gives 4.66, which is why it can stay the pink: it reads
// as a link on the sheet and carries white on it as a button, both ways.
// Exported, because a letter is built in issue.js and lands on the sheet
// built here. While each kept its own copy they drifted apart, and the
// letters were being written in near-white on what is now white paper.
export const INK = "#1b2233"; // headings            15.9 : 1
export const BODY = "#39435a"; // running text        9.9 : 1
export const MUTED = "#6b7585"; // footer, fine print  4.7 : 1
export const PINK = "#df1871"; // links and buttons    4.7 : 1
export const RULE = "#e4e7ec"; // hairlines
const PAGE = "#f4f5f7"; // behind the sheet
const PANEL = "#ffffff"; // the sheet itself

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

// EMAIL_BANNER_URL still overrides both, so one can be swapped without a
// deploy, as it always could.
const headerFor = (newsletter) =>
  config.EMAIL_BANNER_URL || `${appOrigin()}/emails/${newsletter ? "daily.jpg" : "masthead.png"}`;

export const escape = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// A paragraph in body copy. `html` is trusted: it is written here, not typed.
export const p = (html, { color = BODY, size = 16, top = 18 } = {}) =>
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
      <td style="background:#fdf2f7;border:1px solid #f6d3e4;border-radius:12px;padding:14px 26px;font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:bold;letter-spacing:12px;color:${PINK};">
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

// The newsletter flag picks the header, and changes the footer's reason line:
// an issue goes to people who joined a list, which is not the same as having
// an account.
export function shell({ preview = "", body, unsubscribeUrl = "", newsletter = false }) {
  const year = new Date().getFullYear();
  const socials = SOCIALS.map(
    ([label, href, file, width]) =>
      `<a href="${href}" style="text-decoration:none;padding:0 9px;"><img src="${appOrigin()}/emails/${file}" width="${width}" height="26" alt="${label}" style="border:0;vertical-align:middle;color:${PINK};font-size:13px;font-weight:bold;" /></a>`
  ).join("");

  // Named, so that a reader whose mail app blocks pictures still sees who it
  // is from instead of an empty box.
  const headerAlt = newsletter ? "VantaOrigin Daily" : "VantaOrigin";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <!-- Light only: a client that inverts this would put the sheet behind
         the ink and leave the header picture sitting on black. -->
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>VantaOrigin</title>
  </head>
  <body style="margin:0;padding:0;background:${PAGE};">
    <!-- The line shown beside the subject in an inbox list. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preview)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE};">
      <tr>
        <td align="center" style="padding:24px 0 32px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${PANEL};border:1px solid ${RULE};border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:0;font-size:0;line-height:0;background:${PANEL};">
                <img src="${headerFor(newsletter)}" width="600" alt="${headerAlt}" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
              </td>
            </tr>

            <tr>
              <td style="padding:34px 34px 40px;background:${PANEL};font-family:Helvetica,Arial,sans-serif;">
                ${body}
              </td>
            </tr>

            <tr>
              <td style="border-top:1px solid ${RULE};background:#fafbfc;padding:26px 24px 30px;text-align:center;font-family:Helvetica,Arial,sans-serif;">
                <p style="margin:0;color:${INK};font-size:15px;font-weight:bold;">Connect with us</p>
                <p style="margin:12px 0 0;font-size:15px;">${socials}</p>
                <p style="margin:18px 0 0;color:${MUTED};font-size:13px;line-height:1.5;">
                  ${
                    newsletter
                      ? `You are getting this because you joined the
                  <a href="https://vantaorigin.com" style="color:${PINK};font-weight:bold;text-decoration:none;">VantaOrigin</a> creator newsletter.`
                      : `You are receiving this email because this address was registered on
                  <a href="https://vantaorigin.com" style="color:${PINK};font-weight:bold;text-decoration:none;">VantaOrigin</a>.`
                  }
                </p>
                ${
                  unsubscribeUrl
                    ? `<p style="margin:8px 0 0;color:${MUTED};font-size:13px;line-height:1.5;">${
                        newsletter
                          ? `Not for you any more? <a href="${unsubscribeUrl}" style="color:${MUTED};text-decoration:underline;">Unsubscribe</a>. Your account, if you have one, stays as it is.`
                          : `You are also on the creator newsletter. <a href="${unsubscribeUrl}" style="color:${MUTED};text-decoration:underline;">Unsubscribe</a> any time. Your account stays as it is.`
                      }</p>`
                    : ""
                }
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
