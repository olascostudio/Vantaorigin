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
import authRoutes from "./routes/auth.js";
import blogRoutes from "./routes/blog.js";
import blogPreviewRoutes from "./routes/blog-preview.js";
import characterRoutes from "./routes/characters.js";
import embedRoutes from "./routes/embed.js";
import highlightRoutes from "./routes/highlights.js";
import googleRoutes, { googleConfigNote } from "./routes/google.js";
import newsletterRoutes from "./routes/newsletter.js";
import newsletterAdminRoutes from "./routes/newsletter-admin.js";
import previewRoutes from "./routes/preview.js";
import creatorRoutes from "./routes/creator.js";
import reportRoutes from "./routes/reports.js";
import uploadRoutes from "./routes/uploads.js";
import { ping } from "./db/client.js";

export async function buildApp() {
  const app = Fastify({
    logger: isProduction ? true : { transport: undefined, level: "warn" },
    trustProxy: true, // correct client IPs behind Render, Cloudflare or nginx
  });

  const allowedOrigins = config.APP_ORIGIN.split(",").map((value) => value.trim());
  const allowedSuffixes = (config.ALLOWED_ORIGIN_SUFFIXES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  await app.register(cors, {
    credentials: true, // the session cookie travels with every request
    origin(origin, done) {
      // No Origin header: curl, health checks, same-origin requests.
      if (!origin) return done(null, true);
      const allowed =
        allowedOrigins.includes(origin) ||
        allowedSuffixes.some((suffix) => new URL(origin).hostname.endsWith(suffix));
      done(null, allowed);
    },
  });
  await app.register(cookie);
  await app.register(multipart);
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

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
  await app.register(characterRoutes);
  await app.register(embedRoutes);
  await app.register(googleRoutes);
  await app.register(highlightRoutes);
  await app.register(newsletterRoutes);
  await app.register(newsletterAdminRoutes);
  await app.register(previewRoutes);
  await app.register(creatorRoutes);
  await app.register(reportRoutes);
  await app.register(uploadRoutes);

  return app;
}
