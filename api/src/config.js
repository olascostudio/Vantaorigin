// Every value that can differ between a laptop, managed hosting and a VPS
// lives here and comes from the environment. Nothing else in the codebase
// reads process.env, so moving providers is an .env change.
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  HOST: z.string().default("0.0.0.0"),

  // postgres://user:password@host:5432/database — the same shape locally,
  // on managed hosting and on a VPS.
  DATABASE_URL: z.string().min(1),

  // Where this API itself is reachable, used to build URLs for files served
  // by the API in local development.
  API_PUBLIC_URL: z.string().optional(),

  // Where the browser app runs, for cookies and CORS.
  APP_ORIGIN: z.string().default("http://localhost:5173"),
  COOKIE_DOMAIN: z.string().optional(),

  // Storage: any S3-compatible service (Cloudflare R2 now, MinIO on a VPS).
  STORAGE_DRIVER: z.enum(["s3", "memory"]).default("memory"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(), // CDN/base URL files are served from

  // Email: Resend for now, SMTP or anything else later.
  EMAIL_DRIVER: z.enum(["resend", "console"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("VantaOrigin <noreply@vantaorigin.com>"),

  SESSION_TTL_DAYS: z.coerce.number().default(30),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Bad configuration:\n${missing.join("\n")}`);
}

export const config = parsed.data;
export const isProduction = config.NODE_ENV === "production";
