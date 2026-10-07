import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import { Art, CardGridSkeleton } from "../components/Loading.jsx";
import { usePageMeta } from "../data/pageMeta";
import { getBlogMeta, getPublishedPosts, readableDate } from "../data/blog.js";

// Every card is trimmed in the colour of its own hero picture, the way the
// character cards are. A post with no picture yet falls back to the brand
// pink rather than to grey.
const trim = (post) => post.heroAccent || "#fc187b";

function Meta({ post, className = "" }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-sm text-neutral-400 ${className}`}>
      <span>{post.author.name}</span>
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
  );
}

// The newest post, given the room it deserves. On a phone it stacks; on a
// wide screen the picture takes half and the words take the other half.
function Lead({ post }) {
  return (
    <article
      className="group overflow-hidden rounded-[28px] border-[1.5px] bg-black/40 lg:grid lg:grid-cols-2"
      style={{ borderColor: trim(post) }}
    >
      <Link to={`/blog/${post.slug}`} className="block h-[240px] overflow-hidden bg-[#1e2637] sm:h-[320px] lg:h-full lg:min-h-[380px]">
        {post.heroUrl ? (
          <Art
            src={post.heroUrl}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-[#2b1a3d] to-[#141a27]" />
        )}
      </Link>

      <div className="flex flex-col justify-center gap-4 p-6 sm:p-9">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-3 py-1 font-ui text-xs font-bold uppercase tracking-[0.14em] text-black"
            style={{ backgroundColor: trim(post) }}
          >
            Latest
          </span>
          {post.category && (
            <span className="rounded-full border border-white/25 px-3 py-1 font-ui text-xs text-neutral-300">
              {post.category}
            </span>
          )}
        </div>

        <h2 className="font-ui text-[26px] font-black leading-[1.15] text-white sm:text-[34px]">
          <Link to={`/blog/${post.slug}`} className="hover:opacity-90">
            {post.title}
          </Link>
        </h2>

        <p className="font-ui text-base leading-relaxed text-neutral-300 sm:text-lg">{post.excerpt}</p>
        <Meta post={post} />

        <Link
          to={`/blog/${post.slug}`}
          className="mt-1 w-fit rounded-full px-6 py-2.5 font-ui text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: trim(post) }}
        >
          Read it
        </Link>
      </div>
    </article>
  );
}

function PostCard({ post }) {
  return (
    <article
      className="group flex flex-col overflow-hidden rounded-[22px] border-[1.5px] bg-black/40"
      style={{ borderColor: trim(post) }}
    >
      <Link to={`/blog/${post.slug}`} className="block h-[190px] overflow-hidden bg-[#1e2637]">
        {post.heroUrl ? (
          <Art
            src={post.heroUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-[#2b1a3d] to-[#141a27]" />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {post.category && (
          <span
            className="w-fit font-ui text-xs font-bold uppercase tracking-[0.14em]"
            style={{ color: trim(post) }}
          >
            {post.category}
          </span>
        )}

        <h3 className="font-ui text-xl font-bold leading-snug text-white">
          <Link to={`/blog/${post.slug}`} className="hover:opacity-90">
            {post.title}
          </Link>
        </h3>

        <p className="line-clamp-3 flex-1 font-ui text-sm leading-relaxed text-neutral-300">
          {post.excerpt}
        </p>

        <Meta post={post} className="mt-1" />
      </div>
    </article>
  );
}

export default function Blog() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";

  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [problem, setProblem] = useState("");

  usePageMeta({
    title: category ? `${category} | VantaOrigin Blog` : "Blog | VantaOrigin",
    description:
      "Writing from VantaOrigin: building characters, running a page, and the craft behind the worlds creators make.",
    canonicalPath: "/blog",
  });

  useEffect(() => {
    getBlogMeta()
      .then((meta) => setCategories(meta.categories || []))
      .catch(() => setCategories([]));
  }, []);

  // A changed filter starts the list again rather than adding to it.
  useEffect(() => {
    let current = true;
    setLoading(true);
    setProblem("");

    getPublishedPosts({ page: 1, category })
      .then((answer) => {
        if (!current) return;
        setPosts(answer.posts || []);
        setHasMore(Boolean(answer.hasMore));
        setPage(1);
      })
      .catch(() => current && setProblem("The writing would not load. Try again in a moment."))
      .finally(() => current && setLoading(false));

    return () => {
      current = false;
    };
  }, [category]);

  const more = async () => {
    try {
      const answer = await getPublishedPosts({ page: page + 1, category });
      setPosts((shown) => [...shown, ...(answer.posts || [])]);
      setHasMore(Boolean(answer.hasMore));
      setPage((was) => was + 1);
    } catch {
      setProblem("That would not load. Try again in a moment.");
    }
  };

  const pick = (wanted) => {
    const next = new URLSearchParams(params);
    if (wanted) next.set("category", wanted);
    else next.delete("category");
    setParams(next, { replace: true });
  };

  const [lead, ...rest] = posts;

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <DashboardNav active="Blog" />

      <main className="mx-auto max-w-[1200px] px-4 pb-20 pt-10 sm:px-8">
        <header className="flex flex-col gap-3">
          <p className="font-ui text-sm font-bold uppercase tracking-[0.2em] text-primary">
            The VantaOrigin blog
          </p>
          <h1 className="font-ui text-[34px] font-black leading-[1.08] text-white sm:text-[48px]">
            Notes from the worlds
            <br className="hidden sm:block" /> people are building
          </h1>
          <p className="max-w-[640px] font-ui text-base text-neutral-300 sm:text-lg">
            Craft, process and the occasional opinion, from the team and the creators using it.
          </p>
        </header>

        {categories.length > 0 && (
          <nav aria-label="Categories" className="scrollbar-none mt-8 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => pick("")}
              aria-current={!category || undefined}
              className={`shrink-0 rounded-full border px-4 py-2 font-ui text-sm transition-colors ${
                category
                  ? "border-white/25 text-neutral-300 hover:bg-white/10"
                  : "border-primary bg-primary font-bold text-white"
              }`}
            >
              Everything
            </button>
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => pick(name)}
                aria-current={category === name || undefined}
                className={`shrink-0 rounded-full border px-4 py-2 font-ui text-sm transition-colors ${
                  category === name
                    ? "border-primary bg-primary font-bold text-white"
                    : "border-white/25 text-neutral-300 hover:bg-white/10"
                }`}
              >
                {name}
              </button>
            ))}
          </nav>
        )}

        {problem && (
          <p role="alert" className="mt-8 font-ui text-base text-[#f2415f]">
            {problem}
          </p>
        )}

        {loading ? (
          <CardGridSkeleton count={6} className="mt-10" />
        ) : posts.length === 0 ? (
          <p className="mt-16 text-center font-ui text-lg text-neutral-400">
            {category ? `Nothing filed under ${category} yet.` : "The first post is still being written."}
          </p>
        ) : (
          <>
            <div className="mt-10">
              <Lead post={lead} />
            </div>

            {rest.length > 0 && (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button
                  type="button"
                  onClick={more}
                  className="rounded-full border border-white/25 px-10 py-3 font-ui text-base text-white hover:bg-white/10"
                >
                  Show more
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
