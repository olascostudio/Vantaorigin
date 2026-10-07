import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import { Art, Skeleton, TextLine } from "../components/Loading.jsx";
import { usePageMeta } from "../data/pageMeta";
import { getPostBySlug, getRelatedPosts, readableDate } from "../data/blog.js";

const SITE = "https://www.vantaorigin.com";

// The structured data a search engine reads. Built from the post rather than
// written by hand, so it cannot drift away from what the page actually says.
function useStructuredData(post) {
  useEffect(() => {
    if (!post) return undefined;

    const data = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.seo.metaTitle,
      description: post.seo.metaDescription,
      image: post.seo.ogImageUrl ? [post.seo.ogImageUrl] : undefined,
      datePublished: post.publishedAt || undefined,
      dateModified: post.updatedAt || post.publishedAt || undefined,
      author: { "@type": "Person", name: post.author.name },
      publisher: {
        "@type": "Organization",
        name: "VantaOrigin",
        url: SITE,
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": post.seo.canonicalUrl || `${SITE}/blog/${post.slug}`,
      },
      keywords: post.seo.metaKeywords.length ? post.seo.metaKeywords.join(", ") : undefined,
    };

    const tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.textContent = JSON.stringify(data);
    document.head.appendChild(tag);
    return () => tag.remove();
  }, [post]);
}

// Open Graph and Twitter tags, so a shared link shows the article rather than
// the site's front door.
//
// index.html already carries a set of these describing the site as a whole.
// Adding a second set leaves two of each in the head, and a crawler reading
// the first one would show "VantaOrigin: Your characters. One link." on every
// article anybody shared. So an existing tag is edited and put back as it
// was on the way out, and a new one is only made when there is none.
function useSharingTags(post) {
  useEffect(() => {
    if (!post) return undefined;

    const undo = [];
    const put = (attribute, key, content) => {
      if (!content) return;
      const existing = document.head.querySelector(`meta[${attribute}="${key}"]`);
      if (existing) {
        const was = existing.getAttribute("content");
        existing.setAttribute("content", content);
        undo.push(() => existing.setAttribute("content", was));
        return;
      }
      const tag = document.createElement("meta");
      tag.setAttribute(attribute, key);
      tag.setAttribute("content", content);
      document.head.appendChild(tag);
      undo.push(() => tag.remove());
    };

    put("property", "og:type", "article");
    put("property", "og:title", post.seo.metaTitle);
    put("property", "og:description", post.seo.metaDescription);
    put("property", "og:url", post.seo.canonicalUrl || `${SITE}/blog/${post.slug}`);
    put("property", "og:image", post.seo.ogImageUrl);
    put("name", "twitter:card", post.seo.ogImageUrl ? "summary_large_image" : "summary");
    put("name", "twitter:title", post.seo.metaTitle);
    put("name", "twitter:description", post.seo.metaDescription);
    put("name", "twitter:image", post.seo.ogImageUrl);

    return () => undo.forEach((put) => put());
  }, [post]);
}

