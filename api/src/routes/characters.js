// Categories and characters. Every query is filtered by the signed-in user,
// so ownership is enforced in the API, not by database rules that would not
// survive a move off a particular provider.
import { z } from "zod";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { categories, characterAssets, characterLikes, characters, users } from "../db/schema.js";
import { authenticate } from "../auth/auth.js";

const detailsSchema = z
  .object({
    core: z.object({ name: z.string(), description: z.string(), extras: z.array(z.any()) }).partial(),
    signature: z.object({ name: z.string(), description: z.string() }).partial(),
    weakness: z.object({ name: z.string(), description: z.string() }).partial(),
    alignment: z.object({ name: z.string(), description: z.string() }).partial(),
    stats: z.array(
      z.object({ attribute: z.string(), level: z.number().min(1).max(10), note: z.string() })
    ),
  })
  .partial();

const characterBody = z.object({
  name: z.string().min(1).max(80),
  categoryId: z.string().uuid().nullable().optional(),
  realm: z.string().max(80).optional(),
  tagline: z.string().max(120).optional(),
  backstory: z.string().max(4000).optional(),
  power: z.string().max(20).optional(),
  coverUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  details: detailsSchema.optional(),
});

const assetsFor = async (characterId) =>
  (
    await db
      .select()
      .from(characterAssets)
      .where(eq(characterAssets.characterId, characterId))
      .orderBy(asc(characterAssets.position))
  ).map((asset) => ({ id: asset.id, url: asset.url }));

// How many people liked each of these characters, and whether this viewer is
// one of them. Two queries whatever the number of characters, so a long page
// costs the same as a short one.
async function likeInfo(ids, viewerId) {
  const info = new Map(ids.map((id) => [id, { likes: 0, liked: false }]));
  if (!ids.length) return info;

  const counts = await db
    .select({ characterId: characterLikes.characterId, total: sql`count(*)::int` })
    .from(characterLikes)
    .where(inArray(characterLikes.characterId, ids))
    .groupBy(characterLikes.characterId);
  for (const row of counts) {
    info.get(row.characterId).likes = Number(row.total);
  }

  if (viewerId) {
    const mine = await db
      .select({ characterId: characterLikes.characterId })
      .from(characterLikes)
      .where(and(eq(characterLikes.userId, viewerId), inArray(characterLikes.characterId, ids)));
    for (const row of mine) {
      info.get(row.characterId).liked = true;
    }
  }

  return info;
}

// A character as the pages read it: its artwork and its likes alongside it.
async function decorate(rows, viewerId) {
  const info = await likeInfo(
    rows.map((row) => row.id),
    viewerId
  );
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      assets: await assetsFor(row.id),
      ...info.get(row.id),
    }))
  );
}

const decorateOne = async (row, viewerId) => (await decorate([row], viewerId))[0];

// Loads a character the signed-in user owns, or null.
async function ownedCharacter(userId, id) {
  const [row] = await db
    .select()
    .from(characters)
    .where(and(eq(characters.id, id), eq(characters.userId, userId)))
    .limit(1);
  return row ?? null;
}

