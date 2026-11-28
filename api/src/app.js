// The Fastify app. Kept separate from server.js so tests can build it without
// opening a port.
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { config, isProduction, placeholders } from "./config.js";
import adminRoutes from "./routes/admin.js";
import distributionAdminRoutes from "./routes/distribution-admin.js";
import bookRoutes from "./routes/books.js";
import creatorSalesRoutes from "./routes/creator-sales.js";
import authRoutes from "./routes/auth.js";
import checkoutRoutes from "./routes/checkout.js";
import printerRoutes from "./routes/printer.js";
import studioRoutes from "./routes/studio.js";
import blogRoutes from "./routes/blog.js";
import blogPreviewRoutes from "./routes/blog-preview.js";
import homePreviewRoutes from "./routes/home-preview.js";
import characterRoutes from "./routes/characters.js";
import embedRoutes from "./routes/embed.js";
import feedbackRoutes from "./routes/feedback.js";
import highlightRoutes from "./routes/highlights.js";
import googleRoutes, { googleConfigNote } from "./routes/google.js";
import newsletterRoutes from "./routes/newsletter.js";
import preferenceRoutes from "./routes/preferences.js";
import newsletterAdminRoutes from "./routes/newsletter-admin.js";
import previewRoutes from "./routes/preview.js";
import creatorRoutes from "./routes/creator.js";
import reportRoutes from "./routes/reports.js";
import termsRoutes from "./routes/terms.js";
import broadcastRoutes from "./routes/broadcasts.js";
import creatorDashboardRoutes from "./routes/creator-dashboard.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import suppressionRoutes from "./routes/suppression.js";
import webhookRoutes from "./routes/webhooks.js";
import uploadRoutes from "./routes/uploads.js";
import { ping } from "./db/client.js";

