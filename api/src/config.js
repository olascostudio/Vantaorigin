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

  // Where the browser app runs, for cookies and CORS. Several are allowed,
  // comma separated.
  APP_ORIGIN: z.string().default("http://localhost:5173"),
  // Lets preview deployments through, e.g. ".vercel.app".
  ALLOWED_ORIGIN_SUFFIXES: z.string().optional(),
  COOKIE_DOMAIN: z.string().optional(),
  // The API and the front end sit on different domains in production, so the
  // session cookie has to be SameSite=None (which also forces Secure).
  // Locally they are both localhost, where "lax" is right.
  COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).default("lax"),

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
  // The welcome letter asks for a reply, so replies must reach a person.
  EMAIL_REPLY_TO: z.string().default("hello@vantaorigin.com"),
  // Defaults to the app itself, which serves /emails/banner.jpg.
  EMAIL_BANNER_URL: z.string().optional(),

  SESSION_TTL_DAYS: z.coerce.number().default(30),
});

// Values typed into a hosting dashboard often arrive wrapped in quotes or
// with stray spaces. Clean them before anything else reads them.
const cleaned = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [
    key,
    typeof value === "string" ? value.trim().replace(/^["']|["']$/g, "") : value,
  ])
);

const parsed = schema.safeParse(cleaned);

if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Bad configuration:\n${missing.join("\n")}`);
}

export const config = parsed.data;
export const isProduction = config.NODE_ENV === "production";
