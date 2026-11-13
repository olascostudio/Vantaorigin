// One page, for everyone.
//
// The app draws itself in the browser, so for most of this site's life a
// reader that did not run scripts got a five word shell. That was patched by
// deciding, per request, whether the thing asking looked like a browser: a
// crawler got the written page and everybody else got the app.
//
// It cannot work, and it did not. A user agent does not say whether a client
// will run JavaScript; it says what the client decided to call itself. Most
// fetchers that read a page on somebody's behalf send a full Chrome string,
// precisely so they are not turned away, and every one of those got the
// shell: the homepage's title on a blog post, with no article under it.
//
// So nothing is sniffed now. Every public address returns the same document
// to every client: the written page, with its own title, canonical, meta and
// schema, and the app's script alongside. A reader that cannot run scripts
// has the whole article. A browser renders that same article, then the app
// boots and takes over the page. Both get the truth, and neither depends on
// what the request claimed to be.
//
// Private addresses are not in the matcher and have no written copy at all.
export const config = {
  matcher: [
    "/",
    "/about",
    "/help",
    "/discover",
    "/community",
    "/blog",
    "/blog/:slug",
    "/character/:slug",
    "/creator/:username",
    "/marketplace",
    "/marketplace/how-it-works",
    "/marketplace/project-request",
  ],
};

const API = "https://api.vantaorigin.com";

// Where the written copy of each address lives. A character, a creator and a
// post carry a name in the path, so those are matched rather than listed.
const writtenPage = (pathname) => {
  const fixed = {
    "/": "/preview/home",
    "/about": "/preview/about",
    "/help": "/preview/help",
    "/discover": "/preview/discover",
    "/community": "/preview/community",
    "/blog": "/preview/blog",
    "/marketplace": "/preview/marketplace",
    "/marketplace/how-it-works": "/preview/marketplace/how-it-works",
    "/marketplace/project-request": "/preview/marketplace/project-request",
  };
  if (fixed[pathname]) return `${API}${fixed[pathname]}`;

  const named = pathname.match(/^\/(character|creator|blog)\/([^/]+)$/);
  return named ? `${API}/preview/${named[1]}/${named[2]}` : null;
};

// The app's own script and stylesheet, taken from the shell this deployment
// built.
//
// Vite writes a hash into both filenames, so they change whenever the code
// does. Rather than keep a copy of those names anywhere, the shell is read
// from this same deployment and the tags lifted out of it. It cannot go
// stale: a new deploy is a new shell and a new isolate, so the cache below
// starts empty and fills from the build it belongs to. There is no version
// of this that points at a script from the last deploy.
let assetTags = null;

const tagsFromShell = async (origin) => {
  if (assetTags) return assetTags;

  const res = await fetch(`${origin}/index.html`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`the shell answered ${res.status}`);
  const shell = await res.text();

  const found = shell.match(
    /<(?:script|link)[^>]*(?:src|href)="\/assets\/[^"]+"[^>]*>(?:<\/script>)?/g
  );
  if (!found?.length) throw new Error("no asset tags in the shell");

  assetTags = found.join("\n    ");
  return assetTags;
};

// What the page looks like in the moment before the app takes over.
//
// Without this the written page arrives unstyled and white, and a reader on
// a slow connection sees a bare document flash before the site appears. The
// app's own stylesheet is loaded alongside, so this only has to hold the
// background and the text colour steady until it does.
const PRE_BOOT = `<style>
      html, body { margin: 0; background: #0e0e0e; color: #e8ecf5; }
      #root { font-family: Inter, system-ui, sans-serif; line-height: 1.6; }
      #root > * { max-width: 46rem; margin: 0 auto; padding: 1.5rem 1rem; }
      #root a { color: #fc187b; }
      #root img { max-width: 100%; height: auto; }
    </style>`;

// The written page, wearing the app's scripts, with its content where the
// app expects to mount.
const merge = (written, tags) => {
  const head = written.indexOf("</head>");
  const bodyOpen = written.indexOf("<body>");
  const bodyClose = written.lastIndexOf("</body>");
  if (head < 0 || bodyOpen < 0 || bodyClose < 0) return null;

  const content = written.slice(bodyOpen + "<body>".length, bodyClose).trim();

  return (
    written.slice(0, head) +
    `  ${PRE_BOOT}\n    ${tags}\n  ` +
    written.slice(head, bodyOpen + "<body>".length) +
    // React replaces whatever is in here when it mounts, so the article is
    // both what a reader without scripts keeps and what a browser shows
    // until the app is ready.
    `\n    <div id="root">${content}</div>\n  ` +
    written.slice(bodyClose)
  );
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const target = writtenPage(url.pathname);
  if (!target) return undefined;

  // A reader arriving while the API is down, or while anything here fails,
  // gets the app exactly as before. A page is not worth breaking over the
  // written copy of it.
  try {
    const [page, tags] = await Promise.all([
      fetch(target, {
        headers: { "user-agent": request.headers.get("user-agent") || "VantaOrigin" },
        signal: AbortSignal.timeout(5000),
      }),
      tagsFromShell(url.origin),
    ]);
    if (!page.ok) return undefined;

    const merged = merge(await page.text(), tags);
    if (!merged) return undefined;

    return new Response(merged, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=3600",
        // No Vary. There was one while the answer depended on who asked, and
        // it was right then: without it a proxy could hand one audience the
        // other's copy. Nothing varies now, and saying it does is not free,
        // because a cache takes it literally and keeps a separate copy per
        // user agent string. There are thousands of those, so it would split
        // one cached page into thousands of cache misses to describe a
        // variation that no longer exists.
        "x-vanta-render": "server",
      },
    });
  } catch {
    return undefined;
  }
}
