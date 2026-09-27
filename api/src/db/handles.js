// Finding a creator by their handle.
//
// A handle is stored the way it was typed — @Vtgshadowscribe keeps its
// capitals — but a link is a link: /realm/vtgshadowscribe and
// /realm/Vtgshadowscribe are the same person, and somebody pasting their own
// link in lower case should not be told their Realm does not exist.
//
// So every lookup compares in lower case, and so does the check that stops
// two people holding names that differ only by their capitals, which would
// leave a Realm address pointing at either of them.
import { sql } from "drizzle-orm";
import { db } from "./client.js";
import { users } from "./schema.js";

// "@Name", "Name", "@@name " all mean the same account.
export const normaliseHandle = (value) =>
  `@${String(value || "").replace(/^@+/, "").trim().toLowerCase()}`;

export async function userByHandle(handle, columns) {
  const query = columns ? db.select(columns) : db.select();
  const [row] = await query
    .from(users)
    .where(sql`lower(${users.username}) = ${normaliseHandle(handle)}`)
    .limit(1);
  return row ?? null;
}
