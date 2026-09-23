// File storage behind one small interface: put(), remove(), urlFor().
//
// "s3" talks to anything with an S3 API — Cloudflare R2 now, MinIO on a VPS
// later — so moving means changing S3_ENDPOINT, not this file's callers.
// "memory" keeps uploads in the process, which is enough for local work.
import { randomUUID } from "node:crypto";
import { config } from "../config.js";

function memoryStorage() {
  const files = new Map();
  return {
    name: "memory",
    async put(key, body, contentType) {
      files.set(key, { body, contentType });
      return this.urlFor(key);
    },
    async remove(key) {
      files.delete(key);
    },
    urlFor(key) {
      // Absolute, because the page is served from a different port.
      const base = (config.API_PUBLIC_URL || `http://localhost:${config.PORT}`).replace(/\/$/, "");
      return `${base}/files/${key}`;
    },
    // only used by the local file route
    get(key) {
      return files.get(key);
    },
  };
}

// Cloudflare shows the endpoint in several shapes, and a pasted value often
// arrives without the scheme or with the bucket on the end. The client needs
// the origin only.
function normaliseEndpoint(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) throw new Error("S3_ENDPOINT is not set");
  const withScheme = /^https?:///i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withScheme).origin;
}

async function s3Storage() {
  const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const endpoint = normaliseEndpoint(config.S3_ENDPOINT);

  const client = new S3Client({
    region: config.S3_REGION,
    endpoint,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    },
    // Recent AWS SDK versions add checksum headers that Cloudflare R2 (and
    // MinIO) reject outright. Only send them when the operation needs them.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return {
    name: "s3",
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.S3_BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
      return this.urlFor(key);
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
    },
    urlFor(key) {
      const base = (config.S3_PUBLIC_URL || "").replace(/\/$/, "");
      return `${base}/${key}`;
    },
  };
}

export const storage = config.STORAGE_DRIVER === "s3" ? await s3Storage() : memoryStorage();

// "characters/<uuid>.jpg" — keeps uploads tidy and collision-free.
export function newKey(folder, filename) {
  const extension = (filename.match(/\.[a-z0-9]+$/i)?.[0] || ".bin").toLowerCase();
  return `${folder}/${randomUUID()}${extension}`;
}
