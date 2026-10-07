// The blog: what everyone can read, and what only an admin can change.
//
// Reading is open and needs no account. Writing goes through the same
// ADMIN_EMAILS check the rest of the dashboard uses, so there is one answer
// to the question of who runs this site rather than a second one invented
// here.
import { z } from "zod";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { blogPosts, blogPostSlugs, users } from "../db/schema.js";
import { requireAdmin } from "./admin.js";
import { tellSearchEngines } from "../indexnow.js";
import {
  excerptFrom,
  freeBlogSlug,
  postAtSlug,
  readingMinutes,
  safeHtml,
  slugify,
  toCard,
  toPost,
} from "../blog.js";

const PAGE_SIZE = 12;

const postBody = z.object({
  title: z.string().min(1).max(160),
  slug: z.string().max(80).optional(),
  excerpt: z.string().max(400).optional(),
  body: z.string().max(400000).optional(),
  heroUrl: z.string().url().nullable().optional(),
  heroAccent: z.string().max(20).nullable().optional(),
  category: z.string().max(60).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  status: z.enum(["draft", "published"]).optional(),
  featured: z.boolean().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(400).optional(),
  metaKeywords: z.array(z.string().max(60)).max(30).optional(),
  canonicalUrl: z.string().url().or(z.literal("")).optional(),
  ogImageUrl: z.string().url().nullable().optional(),
});

// The writer, for the byline. One join rather than a query per card.
const writersFor = async (posts) => {
  const ids = [...new Set(posts.map((post) => post.authorId).filter(Boolean))];
  if (!ids.length) return new Map();
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(or(...ids.map((id) => eq(users.id, id))));
  return new Map(rows.map((row) => [row.id, row]));
};

