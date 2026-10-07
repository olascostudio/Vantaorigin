// Turning a character's name into the part of the address people read.
//
// "Urokojin: The Thunder Judge" becomes "urokojin-the-thunder-judge". Two
// characters may share a name, so the second one carries a short piece of its
// own id; nobody has to see that unless it is needed.
import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { characters } from "./schema.js";

export const slugify = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");

const taken = async (slug) => {
  const [row] = await db
    .select({ id: characters.id })
    .from(characters)
    .where(eq(characters.slug, slug))
    .limit(1);
  return Boolean(row);
};

// A name nobody can turn into letters, emoji or another script entirely,
// still needs an address, so it falls back to something unique.
export async function freeSlugFor(name) {
  const base = slugify(name) || "character";
  if (!(await taken(base))) return base;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 8)}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// Finds a character by either address: the readable one, or the id that was
// the only one there used to be.
export async function characterByIdOrSlug(idOrSlug) {
  const looksLikeId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

  const [row] = await db
    .select()
    .from(characters)
    .where(
      looksLikeId
        ? eq(characters.id, idOrSlug)
        : sql`lower(${characters.slug}) = ${String(idOrSlug).toLowerCase()}`
    )
    .limit(1);

  return row ?? null;
}
