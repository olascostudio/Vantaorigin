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

  // Signing in with Google. Leave these out and that button simply says it
  // is not set up, rather than failing halfway through.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Email: Resend for now, SMTP or anything else later.
  EMAIL_DRIVER: z.enum(["resend", "console"]).default("console"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("VantaOrigin <noreply@vantaorigin.com>"),
  // The welcome letter asks for a reply, so replies must reach a person.
  EMAIL_REPLY_TO: z.string().default("hello@vantaorigin.com"),
  // Defaults to the app itself, which serves /emails/banner.jpg.
  EMAIL_BANNER_URL: z.string().optional(),

  // Who may open the admin dashboard, by email, comma separated. Kept in
  // the environment rather than a column, so granting or taking away access
  // needs neither a deploy nor a migration.
  ADMIN_EMAILS: z.string().default(""),

  // Where the public site lives. Every link a crawler is handed points here,
  // never at the API's own address.
  SITE_URL: z.string().default("https://www.vantaorigin.com"),

  SESSION_TTL_DAYS: z.coerce.number().default(30),
});

// Values typed into a hosting dashboard often arrive wrapped in quotes or
// with stray spaces. Clean them before anything else reads them.
//
// They also arrive, now and then, as the example from the instructions:
// "<the client id>", "<account-id>". A setting like that is worse than a
// missing one, because everything carries on as though it were real and the
// failure surfaces somewhere else entirely — Google answering "invalid
// client", a storage endpoint refusing to parse. Anything still wearing
// angle brackets is treated as not set, and said so out loud.
export const placeholders = [];

const clean = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed;
};

export const looksLikePlaceholder = (value) =>
  typeof value === "string" && /^<.*>$/.test(value.trim());

const cleaned = Object.fromEntries(
  Object.entries(process.env)
    .map(([key, value]) => [key, clean(value)])
    .filter(([key, value]) => {
      if (!looksLikePlaceholder(value)) return true;
      placeholders.push(key);
      return false; // as good as unset, and the warning below says why
    })
);

const parsed = schema.safeParse(cleaned);

if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Bad configuration:\n${missing.join("\n")}`);
}

export const config = parsed.data;
export const isProduction = config.NODE_ENV === "production";
