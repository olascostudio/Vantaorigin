// Keeping the list.
//
// Two ways on: the form in the footer, and making an account — every account
// hears from us unless they say otherwise. One way off, and it has to work
// from an email client with nobody signed in, which is what the token is for.
//
// Offering an address that is already on the list is not an error and never
// says so: whether an address is on it is not ours to tell whoever asked.
import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "./db/client.js";
import { newsletterSubscribers } from "./db/schema.js";

const newToken = () => randomBytes(24).toString("base64url");

export const tidyEmail = (email) => String(email || "").trim().toLowerCase();

const byEmail = async (email) => {
  const [row] = await db
    .select()
    .from(newsletterSubscribers)
    .where(sql`lower(${newsletterSubscribers.email}) = ${tidyEmail(email)}`)
    .limit(1);
  return row ?? null;
};

// Adds an address, or brings back one that had left. Returns what happened,
// for the caller's own use — never for telling the person who asked.
export async function subscribe(email, source = "footer") {
  const address = tidyEmail(email);
  if (!address || !address.includes("@")) return { ok: false, reason: "not an address" };

  const existing = await byEmail(address);

  if (!existing) {
    const [row] = await db
      .insert(newsletterSubscribers)
      .values({ email: address, source, token: newToken() })
      .returning();
    return { ok: true, state: "added", subscriber: row };
  }

  // Somebody who left and came back is welcome back.
  if (existing.status !== "subscribed") {
    const [row] = await db
      .update(newsletterSubscribers)
      .set({ status: "subscribed", unsubscribedAt: null, updatedAt: new Date() })
      .where(eq(newsletterSubscribers.id, existing.id))
      .returning();
    return { ok: true, state: "returned", subscriber: row };
  }

  return { ok: true, state: "already", subscriber: existing };
}

// Never lets a failure here break the thing that triggered it: somebody
// making an account must not be turned away because a list write failed.
export async function subscribeQuietly(app, email, source) {
  try {
    return await subscribe(email, source);
  } catch (error) {
    app?.log?.warn({ err: error }, "could not add to the newsletter");
    return { ok: false };
  }
}

export async function unsubscribeByToken(token) {
  if (!token) return null;

  const [row] = await db
    .update(newsletterSubscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date(), updatedAt: new Date() })
    .where(eq(newsletterSubscribers.token, String(token)))
    .returning();

  return row ?? null;
}

export const unsubscribeLink = (site, token) =>
  `${String(site).replace(/\/$/, "")}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
