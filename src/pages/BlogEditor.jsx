import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import { Art, TextLine } from "../components/Loading.jsx";
import {
  createPost,
  getAdminPost,
  slugify,
  updatePost,
  uploadBlogImage,
} from "../data/blog.js";

// The editor is a few hundred kilobytes of TinyMCE. Loading it here rather
// than importing it at the top keeps it out of every other page's bundle,
// including the blog people actually read.
const RichText = lazy(() => import("../components/RichText.jsx"));

const SITE = "vantaorigin.com";

// What search engines will show before they start cutting. These are not
// rules, which is why going over colours the counter rather than blocking.
const TITLE_BEST = 60;
const DESCRIPTION_BEST = 160;

const BLANK = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  heroUrl: null,
  heroAccent: null,
  category: "",
  tags: [],
  status: "draft",
  featured: false,
  metaTitle: "",
  metaDescription: "",
  metaKeywords: [],
  canonicalUrl: "",
  ogImageUrl: null,
};

const field =
  "w-full rounded-xl border border-white/15 bg-[#141a27] px-4 py-2.5 font-ui text-base text-white placeholder:text-neutral-500 focus:border-primary focus:outline-none";

function Counter({ value, best }) {
  const length = value.length;
  const tone = !length
    ? "text-neutral-500"
    : length > best
      ? "text-[#ffb4c4]"
      : length > best * 0.6
        ? "text-[#7ddc7d]"
        : "text-neutral-400";
  return (
    <span className={`font-ui text-xs ${tone}`}>
      {length}/{best}
      {length > best ? " · search may cut this" : ""}
    </span>
  );
}

