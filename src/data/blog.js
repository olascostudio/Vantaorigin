// Talking to the blog, kept in one place rather than spread through the
// components that happen to need it.
import { api } from "./api.js";

// ---- reading ----

export const getPublishedPosts = ({ page = 1, category = "", tag = "" } = {}) => {
  const query = new URLSearchParams({ page: String(page) });
  if (category) query.set("category", category);
  if (tag) query.set("tag", tag);
  return api.get(`/blog?${query}`);
};

export const getPostBySlug = (slug) => api.get(`/blog/${encodeURIComponent(slug)}`);

export const getRelatedPosts = (slug) => api.get(`/blog/${encodeURIComponent(slug)}/related`);

export const getBlogMeta = () => api.get("/blog/meta");

// ---- writing ----

export const getAdminPosts = (status = "") =>
  api.get(status ? `/admin/blog?status=${status}` : "/admin/blog");

export const getAdminPost = (id) => api.get(`/admin/blog/${id}`);

export const createPost = (post) => api.post("/admin/blog", post);

export const updatePost = (id, patch) => api.patch(`/admin/blog/${id}`, patch);

export const deletePost = (id) => api.delete(`/admin/blog/${id}`);

export const publishPost = (id, published) =>
  api.patch(`/admin/blog/${id}`, { status: published ? "published" : "draft" });

// A hero or an inline picture. Comes back with the colour the card should be
// trimmed in, the same way character covers do.
export const uploadBlogImage = (file) => api.upload("/uploads?folder=blog", file);

// ---- shared bits of presentation ----

// The address an article lives at, used for links and for copying.
export const blogPath = (post) => `/blog/${post.slug}`;

export const readableDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

// The same slug rules the API uses, so the field in the editor shows what
// will actually end up in the address bar rather than guessing.
export const slugify = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