function RelatedCard({ post }) {
  return (
    <article
      className="group flex flex-col overflow-hidden rounded-[18px] border bg-black/40"
      style={{ borderColor: post.heroAccent || "#fc187b" }}
    >
      <Link to={`/blog/${post.slug}`} className="block h-[140px] overflow-hidden bg-[#1e2637]">
        {post.heroUrl ? (
          <Art
            src={post.heroUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-[#2b1a3d] to-[#141a27]" />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-ui text-base font-bold leading-snug text-white">
          <Link to={`/blog/${post.slug}`} className="hover:opacity-90">
            {post.title}
          </Link>
        </h3>
        <p className="font-ui text-xs text-neutral-400">
          {post.readingMinutes} min read
        </p>
      </div>
    </article>
  );
}

function Loading() {
  return (
    <div className="mx-auto max-w-[820px] px-4 pb-20 pt-10 sm:px-8">
      <Skeleton className="h-[280px] w-full rounded-[24px]" />
      <TextLine className="mt-8 h-8 w-4/5" />
      <TextLine className="mt-3 h-8 w-3/5" />
      <TextLine className="mt-6 w-2/5" />
      <div className="mt-10 flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <TextLine key={index} className={index % 4 === 3 ? "w-3/5" : "w-full"} />
        ))}
      </div>
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [movedTo, setMovedTo] = useState("");
  const [missing, setMissing] = useState(false);

  usePageMeta({
    title: post?.seo.metaTitle,
    description: post?.seo.metaDescription,
    canonicalPath: post ? `/blog/${post.slug}` : undefined,
  });
  useStructuredData(post);
  useSharingTags(post);

  useEffect(() => {
    let current = true;
    setPost(null);
    setMissing(false);
    setMovedTo("");
    window.scrollTo(0, 0);

    getPostBySlug(slug)
      .then((answer) => {
        if (!current) return;
        // This address used to belong to the post and no longer does. Send
        // the reader to the one it lives at now.
        if (answer.movedFrom) {
          setMovedTo(answer.post.slug);
          return;
        }
        setPost(answer.post);
      })
      .catch(() => current && setMissing(true));

    getRelatedPosts(slug)
      .then((answer) => current && setRelated(answer.posts || []))
      .catch(() => current && setRelated([]));

    return () => {
      current = false;
    };
  }, [slug]);

  if (movedTo) return <Navigate to={`/blog/${movedTo}`} replace />;

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <DashboardNav active="Blog" />

      {missing ? (
        <main className="mx-auto max-w-[820px] px-4 py-24 text-center sm:px-8">
          <h1 className="font-ui text-3xl font-black text-white">No post at that address</h1>
          <p className="mt-4 font-ui text-base text-neutral-300">
            It may have been taken down, or the link may have a typo in it.
          </p>
          <Link
            to="/blog"
            className="mt-8 inline-block rounded-full bg-primary px-8 py-3 font-ui text-base font-bold text-white hover:opacity-90"
          >
            Back to the blog
          </Link>
        </main>
      ) : !post ? (
        <Loading />
      ) : (
        <main>
          <article className="mx-auto max-w-[820px] px-4 pb-16 pt-8 sm:px-8">
            <Link
              to="/blog"
              className="font-ui text-sm text-neutral-400 hover:text-white"
            >
              ← All posts
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {post.category && (
                <span
                  className="rounded-full px-3 py-1 font-ui text-xs font-bold uppercase tracking-[0.14em] text-black"
                  style={{ backgroundColor: post.heroAccent || "#fc187b" }}
                >
                  {post.category}
                </span>
              )}
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-white/25 px-3 py-1 font-ui text-xs text-neutral-300 hover:bg-white/10"
                >
                  {tag}
                </Link>
              ))}
            </div>

            <h1 className="mt-5 font-ui text-[32px] font-black leading-[1.1] text-white sm:text-[44px]">
              {post.title}
            </h1>

            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-sm text-neutral-400">
              <span className="text-white">{post.author.name}</span>
              {post.publishedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <time dateTime={post.publishedAt}>{readableDate(post.publishedAt)}</time>
                </>
              )}
              {post.readingMinutes > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{post.readingMinutes} min read</span>
                </>
              )}
            </p>

            {post.heroUrl && (
              <div
                className="mt-8 overflow-hidden rounded-[24px] border-[1.5px] bg-[#1e2637]"
                style={{ borderColor: post.heroAccent || "#fc187b" }}
              >
                <Art src={post.heroUrl} alt="" className="w-full object-cover" />
              </div>
            )}

            {/* The body is HTML written in the dashboard. It is cleaned on the
                server before it is ever stored, so what arrives here has
                already had anything that runs taken out of it. */}
            <div
              className="prose-article mt-10"
              dangerouslySetInnerHTML={{ __html: post.body }}
            />
          </article>

          {related.length > 0 && (
            <section className="mx-auto max-w-[1200px] px-4 pb-20 sm:px-8">
              <h2 className="font-ui text-xl font-bold text-white">Keep reading</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((other) => (
                  <RelatedCard key={other.id} post={other} />
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      <Footer />
    </div>
  );
}
