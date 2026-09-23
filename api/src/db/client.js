// One database connection for the process. The only input is DATABASE_URL.
//
// Two drivers, same Postgres:
//   postgres://...  a real server (docker compose, managed hosting, a VPS)
//   pglite://<dir>  Postgres compiled to WebAssembly, stored in a folder.
//                   Handy for development before Docker is installed; never
//                   used in production.
import { config, isProduction } from "../config.js";
import * as schema from "./schema.js";

const usePglite = config.DATABASE_URL.startsWith("pglite");

let db;
let execSql; // run one or more statements
let endConnection;
let ping;

if (usePglite) {
  if (isProduction) throw new Error("pglite is for development only");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");

  const dir = config.DATABASE_URL.replace(/^pglite:\/\//, "") || ".pglite";
  const client = new PGlite(dir);
  await client.waitReady;

  db = drizzle(client, { schema });
  execSql = (text) => client.exec(text);
  endConnection = () => client.close();
  ping = () => client.query("SELECT 1");
} else {
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");

  // Connection poolers in transaction mode (Supabase port 6543, PgBouncer)
  // cannot keep prepared statements between queries.
  const pooled =
    config.DATABASE_URL.includes(":6543/") || config.DATABASE_URL.includes("pgbouncer=true");

  const sql = postgres(config.DATABASE_URL, {
    max: isProduction ? 10 : 4,
    prepare: !pooled,
    // Managed providers usually require TLS; a local container does not.
    ssl: config.DATABASE_URL.includes("sslmode=require") ? "require" : false,
  });

  db = drizzle(sql, { schema });
  execSql = (text) => sql.unsafe(text);
  endConnection = () => sql.end({ timeout: 1 });
  ping = () => sql`SELECT 1`;
}

export { db, execSql, endConnection, ping, schema };
