import { useEffect } from "react";

// A title and a description of its own for every page.
//
// The app draws itself in the browser, so without this every page carries the
// title written into index.html: one line describing the whole site, repeated
// on the help centre, the terms, a character and a creator alike. Crawlers
// that run JavaScript then see fifty identical titles, and so does anyone
// looking at their own browser tabs or bookmarks.
//
// Crawlers that do not run JavaScript get the pages the API builds, which
// have carried their own titles all along; this closes the gap for everyone
// else.
const DEFAULT_TITLE = "VantaOrigin: Your characters. One link.";
const DEFAULT_DESCRIPTION =
  "Create character cards, organize your characters, and share one simple page with anyone who wants to discover them.";

const setDescription = (text) => {
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "description");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", text);
};

const setCanonical = (path) => {
  let tag = document.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", `${window.location.origin}${path}`);
};

// A page that is nobody else's business.
//
// Added and removed rather than set to "index": a page that does not say so
// is indexable already, and leaving "noindex" behind on the way out would
// quietly drop the next page the person opens out of every search engine.
const setRobots = (value) => {
  let tag = document.querySelector('meta[name="robots"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "robots");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", value);
};

const clearRobots = () => {
  document.querySelector('meta[name="robots"]')?.remove();
};

// Taken away rather than pointed at the front page. Leaving a page is not a
// claim that the front page is what you were looking at, and a crawler that
// reads the head at the wrong moment should find nothing rather than
// something untrue.
const clearCanonical = () => {
  document.querySelector('link[rel="canonical"]')?.remove();
};

// `title` and `description` may be empty while a page is still loading what
// it needs; nothing is written until they are known, so a half-written title
// never flashes into a tab or a bookmark.
export function usePageMeta({ title, description, canonicalPath, noindex = false } = {}) {
  useEffect(() => {
    // Pages that already say VantaOrigin do not need it twice.
    if (title) {
      document.title = title.includes("VantaOrigin") ? title : `${title} | VantaOrigin`;
    }
    if (description) setDescription(description);
    if (canonicalPath) setCanonical(canonicalPath);
    // Somebody's own settings screen, reached by a link from their inbox.
    // There is nothing here for a search engine and the address carries a
    // token, so it is asked not to keep it.
    if (noindex) setRobots("noindex, nofollow");

    return () => {
      document.title = DEFAULT_TITLE;
      setDescription(DEFAULT_DESCRIPTION);
      clearCanonical();
      clearRobots();
    };
  }, [title, description, canonicalPath, noindex]);
}
