// Blog pages for anything that does not run JavaScript.
//
// The app draws itself in the browser, so a crawler that runs no scripts sees
// an empty shell. Characters and creator pages already exist here as plain
// HTML for exactly that reason, and an article has more call for it than
// anything else on the site: it is the one page made entirely of writing,
// which is what the crawler came for.
//
// The body goes out whole rather than summarised. It was cleaned when it was
// stored, so there is nothing in it that needs holding back here.
import { desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { blogPosts, users } from "../db/schema.js";
import { postAtSlug, seoOf, toCard } from "../blog.js";
import { SITE, escape, page, summarise } from "./preview.js";

const BLOG_DESCRIPTION =
  "Writing from VantaOrigin: building characters, running a page, and the craft behind the worlds creators make.";

const isoDay = (value) => new Date(value).toISOString().slice(0, 10);

export default async function blogPreviewRoutes(app) {
  app.get("/preview/blog", async (request, reply) => {
    const rows = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(50);

    const canonical = `${SITE}/blog`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "The VantaOrigin blog",
      url: canonical,
      description: BLOG_DESCRIPTION,
      blogPost: rows.slice(0, 20).map((row) => ({
        "@type": "BlogPosting",
        headline: row.title,
        url: `${SITE}/blog/${row.slug}`,
        datePublished: row.publishedAt || undefined,
      })),
    };

    const items = rows
      .map((row) => {
        const summary = row.excerpt ? `: ${escape(summarise(row.excerpt, 160))}` : "";
        return `<li><a href="${SITE}/blog/${escape(row.slug)}">${escape(row.title)}</a>${summary}</li>`;
      })
      .join("");

    const body = [
      "<h1>The VantaOrigin blog</h1>",
      `<p>${escape(BLOG_DESCRIPTION)}</p>`,
      `<ul>${items}</ul>`,
    ].join("\n      ");

    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=300, s-maxage=3600")
      .send(
        page({
          title: "The VantaOrigin blog",
          description: BLOG_DESCRIPTION,
          canonical,
          jsonLd,
          body,
        })
      );
  });

  app.get("/preview/blog/:slug", async (request, reply) => {
    const found = await postAtSlug(request.params.slug);
    if (!found) {
      return reply.code(404).type("text/html; charset=utf-8").send("<h1>No such post</h1>");
    }

    // An address this post used to answer to. A crawler is told plainly that
    // it moved, rather than being handed the same writing at two addresses.
    if (found.movedFrom) {
      return reply.redirect(`${SITE}/blog/${found.post.slug}`, 301);
    }

    const post = found.post;
    const [writer] = post.authorId
      ? await db.select().from(users).where(eq(users.id, post.authorId)).limit(1)
      : [];

    const card = toCard(post, writer);
    const seo = seoOf(post);
    const canonical = seo.canonicalUrl || `${SITE}/blog/${post.slug}`;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: seo.metaTitle,
      description: seo.metaDescription,
      image: seo.ogImageUrl ? [seo.ogImageUrl] : undefined,
      datePublished: post.publishedAt || undefined,
      dateModified: post.updatedAt || post.publishedAt || undefined,
      author: { "@type": "Person", name: card.author.name },
      publisher: { "@type": "Organization", name: "VantaOrigin", url: SITE },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      keywords: seo.metaKeywords.length ? seo.metaKeywords.join(", ") : undefined,
    };

    const when = post.publishedAt
      ? ` on <time datetime="${new Date(post.publishedAt).toISOString()}">${isoDay(post.publishedAt)}</time>`
      : "";
    const howLong = post.readingMinutes ? `, ${post.readingMinutes} min read` : "";
    const hero = post.heroUrl ? `<img src="${escape(post.heroUrl)}" alt="" />` : "";

    const body = [
      "<article>",
      `  <h1>${escape(post.title)}</h1>`,
      `  <p>By ${escape(card.author.name)}${when}${howLong}</p>`,
      hero ? `  ${hero}` : "",
      `  ${post.body}`,
      `  <p><a href="${SITE}/blog">More from the VantaOrigin blog</a></p>`,
      "</article>",
    ]
      .filter(Boolean)
      .join("\n      ");

    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=300, s-maxage=3600")
      .send(
        page({
          title: seo.metaTitle,
          description: seo.metaDescription,
          canonical,
          image: seo.ogImageUrl || undefined,
          jsonLd,
          body,
        })
      );
  });
}
