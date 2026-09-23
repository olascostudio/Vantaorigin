// Image uploads. The browser posts the file here; the API decides where it
// lands. Today that is Cloudflare R2, later it could be MinIO on the VPS —
// the route and the client code stay the same.
import { authenticate } from "../auth/auth.js";
import { newKey, storage } from "../adapters/storage.js";
import { config } from "../config.js";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export default async function uploadRoutes(app) {
  app.post("/uploads", { preHandler: authenticate() }, async (request, reply) => {
    const file = await request.file({ limits: { fileSize: MAX_BYTES } });
    if (!file) return reply.code(400).send({ error: "No file uploaded" });
    if (!ALLOWED.has(file.mimetype)) {
      return reply.code(415).send({ error: "Images only (jpeg, png, webp or gif)" });
    }

    const folder = ["avatars", "banners", "covers", "assets"].includes(request.query.folder)
      ? request.query.folder
      : "assets";

    const buffer = await file.toBuffer();
    if (buffer.length > MAX_BYTES) return reply.code(413).send({ error: "That image is too large" });

    const key = newKey(`${request.user.id}/${folder}`, file.filename || "upload.jpg");
    try {
      const url = await storage.put(key, buffer, file.mimetype);
      return reply.code(201).send({ url, key });
    } catch (error) {
      // Storage misconfiguration is worth saying out loud in the logs.
      request.log.error({ err: error, driver: storage.name }, "upload failed");
      return reply.code(502).send({ error: "That image could not be saved. Please try again." });
    }
  });

  // Serves files back while STORAGE_DRIVER=memory, so local development needs
  // no bucket. Real storage serves them straight from its own URL.
  if (config.STORAGE_DRIVER === "memory") {
    app.get("/files/*", async (request, reply) => {
      const stored = storage.get(request.params["*"]);
      if (!stored) return reply.code(404).send({ error: "Not found" });
      return reply.type(stored.contentType).send(stored.body);
    });
  }
}
