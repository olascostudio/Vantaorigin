// Runs every .sql file in migrations/ once, in order, and records which have
// run. Plain SQL files mean the database can be rebuilt anywhere, including a
// VPS, without this project's tooling.
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "./client.js";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");

export async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const applied = new Set(
    (await sql`SELECT name FROM schema_migrations`).map((row) => row.name)
  );

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const ran = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const statements = await readFile(join(migrationsDir, file), "utf8");
    // Each migration runs in one transaction, so a failure leaves nothing behind.
    await sql.begin(async (tx) => {
      await tx.unsafe(statements);
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
    });
    ran.push(file);
  }

  return ran;
}

// `npm run migrate`
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const ran = await migrate();
  console.log(ran.length ? `Applied: ${ran.join(", ")}` : "Already up to date");
  await sql.end();
}
