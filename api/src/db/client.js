// One Postgres connection pool for the process. Nothing provider-specific:
// the only input is DATABASE_URL.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { config, isProduction } from "../config.js";
import * as schema from "./schema.js";

export const sql = postgres(config.DATABASE_URL, {
  max: isProduction ? 10 : 4,
  // Managed providers usually require TLS; a local container does not.
  ssl: config.DATABASE_URL.includes("sslmode=require") ? "require" : false,
});

export const db = drizzle(sql, { schema });
export { schema };
