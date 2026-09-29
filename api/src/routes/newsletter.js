// Joining the newsletter, and leaving it.
//
// Leaving has to work from an email client: a link somebody taps with nobody
// signed in, and a POST for the mail apps that offer their own unsubscribe
// button. Gmail hides that button unless both exist, and a newsletter it
// cannot see a way out of is a newsletter it sends to spam.
import { z } from "zod";
import { config } from "../config.js";
import { subscribe, unsubscribeByToken } from "../newsletter.js";

const SITE = (config.SITE_URL || "https://www.vantaorigin.com").replace(/\/$/, "");

const page = (heading, words) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${heading} | VantaOrigin</title>
  </head>
  <body style="margin:0;background:#0e1320;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:64px 24px;text-align:center;color:#e8ecf5;">
      <h1 style="font-size:24px;margin:0 0 12px;color:#ffffff;">${heading}</h1>
      <p style="font-size:16px;line-height:1.6;margin:0 0 28px;">${words}</p>
      <a href="${SITE}" style="display:inline-block;background:#df1871;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 28px;border-radius:999px;">Go to VantaOrigin</a>
    </div>
  </body>
</html>`;

export default async function newsletterRoutes(app) {
  app.post("/newsletter/subscribe", async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body);
    const result = await subscribe(email, "footer");

    // The same answer whether the address was new, returning or already
    // there: whether somebody is on this list is not ours to tell a stranger.
    if (!result.ok) return reply.code(400).send({ error: "That does not look like an email address" });
    return { ok: true };
  });

  // Tapped from an email.
  app.get("/newsletter/unsubscribe", async (request, reply) => {
    const gone = await unsubscribeByToken(request.query.token);

    return reply
      .type("text/html; charset=utf-8")
      .send(
        gone
          ? page("You have been unsubscribed", "You will not get the VantaOrigin newsletter again. Your account, if you have one, is untouched.")
          : page("That link has expired", "We could not find that subscription. If you are still getting the newsletter, write to hello@vantaorigin.com and we will take you off by hand.")
      );
  });

  // The button a mail app shows for itself, which must be a POST and must
  // answer without a person present.
  app.post("/newsletter/unsubscribe", async (request, reply) => {
    const token = request.query.token || request.body?.token;
    await unsubscribeByToken(token);
    return reply.code(200).send({ ok: true });
  });
}
