// The Fastify app. Kept separate from server.js so tests can build it without
// opening a port.
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { config, isProduction } from "./config.js";
import authRoutes from "./routes/auth.js";
import characterRoutes from "./routes/characters.js";
import highlightRoutes from "./routes/highlights.js";
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

  app.get("/health", async () => {
    await ping();
    return {
      ok: true,
      storage: config.STORAGE_DRIVER,
      email: config.EMAIL_DRIVER,
      // Which storage settings arrived — true/false only, never the values.
      storageConfig: {
        endpoint: Boolean(config.S3_ENDPOINT),
        bucket: Boolean(config.S3_BUCKET),
        keyId: Boolean(config.S3_ACCESS_KEY_ID),
        secret: Boolean(config.S3_SECRET_ACCESS_KEY),
        publicUrl: Boolean(config.S3_PUBLIC_URL),
      },
    };
  });

  await app.register(authRoutes);
  await app.register(characterRoutes);
  await app.register(highlightRoutes);
  await app.register(uploadRoutes);

  return app;
}