export async function buildApp() {
  const app = Fastify({
    logger: isProduction ? true : { transport: undefined, level: "warn" },
    trustProxy: true, // correct client IPs behind Render, Cloudflare or nginx
    // Said out loud rather than left to the framework's default, because
    // something depends on it: GHSA-mrhx-c7xc-m3w5 says zod can be made to
    // chew through memory validating an oversized collection. Its range is
    // "< 4.6.6", which takes in the v3 line we are on, though the advisory
    // does not say in so many words that v3 is affected and I could not
    // confirm it either way. Moving to v4 is a breaking change across every
    // route that validates anything, so until somebody decides to do that,
    // a ceiling on how much can be sent is what stands between the bug and
    // the process. It caps the input whichever way the bug actually works.
    //
    // Uploads are multipart and carry their own, larger limit, so this does
    // not touch them. Two routes legitimately take more than this and set
    // their own: writing a blog post, and the subscriber import.
    bodyLimit: 1024 * 1024,
  });

  const allowedOrigins = config.APP_ORIGIN.split(",").map((value) => value.trim());
  const commas = (value) =>
    (value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const allowedSuffixes = commas(config.ALLOWED_ORIGIN_SUFFIXES);
  const allowedPrefixes = commas(config.ALLOWED_ORIGIN_PREFIXES);

  // A suffix on its own used to be enough, and ".vercel.app" was the
  // configured value. That is a public suffix: anybody can put a site on one
  // for free, and every one of them was being answered with
  // Access-Control-Allow-Credentials: true. With the session cookie on
  // SameSite=None, which it must be because the API and the app are on
  // different domains, any such page could read a signed-in person's data
  // by asking this API for it.
  //
  // So a suffix now only counts with a prefix beside it, naming this
  // project: vantaorigin-git-x.vercel.app is ours, somebody-else.vercel.app
  // is not. A suffix configured without a prefix matches nothing at all,
  // rather than everything, because the failure that costs something is the
  // one that lets a stranger in.
  // The prefix has to end on a label boundary, and what it matches has to be
  // the whole of the one label in front of the suffix.
  //
  // startsWith on the bare hostname was not enough: it is a match on raw
  // characters, so "vantaoriginal.vercel.app" passed on the strength of
  // sharing eleven letters, and "vantaorigin.evil.vercel.app" passed by
  // putting our name in front of somebody else's label.
  const previewAllowed = (hostname) => {
    if (!allowedSuffixes.length || !allowedPrefixes.length) return false;

    const suffix = allowedSuffixes.find((candidate) => hostname.endsWith(candidate));
    if (!suffix) return false;

    // Everything in front of the suffix. On ".vercel.app" that is the
    // project label and nothing else; a dot left in it means somebody put a
    // label of their own between the two, so it is not ours.
    const label = hostname.slice(0, -suffix.length);
    if (!label || label.includes(".")) return false;

    return allowedPrefixes.some(
      (prefix) => label === prefix || label.startsWith(`${prefix}-`)
    );
  };

  if (allowedSuffixes.length && !allowedPrefixes.length) {
    app.log.warn(
      "ALLOWED_ORIGIN_SUFFIXES is set without ALLOWED_ORIGIN_PREFIXES, so no preview origin will be allowed. Set a prefix naming this project."
    );
  }

  await app.register(cors, {
    credentials: true, // the session cookie travels with every request
    origin(origin, done) {
      // No Origin header: curl, health checks, same-origin requests. CORS
      // never gated the request anyway, only whether a browser may read the
      // answer; the session cookie is what gates the request.
      if (!origin) return done(null, true);

      let parsed;
      try {
        parsed = new URL(origin);
      } catch {
        // An Origin we cannot parse is not one we can vouch for.
        return done(null, false);
      }

      // An exact configured origin is answered as configured, whatever it
      // says. Everything else has to survive three more questions.
      if (allowedOrigins.includes(origin)) return done(null, true);

      // The header is reflected back as the bytes that arrived, not as the
      // thing we parsed, so what we check and what we answer have to be the
      // same string. Padded whitespace, userinfo, and a fullwidth letter
      // that Unicode folds to an ASCII one all parsed to a hostname we
      // trusted while the header carried something else. The last of those
      // reached the header write and threw, which is to say an unparseable
      // name became a 500 instead of a refusal.
      if (parsed.origin !== origin) return done(null, false);

      // A preview is served over https. Without this, ftp://, file-ish
      // schemes and browser extension origins all passed on hostname alone.
      if (parsed.protocol !== "https:") return done(null, false);

      done(null, previewAllowed(parsed.hostname));
    },
  });
  await app.register(cookie);
  await app.register(multipart);
  // Who a rate limit is counting.
  //
  // The limits are keyed on request.ip by default, and trustProxy: true
  // trusts every hop in X-Forwarded-For, so request.ip is the LEFTMOST
  // entry: the one the client wrote. A new value per request therefore meant
  // a new bucket per request, and every limit here counted to one and
  // started again. Measured before this: 40 sign-in attempts with a fresh
  // X-Forwarded-For each time produced forty 401s and not one 429, and 200
  // requests to /health went through untouched where the same 200 from one
  // address were cut off at 119.
  //
  // A proxy APPENDS the address it received the request from, so the
  // rightmost entry is the one our own proxy wrote and the only one a
  // client cannot choose. That is what we count. With no proxy in front
  // there is no header and request.ip is the socket, which is honest too.
  // Note what this does NOT fix: request.ip itself is still the leftmost
  // entry everywhere else it is used, logs included, because trustProxy is
  // still true. Narrowing that to a hop count would fix it everywhere at
  // once, and is the better change the day somebody can confirm how many
  // proxies actually sit in front of this service.
  const clientKey = (request) => {
    const forwarded = request.headers["x-forwarded-for"];
    const rightmost =
      typeof forwarded === "string" ? forwarded.split(",").pop().trim() : "";
    return rightmost || request.ip;
  };

  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    keyGenerator: clientKey,
  });

  // Validation and unexpected errors come back as clean JSON.
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: error.issues[0]?.message || "Invalid request" });
    }
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    request.log.error(error);
    return reply.code(500).send({ error: "Something went wrong" });
  });

  if (isProduction && config.STORAGE_DRIVER === "memory") {
    app.log.warn("STORAGE_DRIVER=memory: uploads are lost on restart. Set up S3/R2.");
  }

  // Settings still wearing the angle brackets from the instructions, and any
  // that are set but unusable. Better said here than discovered by someone
  // pressing a button.
  if (placeholders.length) {
    app.log.warn(
      `Ignoring settings that still hold example text: ${placeholders.join(", ")}. Paste the real values.`
    );
  }
  const googleNote = googleConfigNote();
  if (googleNote) app.log.warn(googleNote);

  app.get("/health", async () => {
    await ping();
    return {
      ok: true,
      storage: config.STORAGE_DRIVER,
      email: config.EMAIL_DRIVER,
      // Which storage settings arrived: true/false only, never the values.
      storageConfig: {
        endpoint: Boolean(config.S3_ENDPOINT),
        bucket: Boolean(config.S3_BUCKET),
        keyId: Boolean(config.S3_ACCESS_KEY_ID),
        secret: Boolean(config.S3_SECRET_ACCESS_KEY),
        publicUrl: Boolean(config.S3_PUBLIC_URL),
      },
    };
  });

  // Nothing on this API belongs inside somebody else's page. Dropping a
  // signed-in dashboard into a hidden frame and collecting the clicks is an
  // old trick, and a lax session cookie only happens to blunt it.
  //
  // The embed route is the exception and sets its own header: a card that
  // cannot be framed is not an embed. It is public, read-only, and carries
  // no session.
  app.addHook("onSend", async (request, reply) => {
    // The front end has had this from Vercel all along; the API, which is
    // the half that carries the session cookie, has not. Without it a
    // browser that has never seen this host will try http:// first if
    // something sends it there, and the cookie is Secure so it would not
    // travel, but the request still would. Production only: locally there
    // is no certificate and telling a browser to remember this host as
    // https for two years is not something to do by accident.
    //
    // Set before the embed check rather than after it. An embed is the one
    // thing here a stranger's page can load, so it is the likeliest first
    // contact a browser ever has with this host, and it was the one reply
    // that taught the browser nothing.
    if (isProduction) {
      reply.header("strict-transport-security", "max-age=63072000; includeSubDomains");
    }
    if (request.url.startsWith("/embed/")) return;
    reply.header("content-security-policy", "frame-ancestors 'none'");
    reply.header("x-frame-options", "DENY");
    reply.header("x-content-type-options", "nosniff");
    reply.header("referrer-policy", "strict-origin-when-cross-origin");
  });

  await app.register(adminRoutes);
  await app.register(authRoutes);
  await app.register(blogRoutes);
  await app.register(blogPreviewRoutes);
  await app.register(homePreviewRoutes);
  await app.register(characterRoutes);
  await app.register(embedRoutes);
  await app.register(feedbackRoutes);
  await app.register(googleRoutes);
  await app.register(highlightRoutes);
  await app.register(newsletterRoutes);
  await app.register(newsletterAdminRoutes);
  await app.register(distributionAdminRoutes);
  await app.register(bookRoutes);
  await app.register(creatorSalesRoutes);
  await app.register(checkoutRoutes);
  await app.register(printerRoutes);
  await app.register(studioRoutes);
  await app.register(preferenceRoutes);
  await app.register(previewRoutes);
  await app.register(creatorRoutes);
  await app.register(reportRoutes);
  await app.register(termsRoutes);
  await app.register(broadcastRoutes);
  await app.register(creatorDashboardRoutes);
  await app.register(subscriptionRoutes);
  await app.register(suppressionRoutes);
  await app.register(webhookRoutes);
  await app.register(uploadRoutes);

  return app;
}
