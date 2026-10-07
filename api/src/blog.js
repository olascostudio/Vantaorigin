// What a blog post is, away from any particular route.
//
// Two shapes go out. A card, for the listing, which leaves out the body
// because an article's worth of HTML has no business in a list of twelve.
// And the whole post, for the article page.
//
// The SEO fields are allowed to be empty, and empty means "use the real
// thing". That is resolved here rather than in the browser, so the page, the
// crawler's copy and the structured data cannot disagree with each other.
import { eq, ne, and, sql } from "drizzle-orm";
import { db } from "./db/client.js";
import { blogPosts, blogPostSlugs } from "./db/schema.js";
import { slugify } from "./db/slugs.js";
import { readingMinutes, safeHtml, textOf } from "./html.js";

export { readingMinutes, safeHtml, slugify };

const taken = async (slug, exceptId) => {
  const [live] = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(exceptId ? and(eq(blogPosts.slug, slug), ne(blogPosts.id, exceptId)) : eq(blogPosts.slug, slug))
    .limit(1);
  if (live) return true;

  // An address a post used to have is still spoken for: it is redirecting
  // somewhere, and handing it to a second post would break that.
  const [old] = await db
    .select({ slug: blogPostSlugs.slug })
    .from(blogPostSlugs)
    .where(
      exceptId
        ? and(eq(blogPostSlugs.slug, slug), ne(blogPostSlugs.postId, exceptId))
        : eq(blogPostSlugs.slug, slug)
    )
    .limit(1);
  return Boolean(old);
};

// A title nobody can turn into letters still needs an address.
export async function freeBlogSlug(wanted, exceptId) {
  const base = slugify(wanted) || "post";
  if (!(await taken(base, exceptId))) return base;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    if (!(await taken(candidate, exceptId))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// A summary somebody did not write: the opening of the article, cut at a word.
export const excerptFrom = (body, limit = 180) => {
  const words = textOf(body);
  if (words.length <= limit) return words;
  const cut = words.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" ")).trimEnd()}…`;
};

const tagList = (value) => (Array.isArray(value) ? value.filter(Boolean).map(String) : []);

// What search engines and link previews are told. Falls back field by field,
// so filling in one of them does not mean filling in all of them.
export const seoOf = (post) => ({
  metaTitle: post.metaTitle || post.title,
  metaDescription: post.metaDescription || post.excerpt || excerptFrom(post.body),
  metaKeywords: tagList(post.metaKeywords),
  canonicalUrl: post.canonicalUrl || "",
  ogImageUrl: post.ogImageUrl || post.heroUrl || null,
});

const author = (writer) => {
  const full = [writer?.firstName, writer?.lastName].filter(Boolean).join(" ").trim();
  return {
    name: full || writer?.username || "VantaOrigin",
    username: writer?.username || null,
    avatarUrl: writer?.avatarUrl || null,
  };
};

export const toCard = (post, writer) => ({
  id: post.id,
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt || excerptFrom(post.body),
  heroUrl: post.heroUrl,
  heroAccent: post.heroAccent,
  category: post.category,
  tags: tagList(post.tags),
  featured: post.featured,
  status: post.status,
  publishedAt: post.publishedAt,
  readingMinutes: post.readingMinutes,
  author: author(writer),
});

export const toPost = (post, writer) => ({
  ...toCard(post, writer),
  body: post.body,
  canonical: post.canonicalUrl || "",
  seo: seoOf(post),
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
});

// The post at an address, whether that address is the current one or one it
// used to answer to. `movedFrom` tells the caller to send a redirect.
export async function postAtSlug(slug, { publishedOnly = true } = {}) {
  const wanted = String(slug || "").toLowerCase();

  const [live] = await db
    .select()
    .from(blogPosts)
    .where(sql`lower(blog_posts.slug) = ${wanted}`)
    .limit(1);
  if (live) {
    if (publishedOnly && live.status !== "published") return null;
    return { post: live, movedFrom: null };
  }

  const [old] = await db
    .select({ postId: blogPostSlugs.postId })
    .from(blogPostSlugs)
    .where(sql`lower(blog_post_slugs.slug) = ${wanted}`)
    .limit(1);
  if (!old) return null;

  const [moved] = await db.select().from(blogPosts).where(eq(blogPosts.id, old.postId)).limit(1);
  if (!moved) return null;
  if (publishedOnly && moved.status !== "published") return null;
  return { post: moved, movedFrom: wanted };
}
