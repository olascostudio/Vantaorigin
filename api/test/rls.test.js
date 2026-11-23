// Every table has row level security, and the next one will too.
//
// 0004 turned it on for the fourteen tables that existed then, and explained
// why: Supabase publishes the public schema through its own REST endpoint, so
// a table without row security there can in principle be read with the
// project's anonymous key, and that key is meant to be public.
//
// Then twenty-eight more tables were added over thirty migrations and not one
// of them inherited it, including payout_accounts, which holds bank account
// numbers, orders, which holds a buyer's name and email, and the suppression
// list and email log, which are nothing but addresses. Nobody noticed because
// nothing fails when a table is missing it. That is exactly the shape of
// problem a test is for: this asks the database directly, so the next table
// added without row security fails here rather than in a year.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

const dataDir = ".pglite-rls-test";
process.env.DATABASE_URL = `pglite://${dataDir}`;
process.env.NODE_ENV = "test";

const { migrate } = await import("../src/db/migrate.js");
const { endConnection, db } = await import("../src/db/client.js");
const { sql } = await import("drizzle-orm");

before(async () => {
  await migrate();
});

after(async () => {
  await endConnection();
  await rm(dataDir, { recursive: true, force: true });
});

const tables = async () => {
  const result = await db.execute(sql`
    SELECT c.relname AS name, c.relrowsecurity AS rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname`);
  return result.rows ?? result;
};

test("every table in the public schema has row level security", async () => {
  const rows = await tables();
  assert.ok(rows.length > 30, `expected the whole schema, saw ${rows.length} tables`);

  const without = rows.filter((row) => !row.rls).map((row) => row.name);
  assert.deepEqual(
    without,
    [],
    `these tables have no row level security: ${without.join(", ")}. Add them to a migration, the way 0034 did.`
  );
});

test("the tables holding somebody else's money or address are covered", async () => {
  // Named rather than left to the sweep above, because if the sweep is ever
  // loosened these are the ones it must not be loosened for.
  const rows = await tables();
  const byName = Object.fromEntries(rows.map((row) => [row.name, row.rls]));

  for (const name of [
    "payout_accounts",
    "orders",
    "order_items",
    "ledger_entries",
    "suppression_list",
    "email_log",
    "newsletter_subscribers",
    "users",
    "sessions",
  ]) {
    assert.equal(byName[name], true, `${name} has no row level security`);
  }
});
