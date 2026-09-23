// Highlight posts: the creator's feed on the Creator hub.
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { highlights, users } from "../db/schema.js";
import { authenticate } from "../auth/auth.js";

const postBody = z.object({
  title: z.string().max(200).default(""),
  content: z.string().max(5000).default(""),
  images: z.array(z.string()).max(10).default([]),
});

// What the feed shows next to a post.
const author = (user) => ({
  username: user.username,
  name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username,
  avatarUrl: user.avatarUrl,
});

export default async function highlightRoutes(app) {
  app.get("/highlights", { preHandler: authenticate() }, async (request) => {
    const rows = await db
      .select()
      .from(highlights)
      .where(eq(highlights.userId, request.user.id))
      .orderBy(desc(highlights.createdAt));

    return rows.map((row) => ({ ...row, author: author(request.user) }));
  });

  app.post("/highlights", { preHandler: authenticate() }, async (request, reply) => {
    const body = postBody.parse(request.body);
    const [row] = await db
      .insert(highlights)
      .values({ ...body, userId: request.user.id })
      .returning();

    return reply.code(201).send({ ...row, author: author(request.user) });
  });

  app.patch("/highlights/:id", { preHandler: authenticate() }, async (request, reply) => {
    const body = postBody.partial().parse(request.body);
    const [row] = await db
      .update(highlights)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(highlights.id, request.params.id), eq(highlights.userId, request.user.id)))
      .returning();

    if (!row) return reply.code(404).send({ error: "Post not found" });
    return { ...row, author: author(request.user) };
  });

  app.delete("/highlights/:id", { preHandler: authenticate() }, async (request, reply) => {
    await db
      .delete(highlights)
      .where(and(eq(highlights.id, request.params.id), eq(highlights.userId, request.user.id)));
    return reply.code(204).send();
  });

  // The public feed: everyone's posts, newest first.
  app.get("/public/highlights", async (request) => {
    const limit = Math.min(Number(request.query.limit) || 20, 50);
    const rows = await db
      .select({ post: highlights, creator: users })
      .from(highlights)
      .innerJoin(users, eq(users.id, highlights.userId))
      .orderBy(desc(highlights.createdAt))
      .limit(limit);

    return rows.map(({ post, creator }) => ({ ...post, author: author(creator) }));
  });
}
