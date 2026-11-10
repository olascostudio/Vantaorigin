// A line from somebody using the site, sent on by email.
//
// Open to anyone, because the people worth hearing from during a beta are
// the ones who have not signed up yet: the ones who looked, found the thing
// confusing and left. Asking them to make an account first loses exactly the
// message worth having.
//
// That also makes it a thing strangers can post to, so it is held to a few a
// minute from one address, the message has a ceiling, and nothing typed is
// ever put into HTML without being escaped first.
import { z } from "zod";
import { config } from "../config.js";
import { mailer } from "../adapters/email.js";
import { escape, p, shell, strong } from "../emails/layout.js";

const body = z.object({
  message: z.string().trim().min(1).max(4000),
  // Optional on purpose. Somebody who wants a reply leaves one; somebody who
  // only wants to say the thing does not have to.
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  // Where they were when they said it, which is most of the context.
  page: z.string().trim().max(500).optional(),
});

// Whoever runs the site. Falls back to the address the site already replies
// from, so this works before ADMIN_EMAILS is set.
const goesTo = () => {
  const admins = config.ADMIN_EMAILS.split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  return admins[0] || config.EMAIL_REPLY_TO;
};

export default async function feedbackRoutes(app) {
  app.post(
    "/feedback",
    // Tighter than the whole-API limit: this one sends email, and a flood
    // of it would be somebody else's inbox. Stood down under test, where a
    // suite that can only say nine things is a suite that tests five.
    config.NODE_ENV === "test"
      ? {}
      : { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const parsed = body.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: "Write a line or two and try again." });
      }
      const { message, email, page } = parsed.data;

      const written = escape(message).replace(/\n/g, "<br />");
      const letter = shell({
        preview: message.slice(0, 120),
        body: `
          ${p(strong("Someone sent feedback from the beta banner."))}
          ${p(written, { top: 22 })}
          ${p(`${strong("From:")} ${email ? escape(email) : "no address left"}`, { top: 26 })}
          ${p(`${strong("Page:")} ${escape(page || "not recorded")}`, { top: 4 })}
        `,
      });

      try {
        await mailer.send({
          to: goesTo(),
          subject: `Feedback: ${message.slice(0, 60)}${message.length > 60 ? "…" : ""}`,
          html: letter,
          text: [
            "Someone sent feedback from the beta banner.",
            "",
            message,
            "",
            `From: ${email || "no address left"}`,
            `Page: ${page || "not recorded"}`,
          ].join("\n"),
          // So a reply goes to them rather than to the site.
          ...(email ? { replyTo: email } : {}),
        });
      } catch (error) {
        // Said out loud rather than swallowed. Somebody who has just written
        // out a thought deserves to know it did not arrive, and to be given
        // somewhere else to put it.
        request.log.error({ err: error }, "feedback could not be sent");
        return reply
          .code(502)
          .send({ error: `That did not send. Please email ${config.EMAIL_REPLY_TO} instead.` });
      }

      return { ok: true };
    }
  );
}
