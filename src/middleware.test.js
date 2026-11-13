import { describe, it, expect, vi, afterEach } from "vitest";
import middleware, { config } from "../middleware.js";

// One page, for everyone.
//
// The rule used to be a guess at whether the thing asking was a browser. It
// could not work: a user agent says what a client calls itself, not whether
// it will run JavaScript, and most fetchers that read a page on somebody's
// behalf send a full Chrome string. Every one of those got the shell, which
// is how a blog post came back carrying the homepage's title.
//
// Now nothing is sniffed. These check that the same document goes to all of
// them, that it carries the page's own content and tags, that the app's
// script travels with it, and that a failure anywhere falls back to the app
// rather than to a broken page.

const WRITTEN = `<!doctype html>
<html lang="en">
  <head>
    <title>How Indie Comics Get Distribution in 2026</title>
    <meta name="description" content="A long description of the article." />
    <link rel="canonical" href="https://www.vantaorigin.com/blog/indie-comic-distribution-2026" />
    <script type="application/ld+json">{"@type":"BlogPosting"}</script>
  </head>
  <body>
    <article><h1>How Indie Comics Get Distribution in 2026</h1><p>The whole article.</p></article>
    <footer><nav><a href="/blog">Blog</a></nav></footer>
  </body>
</html>`;

const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <title>VantaOrigin: Your characters. One link.</title>
    <script type="module" crossorigin src="/assets/index-DYFxFGZs.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-CsIkaWvU.css">
  </head>
  <body><div id="root"></div></body>
</html>`;

// The shell is read once per isolate, so a test that wants a different one
// has to start from a module nobody has asked yet.
const freshMiddleware = async () => {
  vi.resetModules();
  // Static specifier: Vite cannot resolve a variable one, and resetModules
  // is what actually clears the cached shell.
  const mod = await import("../middleware.js");
  return mod.default;
};

const serving = ({ written = WRITTEN, shell = SHELL, pageOk = true, shellOk = true } = {}) =>
  vi.fn(async (url) =>
    String(url).includes("/index.html")
      ? new Response(shell, { status: shellOk ? 200 : 500 })
      : new Response(written, { status: pageOk ? 200 : 404 })
  );

const ask = (path, agent) =>
  middleware(
    new Request(`https://www.vantaorigin.com${path}`, {
      headers: agent ? { "user-agent": agent } : {},
    })
  );