export default async function blogRoutes(app) {
  // ---- what everyone can read -------------------------------------------

  app.get("/blog", async (request) => {
    const page = Math.max(1, Number(request.query.page) || 1);
    const category = String(request.query.category || "").trim();
    const tag = String(request.query.tag || "").trim();

    const filters = [eq(blogPosts.status, "published")];
    if (category) filters.push(sql`lower(blog_posts.category) = ${category.toLowerCase()}`);
    if (tag) filters.push(sql`blog_posts.tags @> ${JSON.stringify([tag])}::jsonb`);

    const where = and(...filters);

    const [counted] = await db
      .select({ count: sql`count(*)::int` })
      .from(blogPosts)
      .where(where);
    const total = counted?.count ?? 0;

    const rows = await db
      .select()
      .from(blogPosts)
      .where(where)
      .orderBy(desc(blogPosts.publishedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    const writers = await writersFor(rows);
    return {
      posts: rows.map((row) => toCard(row, writers.get(row.authorId))),
      page,
      pageSize: PAGE_SIZE,
      total,
      hasMore: page * PAGE_SIZE < total,
    };
  });

  // Every category and tag in use, for the filter row. Only from published
  // posts, so a draft cannot invent a category that opens onto nothing.
  app.get("/blog/meta", async () => {
    const rows = await db
      .select({ category: blogPosts.category, tags: blogPosts.tags })
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"));

    const categories = [...new Set(rows.map((row) => row.category).filter(Boolean))].sort();
    const tags = [
      ...new Set(rows.flatMap((row) => (Array.isArray(row.tags) ? row.tags : []))),
    ].sort();
    return { categories, tags };
  });

  app.get("/blog/:slug", async (request, reply) => {
    const found = await postAtSlug(request.params.slug);
    if (!found) return reply.code(404).send({ error: "No such post" });

    const writers = await writersFor([found.post]);
    return {
      post: toPost(found.post, writers.get(found.post.authorId)),
      // Set when the address used to belong to this post: the caller sends
      // the reader on to the current one rather than answering here.
      movedFrom: found.movedFrom,
    };
  });

  app.get("/blog/:slug/related", async (request, reply) => {
    const found = await postAtSlug(request.params.slug);
    if (!found) return reply.code(404).send({ error: "No such post" });

    const sameCategory = found.post.category
      ? await db
          .select()
          .from(blogPosts)
          .where(
            and(
              eq(blogPosts.status, "published"),
              ne(blogPosts.id, found.post.id),
              sql`lower(blog_posts.category) = ${found.post.category.toLowerCase()}`
            )
          )
          .orderBy(desc(blogPosts.publishedAt))
          .limit(3)
      : [];

    // Not enough in the same category to fill the row, so the newest other
    // posts make it up rather than leaving a gap.
    let rows = sameCategory;
    if (rows.length < 3) {
      const seen = new Set([found.post.id, ...rows.map((row) => row.id)]);
      const recent = await db
        .select()
        .from(blogPosts)
        .where(and(eq(blogPosts.status, "published"), ne(blogPosts.id, found.post.id)))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(6);
      rows = [...rows, ...recent.filter((row) => !seen.has(row.id))].slice(0, 3);
    }

    const writers = await writersFor(rows);
    return { posts: rows.map((row) => toCard(row, writers.get(row.authorId))) };
  });

  // ---- what only an admin can change -------------------------------------

  app.get("/admin/blog", { preHandler: requireAdmin() }, async (request) => {
    const status = String(request.query.status || "").trim();
    const where =
      status === "draft" || status === "published" ? eq(blogPosts.status, status) : undefined;

    const rows = await db
      .select()
      .from(blogPosts)
      .where(where)
      .orderBy(desc(blogPosts.updatedAt))
      .limit(200);

    const writers = await writersFor(rows);
    return { posts: rows.map((row) => toCard(row, writers.get(row.authorId))) };
  });

  app.get("/admin/blog/:id", { preHandler: requireAdmin() }, async (request, reply) => {
    const [row] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, request.params.id))
      .limit(1);
    if (!row) return reply.code(404).send({ error: "No such post" });
    const writers = await writersFor([row]);
    return { post: toPost(row, writers.get(row.authorId)) };
  });

  app.post("/admin/blog", { preHandler: requireAdmin() }, async (request, reply) => {
    const parsed = postBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Check the fields and try again" });
    const input = parsed.data;

    const body = safeHtml(input.body || "");
    const slug = await freeBlogSlug(input.slug || input.title);
    const publishing = input.status === "published";

    const [row] = await db
      .insert(blogPosts)
      .values({
        title: input.title,
        slug,
        excerpt: input.excerpt || excerptFrom(body),
        body,
        heroUrl: input.heroUrl ?? null,
        heroAccent: input.heroAccent ?? null,
        category: input.category || "",
        tags: input.tags || [],
        authorId: request.user.id,
        status: publishing ? "published" : "draft",
        featured: input.featured ?? false,
        publishedAt: publishing ? new Date() : null,
        readingMinutes: readingMinutes(body),
        metaTitle: input.metaTitle || "",
        metaDescription: input.metaDescription || "",
        metaKeywords: input.metaKeywords || [],
        canonicalUrl: input.canonicalUrl || "",
        ogImageUrl: input.ogImageUrl ?? null,
      })
      .returning();

    if (publishing) tellSearchEngines(app, { blogSlug: row.slug });
    return reply.code(201).send({ post: toPost(row, request.user) });
  });

  app.patch("/admin/blog/:id", { preHandler: requireAdmin() }, async (request, reply) => {
    const parsed = postBody.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Check the fields and try again" });
    const input = parsed.data;

    const [existing] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, request.params.id))
      .limit(1);
    if (!existing) return reply.code(404).send({ error: "No such post" });

    const patch = {};
    const set = (key, value) => {
      if (value !== undefined) patch[key] = value;
    };

    set("title", input.title);
    set("excerpt", input.excerpt);
    set("heroUrl", input.heroUrl);
    set("heroAccent", input.heroAccent);
    set("category", input.category);
    set("tags", input.tags);
    set("featured", input.featured);
    set("metaTitle", input.metaTitle);
    set("metaDescription", input.metaDescription);
    set("metaKeywords", input.metaKeywords);
    set("canonicalUrl", input.canonicalUrl);
    set("ogImageUrl", input.ogImageUrl);

    if (input.body !== undefined) {
      patch.body = safeHtml(input.body);
      patch.readingMinutes = readingMinutes(patch.body);
      if (!input.excerpt && !existing.excerpt) patch.excerpt = excerptFrom(patch.body);
    }

    // A new address for a post people may already have linked to. The old one
    // is kept and redirects, so nothing already shared breaks.
    if (input.slug !== undefined) {
      const wanted = slugify(input.slug);
      if (wanted && wanted !== existing.slug) {
        patch.slug = await freeBlogSlug(wanted, existing.id);
        if (existing.status === "published") {
          await db
            .insert(blogPostSlugs)
            .values({ slug: existing.slug, postId: existing.id })
            .onConflictDoNothing();
        }
      }
    }

    if (input.status !== undefined && input.status !== existing.status) {
      patch.status = input.status;
      // The date it first went out is the date it was published. Taking a
      // post down and putting it back does not make it new.
      if (input.status === "published" && !existing.publishedAt) patch.publishedAt = new Date();
    }
    if (input.publishedAt !== undefined) {
      patch.publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
    }

    patch.updatedAt = new Date();

    const [row] = await db
      .update(blogPosts)
      .set(patch)
      .where(eq(blogPosts.id, existing.id))
      .returning();

    if (row.status === "published") tellSearchEngines(app, { blogSlug: row.slug });
    const writers = await writersFor([row]);
    return { post: toPost(row, writers.get(row.authorId)) };
  });

  app.delete("/admin/blog/:id", { preHandler: requireAdmin() }, async (request, reply) => {
    const [row] = await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, request.params.id))
      .returning({ id: blogPosts.id });
    if (!row) return reply.code(404).send({ error: "No such post" });
    return { ok: true };
  });
}
