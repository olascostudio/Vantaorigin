import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Art, TextLine } from "./Loading.jsx";
import { deletePost, getAdminPosts, publishPost, readableDate } from "../data/blog.js";

// The list of everything written, draft and published together, newest
// touched first. Writing happens on its own screen; this is for finding a
// post again and for the two decisions worth making from a list: whether it
// is out, and whether it should still exist.
export default function BlogPanel({ onTrouble }) {
  const [posts, setPosts] = useState(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState("");
  const [confirming, setConfirming] = useState("");

  const load = (status) =>
    getAdminPosts(status)
      .then((answer) => setPosts(answer.posts || []))
      .catch((error) => onTrouble?.(error.message));

  useEffect(() => {
    setPosts(null);
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const flip = async (post) => {
    setBusy(post.id);
    try {
      await publishPost(post.id, post.status !== "published");
      await load(filter);
    } catch (error) {
      onTrouble?.(error.message);
    } finally {
      setBusy("");
    }
  };

  const remove = async (post) => {
    setBusy(post.id);
    try {
      await deletePost(post.id);
      setConfirming("");
      await load(filter);
    } catch (error) {
      onTrouble?.(error.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {[
            ["", "Everything"],
            ["published", "Published"],
            ["draft", "Drafts"],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-full px-4 py-2 font-ui text-sm ${
                filter === value ? "bg-white text-black" : "bg-white/5 text-neutral-300 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Link
          to="/admin/blog/new"
          className="rounded-full bg-gradient-to-r from-[#7b3fe4] to-[#e0208c] px-6 py-2.5 font-ui text-sm font-bold text-white hover:opacity-90"
        >
          Write a post
        </Link>
      </div>

      {posts === null ? (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <TextLine key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="mt-10 text-center font-ui text-base text-neutral-400">
          {filter === "draft"
            ? "No drafts waiting."
            : filter === "published"
              ? "Nothing published yet."
              : "Nothing written yet. The first post starts with the button above."}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-nowrap"
            >
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[#1e2637]">
                {post.heroUrl ? (
                  <Art src={post.heroUrl} alt="" className="size-full object-cover" loading="lazy" />
                ) : (
                  <div className="size-full bg-gradient-to-br from-[#2b1a3d] to-[#141a27]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-ui text-base font-bold text-white">{post.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-ui text-xs text-neutral-400">
                  <span
                    className={
                      post.status === "published" ? "font-bold text-[#7ddc7d]" : "font-bold text-[#ffb4c4]"
                    }
                  >
                    {post.status === "published" ? "Published" : "Draft"}
                  </span>
                  {post.publishedAt && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{readableDate(post.publishedAt)}</span>
                    </>
                  )}
                  {post.category && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{post.category}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="truncate">/blog/{post.slug}</span>
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {post.status === "published" && (
                  <Link
                    to={`/blog/${post.slug}`}
                    className="rounded-full border border-white/25 px-4 py-1.5 font-ui text-sm text-neutral-300 hover:bg-white/10 hover:text-white"
                  >
                    View
                  </Link>
                )}
                <Link
                  to={`/admin/blog/${post.id}`}
                  className="rounded-full border border-white/25 px-4 py-1.5 font-ui text-sm text-white hover:bg-white/10"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => flip(post)}
                  disabled={busy === post.id}
                  className="rounded-full bg-white/10 px-4 py-1.5 font-ui text-sm text-white hover:bg-white/20 disabled:opacity-50"
                >
                  {post.status === "published" ? "Unpublish" : "Publish"}
                </button>

                {confirming === post.id ? (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => remove(post)}
                      disabled={busy === post.id}
                      className="rounded-full bg-[#f2415f] px-4 py-1.5 font-ui text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Delete for good
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming("")}
                      className="font-ui text-sm text-neutral-400 hover:text-white"
                    >
                      Keep
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(post.id)}
                    className="rounded-full px-3 py-1.5 font-ui text-sm text-neutral-400 hover:text-[#f2415f]"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
