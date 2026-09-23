// Highlight posts, from the API. Images are uploaded first; the post keeps
// their addresses.
import { api } from "./api";
import { uploadImage } from "./character";

export const loadHighlights = () => api.get("/highlights");

export const createHighlight = (post) => api.post("/highlights", post);

export const updateHighlight = (id, post) => api.patch(`/highlights/${id}`, post);

export const deleteHighlight = (id) => api.delete(`/highlights/${id}`);

// Pictures picked in the form are still Files; upload them, keep any that
// were already saved.
export async function uploadHighlightImages(images) {
  const urls = [];
  for (const image of images) {
    if (!image) continue;
    urls.push(image.file ? await uploadImage(image.file, "highlights") : image.url);
  }
  return urls;
}