function Panel({ title, note, children }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="font-ui text-sm font-bold uppercase tracking-[0.14em] text-neutral-300">
        {title}
      </h2>
      {note && <p className="mt-1 font-ui text-xs text-neutral-500">{note}</p>}
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

// Type a word, press Enter or comma. Used for both kinds of tag, which are
// not the same thing: one organises the blog, the other is for search.
function TagInput({ values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const add = (text) => {
    const wanted = text.trim().replace(/,$/, "");
    if (!wanted || values.includes(wanted)) return setDraft("");
    onChange([...values, wanted]);
    setDraft("");
  };

  return (
    <div>
      <input
        value={draft}
        onChange={(event) => {
          const text = event.target.value;
          if (text.endsWith(",")) add(text);
          else setDraft(text);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add(draft);
          }
          if (event.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={placeholder}
        className={field}
      />
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              key={value}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 font-ui text-sm text-white"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((one) => one !== value))}
                aria-label={`Remove ${value}`}
                className="text-neutral-400 hover:text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PicturePicker({ url, onPicked, onCleared, label }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  const take = async (file) => {
    if (!file) return;
    setBusy(true);
    setProblem("");
    try {
      const answer = await uploadBlogImage(file);
      onPicked(answer);
    } catch (error) {
      setProblem(error.message || "That picture would not upload");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {url ? (
        <div className="overflow-hidden rounded-xl border border-white/15">
          <Art src={url} alt="" className="h-40 w-full object-cover" />
          <div className="flex items-center justify-between bg-[#141a27] px-3 py-2">
            <span className="font-ui text-xs text-neutral-400">{label} set</span>
            <button
              type="button"
              onClick={onCleared}
              className="font-ui text-xs text-neutral-400 hover:text-[#f2415f]"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 bg-[#141a27] text-center hover:border-primary">
          <span className="font-ui text-sm text-neutral-300">
            {busy ? "Uploading…" : `Click or drop ${label.toLowerCase()}`}
          </span>
          <span className="font-ui text-xs text-neutral-500">JPG, PNG, WEBP or GIF</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => take(event.target.files?.[0])}
          />
        </label>
      )}
      {problem && (
        <p role="alert" className="mt-2 font-ui text-xs text-[#f2415f]">
          {problem}
        </p>
      )}
    </div>
  );
}

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const making = !id || id === "new";

  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(!making);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [postId, setPostId] = useState(making ? null : id);

  // The slug follows the title until somebody types their own, and then it
  // stops following, because it is theirs now.
  const slugTouched = useRef(false);

  const set = (key) => (value) => setForm((was) => ({ ...was, [key]: value }));

  useEffect(() => {
    if (making) return;
    getAdminPost(id)
      .then(({ post }) => {
        slugTouched.current = true;
        setForm({
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt || "",
          body: post.body || "",
          heroUrl: post.heroUrl,
          heroAccent: post.heroAccent,
          category: post.category || "",
          tags: post.tags || [],
          status: post.status,
          featured: post.featured,
          metaTitle: post.seo.metaTitle === post.title ? "" : post.seo.metaTitle,
          metaDescription:
            post.seo.metaDescription === post.excerpt ? "" : post.seo.metaDescription,
          metaKeywords: post.seo.metaKeywords || [],
          canonicalUrl: post.canonical || "",
          ogImageUrl: post.seo.ogImageUrl === post.heroUrl ? null : post.seo.ogImageUrl,
        });
      })
      .catch((error) => setProblem(error.message))
      .finally(() => setLoading(false));
  }, [id, making]);

  const slug = form.slug || slugify(form.title);

  const save = async ({ publish } = {}) => {
    if (!form.title.trim()) {
      setProblem("A post needs a title before it can be saved.");
      return null;
    }

    setSaving(true);
    setProblem("");
    try {
      const payload = {
        title: form.title.trim(),
        slug: slug || undefined,
        excerpt: form.excerpt,
        body: form.body,
        heroUrl: form.heroUrl,
        heroAccent: form.heroAccent,
        category: form.category,
        tags: form.tags,
        featured: form.featured,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        metaKeywords: form.metaKeywords,
        canonicalUrl: form.canonicalUrl,
        ogImageUrl: form.ogImageUrl,
      };
      if (publish !== undefined) payload.status = publish ? "published" : "draft";

      const answer = postId
        ? await updatePost(postId, payload)
        : await createPost({ ...payload, status: publish ? "published" : "draft" });

      const post = answer.post;
      setPostId(post.id);
      setForm((was) => ({ ...was, slug: post.slug, status: post.status }));
      setSavedAt(new Date());
      if (making) navigate(`/admin/blog/${post.id}`, { replace: true });
      return post;
    } catch (error) {
      setProblem(error.message || "That would not save");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const previewTitle = form.metaTitle || form.title || "Your post title here";
  const previewDescription =
    form.metaDescription ||
    form.excerpt ||
    "Your meta description will appear here, or the opening of the article if you leave it empty.";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1b2233]">
        <DashboardNav active="Admin" />
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <TextLine className="h-10 w-1/2" />
          <TextLine className="mt-6 h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav active="Admin" />

      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/admin" state={{ tab: "Blog" }} className="font-ui text-sm text-neutral-400 hover:text-white">
            ← Back to the dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {savedAt && (
              <span className="font-ui text-xs text-neutral-400">
                Saved {savedAt.toLocaleTimeString()}
              </span>
            )}
            <button
              type="button"
              onClick={() => save({})}
              disabled={saving}
              className="rounded-full border border-white/25 px-6 py-2.5 font-ui text-sm text-white hover:bg-white/10 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {form.status === "published" ? (
              <>
                <Link
                  to={`/blog/${slug}`}
                  className="rounded-full border border-white/25 px-6 py-2.5 font-ui text-sm text-white hover:bg-white/10"
                >
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => save({ publish: false })}
                  disabled={saving}
                  className="rounded-full bg-white/10 px-6 py-2.5 font-ui text-sm font-bold text-white hover:bg-white/20 disabled:opacity-50"
                >
                  Move to draft
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => save({ publish: true })}
                disabled={saving}
                className="rounded-full bg-gradient-to-r from-[#7b3fe4] to-[#e0208c] px-7 py-2.5 font-ui text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                Publish
              </button>
            )}
          </div>
        </div>

        {problem && (
          <p role="alert" className="mt-4 font-ui text-base text-[#f2415f]">
            {problem}
          </p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ---- what the post says ---- */}
          <div className="flex flex-col gap-6">
            <div>
              <input
                value={form.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setForm((was) => ({
                    ...was,
                    title,
                    slug: slugTouched.current ? was.slug : slugify(title),
                  }));
                }}
                placeholder="Give your post a title…"
                aria-label="Post title"
                className="w-full bg-transparent font-ui text-[30px] font-black text-white placeholder:text-neutral-600 focus:outline-none sm:text-[38px]"
              />
              <p className="mt-2 flex flex-wrap items-center gap-1 font-ui text-sm text-neutral-500">
                <span>{SITE}/blog/</span>
                <input
                  value={form.slug}
                  onChange={(event) => {
                    slugTouched.current = true;
                    set("slug")(slugify(event.target.value));
                  }}
                  placeholder="your-post-slug"
                  aria-label="URL slug"
                  className="min-w-[160px] flex-1 rounded border-0 bg-white/5 px-2 py-1 font-ui text-sm text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </p>
              {!making && form.status === "published" && (
                <p className="mt-1 font-ui text-xs text-neutral-500">
                  Changing this keeps the old address working: it redirects here.
                </p>
              )}
            </div>

            <section className="rounded-2xl border border-white/10 bg-[#0f1420] p-1.5">
              <Suspense
                fallback={
                  <div className="flex h-[560px] items-center justify-center font-ui text-sm text-neutral-400">
                    Getting the editor ready…
                  </div>
                }
              >
                <RichText
                  value={form.body}
                  onChange={set("body")}
                  folder="blog"
                  placeholder="Write the article. Pictures can be dropped straight in."
                />
              </Suspense>
            </section>

            <Panel
              title="Summary"
              note="Shown on the blog listing and used for search when you have not written a meta description. Left empty, the opening of the article stands in."
            >
              <textarea
                value={form.excerpt}
                onChange={(event) => set("excerpt")(event.target.value)}
                rows={3}
                maxLength={400}
                placeholder="One or two sentences on what this is about."
                className={`${field} resize-y`}
              />
            </Panel>
          </div>

          {/* ---- how it is published ---- */}
          <div className="flex flex-col gap-6">
            <Panel title="Publishing">
              <p className="font-ui text-sm text-neutral-300">
                This post is{" "}
                <span
                  className={form.status === "published" ? "font-bold text-[#7ddc7d]" : "font-bold text-[#ffb4c4]"}
                >
                  {form.status === "published" ? "published" : "a draft"}
                </span>
                .
              </p>
              <label className="flex items-center justify-between gap-3">
                <span className="font-ui text-sm text-white">Featured post</span>
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(event) => set("featured")(event.target.checked)}
                  className="size-5 accent-[#e0208c]"
                />
              </label>
            </Panel>

            <Panel title="Hero picture" note="Shown on the card and at the top of the article.">
              <PicturePicker
                url={form.heroUrl}
                label="Hero picture"
                onPicked={({ url, accent }) =>
                  setForm((was) => ({ ...was, heroUrl: url, heroAccent: accent || was.heroAccent }))
                }
                onCleared={() => setForm((was) => ({ ...was, heroUrl: null, heroAccent: null }))}
              />
              {form.heroAccent && (
                <p className="flex items-center gap-2 font-ui text-xs text-neutral-400">
                  <span
                    className="inline-block size-3 rounded-full"
                    style={{ backgroundColor: form.heroAccent }}
                  />
                  The card is trimmed in this colour, taken from the picture.
                </p>
              )}
            </Panel>

            <Panel title="Category">
              <input
                value={form.category}
                onChange={(event) => set("category")(event.target.value)}
                placeholder="Guides, News, Craft…"
                className={field}
              />
            </Panel>

            <Panel title="Tags" note="For organising the blog, not for search engines.">
              <TagInput
                values={form.tags}
                onChange={set("tags")}
                placeholder="Type and press Enter"
              />
            </Panel>

            {/* ---- SEO & search appearance ---- */}
            <Panel
              title="SEO & search appearance"
              note="Every field here is optional. Empty means the post's own title, summary and hero picture are used."
            >
              <label className="flex flex-col gap-1.5">
                <span className="flex items-center justify-between">
                  <span className="font-ui text-sm text-white">Meta title</span>
                  <Counter value={form.metaTitle || form.title} best={TITLE_BEST} />
                </span>
                <input
                  value={form.metaTitle}
                  onChange={(event) => set("metaTitle")(event.target.value)}
                  placeholder={form.title || "Falls back to the post title"}
                  className={field}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="flex items-center justify-between">
                  <span className="font-ui text-sm text-white">Meta description</span>
                  <Counter
                    value={form.metaDescription || form.excerpt}
                    best={DESCRIPTION_BEST}
                  />
                </span>
                <textarea
                  value={form.metaDescription}
                  onChange={(event) => set("metaDescription")(event.target.value)}
                  rows={3}
                  placeholder="Falls back to the summary above"
                  className={`${field} resize-y`}
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="font-ui text-sm text-white">Meta keywords</span>
                <p className="font-ui text-xs text-neutral-500">
                  Kept separately from the tags above. Worth filling in for your own records,
                  though most search engines stopped ranking on this field a long time ago.
                </p>
                <TagInput
                  values={form.metaKeywords}
                  onChange={set("metaKeywords")}
                  placeholder="web development, character design…"
                />
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="font-ui text-sm text-white">Canonical URL</span>
                <p className="font-ui text-xs text-neutral-500">
                  Only if this was published somewhere else first.
                </p>
                <input
                  value={form.canonicalUrl}
                  onChange={(event) => set("canonicalUrl")(event.target.value)}
                  placeholder={`https://www.${SITE}/blog/${slug || "your-post"}`}
                  className={field}
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="font-ui text-sm text-white">Social sharing picture</span>
                <p className="font-ui text-xs text-neutral-500">
                  Shown when the link is pasted into a chat. Falls back to the hero picture.
                </p>
                <PicturePicker
                  url={form.ogImageUrl}
                  label="Sharing picture"
                  onPicked={({ url }) => set("ogImageUrl")(url)}
                  onCleared={() => set("ogImageUrl")(null)}
                />
              </div>

              {/* A rough idea of the search result, updating as it is typed. */}
              <div className="rounded-xl border border-white/10 bg-[#141a27] p-4">
                <p className="font-ui text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Search preview
                </p>
                <p className="mt-3 font-ui text-xs text-[#7ddc7d]">
                  {SITE}/blog/{slug || "your-post-slug"}
                </p>
                <p className="mt-1 line-clamp-1 font-ui text-base text-[#8ab4ff]">{previewTitle}</p>
                <p className="mt-1 line-clamp-2 font-ui text-sm text-neutral-400">
                  {previewDescription}
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