const AGENTS = [
  ["no user-agent", null],
  ["curl", "curl/8.4.0"],
  ["python-requests", "python-requests/2.31.0"],
  ["real Chrome", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"],
  ["a fetcher claiming to be Chrome", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"],
  ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
  ["GPTBot", "Mozilla/5.0 (compatible; GPTBot/1.1)"],
];

afterEach(() => vi.unstubAllGlobals());

describe("Everyone gets the same page", () => {
  it("serves the article whatever the client calls itself", async () => {
    vi.stubGlobal("fetch", serving());
    const run = await freshMiddleware();

    const bodies = [];
    for (const [name, agent] of AGENTS) {
      const answer = await run(
        new Request("https://www.vantaorigin.com/blog/indie-comic-distribution-2026", {
          headers: agent ? { "user-agent": agent } : {},
        })
      );
      expect(answer, name).toBeInstanceOf(Response);
      bodies.push(await answer.text());
    }

    // Byte for byte the same, which is the whole point: there is no longer
    // an audience that gets a different answer.
    expect(new Set(bodies).size).toBe(1);
    expect(bodies[0]).toContain("The whole article.");
    expect(bodies[0]).toContain("How Indie Comics Get Distribution in 2026");
  });

  it("keeps the page's own tags, not the shell's", async () => {
    vi.stubGlobal("fetch", serving());
    const run = await freshMiddleware();
    const html = await (await run(new Request("https://www.vantaorigin.com/blog/a-post"))).text();

    expect(html).toContain("<title>How Indie Comics Get Distribution in 2026</title>");
    expect(html).toContain('rel="canonical" href="https://www.vantaorigin.com/blog/indie-comic-distribution-2026"');
    expect(html).toContain('"@type":"BlogPosting"');
    // And not the shell's title, which is what the bug looked like.
    expect(html).not.toContain("VantaOrigin: Your characters. One link.");
  });

  it("carries the app's script and stylesheet so a browser can take over", async () => {
    vi.stubGlobal("fetch", serving());
    const run = await freshMiddleware();
    const html = await (await run(new Request("https://www.vantaorigin.com/"))).text();

    expect(html).toContain('src="/assets/index-DYFxFGZs.js"');
    expect(html).toContain('href="/assets/index-CsIkaWvU.css"');
  });

  it("puts the article where the app mounts, so React replaces it", async () => {
    vi.stubGlobal("fetch", serving());
    const run = await freshMiddleware();
    const html = await (await run(new Request("https://www.vantaorigin.com/"))).text();

    const root = html.slice(html.indexOf('<div id="root">'), html.lastIndexOf("</div>"));
    expect(root).toContain("The whole article.");
    expect(html.match(/<div id="root">/g)).toHaveLength(1);
  });

  it("says the page depends on who asked, and which copy this is", async () => {
    vi.stubGlobal("fetch", serving());
    const run = await freshMiddleware();
    const answer = await run(new Request("https://www.vantaorigin.com/"));

    expect(answer.headers.get("vary")).toBe("User-Agent");
    expect(answer.headers.get("x-vanta-render")).toBe("server");
    expect(answer.headers.get("content-type")).toMatch(/text\/html/);
  });
});

describe("The asset names come from the build they belong to", () => {
  it("reads them from this deployment's own shell", async () => {
    const fetched = serving();
    vi.stubGlobal("fetch", fetched);
    const run = await freshMiddleware();
    await run(new Request("https://www.vantaorigin.com/"));

    const asked = fetched.mock.calls.map((c) => String(c[0]));
    expect(asked.some((u) => u === "https://www.vantaorigin.com/index.html")).toBe(true);
  });

  it("reads the shell once and reuses it within a deployment", async () => {
    // A new deploy is a new isolate, so the cache starts empty and fills
    // from the build it belongs to. It cannot serve a stale script.
    const fetched = serving();
    vi.stubGlobal("fetch", fetched);
    const run = await freshMiddleware();

    await run(new Request("https://www.vantaorigin.com/"));
    await run(new Request("https://www.vantaorigin.com/blog"));
    await run(new Request("https://www.vantaorigin.com/discover"));

    const shellReads = fetched.mock.calls.filter((c) => String(c[0]).includes("/index.html"));
    expect(shellReads).toHaveLength(1);
  });
});

describe("When something is not there", () => {
  it("falls back to the app if the written page is missing", async () => {
    vi.stubGlobal("fetch", serving({ pageOk: false }));
    const run = await freshMiddleware();
    expect(await run(new Request("https://www.vantaorigin.com/"))).toBeUndefined();
  });

  it("falls back to the app if the shell cannot be read", async () => {
    vi.stubGlobal("fetch", serving({ shellOk: false }));
    const run = await freshMiddleware();
    expect(await run(new Request("https://www.vantaorigin.com/"))).toBeUndefined();
  });

  it("falls back to the app if the API never answers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ENOTFOUND"); }));
    const run = await freshMiddleware();
    expect(await run(new Request("https://www.vantaorigin.com/"))).toBeUndefined();
  });

  it("leaves an address with no written copy alone", async () => {
    const fetched = serving();
    vi.stubGlobal("fetch", fetched);
    const run = await freshMiddleware();

    expect(await run(new Request("https://www.vantaorigin.com/settings"))).toBeUndefined();
    expect(fetched).not.toHaveBeenCalled();
  });
});

describe("What it is allowed to touch", () => {
  it("covers the public pages and nothing private", () => {
    for (const path of ["/", "/blog/:slug", "/character/:slug", "/creator/:username", "/discover"]) {
      expect(config.matcher).toContain(path);
    }
    for (const path of ["/settings", "/creators-hub", "/admin", "/signin", "/signup"]) {
      expect(config.matcher).not.toContain(path);
    }
  });
});
