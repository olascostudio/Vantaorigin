// Runs every .sql file in migrations/ once, in order, and records which have
// run. Plain SQL files mean the database can be rebuilt anywhere, including a
// VPS, without this project's tooling.
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { db, endConnection, execSql } from "./client.js";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");

export async function migrate() {
  await execSql(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const result = await db.execute(sql`SELECT name FROM schema_migrations`);
  const applied = new Set((result.rows ?? result).map((row) => row.name));

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const ran = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const statements = await readFile(join(migrationsDir, file), "utf8");
    await execSql(statements);
    await db.execute(sql`INSERT INTO schema_migrations (name) VALUES (${file})`);
    ran.push(file);
  }

  return ran;
}

// `npm run migrate`. pathToFileURL gets this right on Windows too, where the
// naive comparison silently did nothing.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const ran = await migrate();
  console.log(ran.length ? `Applied: ${ran.join(", ")}` : "Already up to date");
  await endConnection();
}
