// A creator's public page: everything a visitor may see about one creator,
// in a single request. Reuses the existing tables, with no new concepts.
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { categories, characterAssets, characters, highlights, users } from "../db/schema.js";
import { userByHandle } from "../db/handles.js";

// Every published character is read to count them and pick covers, so the
// read itself is bounded. Nine creators and twelve characters today: this is
// a guard against a runaway query, not a page size.
const PUBLISHED_CEILING = 5000;

export default async function creatorRoutes(app) {
  // Everybody with something published, for the browse page.
  //
  // Built from published characters rather than from the user table, so a
  // creator appears here the moment they publish and drops off if they
  // unpublish everything. Nobody who has not chosen to show anything is
  // listed, which is the point: this is a shelf of work, not a directory of
  // accounts.
  app.get("/public/creators", async (request) => {
    const asked = Number(request.query.limit);
    const limit = Number.isFinite(asked) && asked > 0 ? Math.min(Math.floor(asked), 120) : 60;

    const rows = await db
      .select({
        characterId: characters.id,
        slug: characters.slug,
        alias: characters.name,
        coverUrl: characters.coverUrl,
        createdAt: characters.createdAt,
        userId: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
      })
      .from(characters)
      .innerJoin(users, eq(users.id, characters.userId))
      .where(eq(characters.isPublic, true))
      .orderBy(desc(characters.createdAt))
      .limit(PUBLISHED_CEILING);

    // Grouped here rather than in SQL: the published set is small, and this
    // keeps it to one query instead of one per creator.
    const byCreator = new Map();
    for (const row of rows) {
      let creator = byCreator.get(row.userId);
      if (!creator) {
        creator = {
          username: row.username,
          name: [row.firstName, row.lastName].filter(Boolean).join(" ") || row.username,
          bio: row.bio,
          avatarUrl: row.avatarUrl,
          published: 0,
          // A few of their covers, so the card shows the work rather than
          // only describing it.
          characters: [],
          newest: row.createdAt,
        };
        byCreator.set(row.userId, creator);
      }
      creator.published += 1;
      if (creator.characters.length < 3) {
        creator.characters.push({
          id: row.characterId,
          slug: row.slug,
          alias: row.alias,
          coverUrl: row.coverUrl,
        });
      }
    }

    // Most recently active first, so the page moves as people publish.
    return [...byCreator.values()]
      .sort((a, b) => new Date(b.newest) - new Date(a.newest))
      .slice(0, limit)
      .map(({ newest, ...creator }) => creator);
  });

  app.get("/public/creators/:username", async (request, reply) => {
    // Written without the @, pasted with it, and typed in any capitals.
    const creator = await userByHandle(request.params.username);
    if (!creator) return reply.code(404).send({ error: "That page doesn't exist" });

    const published = await db
      .select()
      .from(characters)
      .where(and(eq(characters.userId, creator.id), eq(characters.isPublic, true)))
      .orderBy(desc(characters.createdAt));

    const withArtwork = await Promise.all(
      published.map(async (character) => ({
        ...character,
        assets: (
          await db
            .select()
            .from(characterAssets)
            .where(eq(characterAssets.characterId, character.id))
            .orderBy(asc(characterAssets.position))
        ).map((asset) => ({ id: asset.id, url: asset.url })),
      }))
    );

    // The categories a creator has filed their characters under. Only the
    // ones holding something published: a category whose characters are all
    // private would show a visitor an empty box and tell them nothing, while
    // still naming a project the creator has not announced.
    const filed = new Set(published.map((character) => character.categoryId).filter(Boolean));
    const groups = filed.size
      ? (
          await db
            .select({ id: categories.id, name: categories.name, position: categories.position })
            .from(categories)
            .where(eq(categories.userId, creator.id))
            .orderBy(asc(categories.position), asc(categories.createdAt))
        ).filter((group) => filed.has(group.id))
      : [];

    const posts = await db
      .select()
      .from(highlights)
      .where(eq(highlights.userId, creator.id))
      .orderBy(desc(highlights.createdAt))
      .limit(20);

    return {
      creator: {
        username: creator.username,
        name: [creator.firstName, creator.lastName].filter(Boolean).join(" ") || creator.username,
        bio: creator.bio,
        avatarUrl: creator.avatarUrl,
        bannerUrl: creator.bannerUrl,
      },
      categories: groups,
      characters: withArtwork,
      highlights: posts,
    };
  });
}
