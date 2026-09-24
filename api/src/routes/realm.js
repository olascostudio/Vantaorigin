// A creator's public Realm: everything a visitor may see about one creator,
// in a single request. Reuses the existing tables — no new concepts.
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { characterAssets, characters, highlights, users } from "../db/schema.js";

export default async function realmRoutes(app) {
  app.get("/public/realms/:username", async (request, reply) => {
    // Links are written without the @, and people paste them with it.
    const handle = request.params.username.replace(/^@+/, "").toLowerCase();

    const [creator] = await db.select().from(users).limit(1).where(eq(users.username, `@${handle}`));
    if (!creator) return reply.code(404).send({ error: "That Realm doesn't exist" });

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
      characters: withArtwork,
      highlights: posts,
    };
  });
}