export default async function characterRoutes(app) {
  // ---- the creator's own library ----
  app.get("/categories", { preHandler: authenticate() }, async (request) =>
    db
      .select()
      .from(categories)
      .where(eq(categories.userId, request.user.id))
      .orderBy(asc(categories.position), asc(categories.createdAt))
  );

  app.post("/categories", { preHandler: authenticate() }, async (request, reply) => {
    const { name } = z.object({ name: z.string().min(1).max(60) }).parse(request.body);
    const [category] = await db
      .insert(categories)
      .values({ userId: request.user.id, name: name.trim() })
      .returning();
    return reply.code(201).send(category);
  });

  app.delete("/categories/:id", { preHandler: authenticate() }, async (request, reply) => {
    await db
      .delete(categories)
      .where(and(eq(categories.id, request.params.id), eq(categories.userId, request.user.id)));
    return reply.code(204).send();
  });

  app.get("/characters", { preHandler: authenticate() }, async (request) => {
    const rows = await db
      .select()
      .from(characters)
      .where(eq(characters.userId, request.user.id))
      .orderBy(desc(characters.createdAt));
    return decorate(rows, request.user.id);
  });

  app.post("/characters", { preHandler: authenticate() }, async (request, reply) => {
    const body = characterBody.parse(request.body);
    const [character] = await db
      .insert(characters)
      .values({ ...body, userId: request.user.id })
      .returning();
    return reply.code(201).send(await decorateOne(character, request.user.id));
  });

  app.patch("/characters/:id", { preHandler: authenticate() }, async (request, reply) => {
    const body = characterBody.partial().parse(request.body);
    const [character] = await db
      .update(characters)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(characters.id, request.params.id), eq(characters.userId, request.user.id)))
      .returning();

    if (!character) return reply.code(404).send({ error: "Character not found" });
    return decorateOne(character, request.user.id);
  });

  app.delete("/characters/:id", { preHandler: authenticate() }, async (request, reply) => {
    await db
      .delete(characters)
      .where(and(eq(characters.id, request.params.id), eq(characters.userId, request.user.id)));
    return reply.code(204).send();
  });

  app.post("/characters/:id/assets", { preHandler: authenticate() }, async (request, reply) => {
    const { url } = z.object({ url: z.string() }).parse(request.body);
    if (!(await ownedCharacter(request.user.id, request.params.id))) {
      return reply.code(404).send({ error: "Character not found" });
    }
    const [asset] = await db
      .insert(characterAssets)
      .values({ characterId: request.params.id, url })
      .returning();
    return reply.code(201).send(asset);
  });

  app.delete("/assets/:id", { preHandler: authenticate() }, async (request, reply) => {
    const [asset] = await db
      .select({ characterId: characterAssets.characterId })
      .from(characterAssets)
      .where(eq(characterAssets.id, request.params.id))
      .limit(1);

    if (asset && (await ownedCharacter(request.user.id, asset.characterId))) {
      await db.delete(characterAssets).where(eq(characterAssets.id, request.params.id));
    }
    return reply.code(204).send();
  });

  // ---- likes ----
  // Signing in is required, so the number under a character stands for that
  // many people. Liking your own work would not, so it is turned away.
  const likeable = async (request, reply) => {
    const [character] = await db
      .select()
      .from(characters)
      .where(eq(characters.id, request.params.id))
      .limit(1);

    if (!character || !character.isPublic) {
      reply.code(404).send({ error: "Character not found" });
      return null;
    }
    if (character.userId === request.user.id) {
      reply.code(400).send({ error: "You cannot like your own character" });
      return null;
    }
    return character;
  };

  const likeState = async (characterId, viewerId) =>
    (await likeInfo([characterId], viewerId)).get(characterId);

  app.post("/characters/:id/like", { preHandler: authenticate() }, async (request, reply) => {
    const character = await likeable(request, reply);
    if (!character) return reply;

    await db
      .insert(characterLikes)
      .values({ characterId: character.id, userId: request.user.id })
      .onConflictDoNothing();

    return likeState(character.id, request.user.id);
  });

  app.delete("/characters/:id/like", { preHandler: authenticate() }, async (request, reply) => {
    const character = await likeable(request, reply);
    if (!character) return reply;

    await db
      .delete(characterLikes)
      .where(
        and(eq(characterLikes.characterId, character.id), eq(characterLikes.userId, request.user.id))
      );

    return likeState(character.id, request.user.id);
  });

  // ---- what visitors can see, no sign-in needed ----
  // A visitor who happens to be signed in also learns which of these they
  // have already liked, so the sword can show as pressed.
  app.get(
    "/public/characters",
    { preHandler: authenticate({ required: false }) },
    async (request) => {
      const limit = Math.min(Number(request.query.limit) || 24, 60);
      const rows = await db
        .select({
          character: characters,
          creator: { username: users.username, avatarUrl: users.avatarUrl },
        })
        .from(characters)
        .innerJoin(users, eq(users.id, characters.userId))
        .where(eq(characters.isPublic, true))
        .orderBy(desc(characters.createdAt))
        .limit(limit);

      const decorated = await decorate(
        rows.map((row) => row.character),
        request.user?.id
      );
      return decorated.map((character, index) => ({ ...character, creator: rows[index].creator }));
    }
  );

  app.get(
    "/public/characters/:id",
    { preHandler: authenticate({ required: false }) },
    async (request, reply) => {
      const [row] = await db
        .select({
          character: characters,
          creator: { username: users.username, avatarUrl: users.avatarUrl },
        })
        .from(characters)
        .innerJoin(users, eq(users.id, characters.userId))
        .where(and(eq(characters.id, request.params.id), eq(characters.isPublic, true)))
        .limit(1);

      if (!row) return reply.code(404).send({ error: "Character not found" });
      return { ...(await decorateOne(row.character, request.user?.id)), creator: row.creator };
    }
  );
}
