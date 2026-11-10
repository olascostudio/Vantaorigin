import { describe, it, expect, vi, afterEach } from "vitest";
import middleware, { config } from "../middleware.js";

// Who gets the written page, and who gets the app.
//
// The rule used to be a list of crawler names. Measured against the live
// site, nine of ten ordinary fetches got the five word shell: curl,
// python-requests, node-fetch, axios, Go-http-client, Java, Postman, a bare
// Mozilla/5.0 and a request with no user-agent at all. A language model
// reading a page for somebody sends one of those far more often than it
// announces itself, so the written pages were missing for the readers they
// were built for.
//
// The question is now whether the thing asking can run the app, which is a
// property of the reader rather than a guess at its name.

const ask = (path, agent) =>
  middleware(
    new Request(`https://www.vantaorigin.com${path}`, {
      headers: agent === null ? {} : { "user-agent": agent },
    })
  );

const BROWSERS = [
  ["Chrome", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"],
  ["iPhone Safari", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"],
  ["Firefox", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0"],
  ["Edge", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"],
  // Driven by an agent, but it runs the scripts, so the app is the right
  // answer: it reads the page properly on its own.
  ["headless Chrome", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36"],
];

// Every one of these was measured getting the empty shell.
const PLAIN_CLIENTS = [
  ["no user-agent at all", null],
  ["curl", "curl/8.4.0"],
  ["python-requests", "python-requests/2.31.0"],
  ["node-fetch", "node-fetch/1.0"],
  ["axios", "axios/1.6.2"],
  ["Go-http-client", "Go-http-client/2.0"],
  ["Java", "Java/17.0.1"],
  ["Postman", "PostmanRuntime/7.36.0"],
  ["a bare Mozilla/5.0", "Mozilla/5.0"],
  ["an empty string", ""],
];

const CRAWLERS = [
  ["Googlebot, modern", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/131.0.0.0 Safari/537.36"],
  ["Googlebot, old", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
  ["GPTBot", "Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)"],
  ["ClaudeBot", "Mozilla/5.0 (compatible; ClaudeBot/1.0)"],
  ["facebook", "facebookexternalhit/1.1"],
];

const served = (body = "<html><body><h1>Urokojin</h1></body></html>") =>
  vi.fn(async () => new Response(body, { status: 200 }));

afterEach(() => vi.unstubAllGlobals());

describe("A reader that cannot run the app", () => {
  it("is handed the written page, whatever it calls itself", async () => {
    const fetched = served();
    vi.stubGlobal("fetch", fetched);

    for (const [name, agent] of PLAIN_CLIENTS) {
      const answer = await ask("/character/urokojin", agent);
      expect(answer, name).toBeInstanceOf(Response);
      expect(await answer.text(), name).toContain("Urokojin");
      expect(answer.headers.get("x-vanta-render")).toBe("server");
    }
    expect(fetched).toHaveBeenCalledTimes(PLAIN_CLIENTS.length);
  });

  it("is sent to the written copy of the address it asked for", async () => {
    const fetched = served();
    vi.stubGlobal("fetch", fetched);

    const wanted = {
      "/": "/preview/home",
      "/about": "/preview/about",
      "/help": "/preview/help",
      "/discover": "/preview/discover",
      "/community": "/preview/community",
      "/blog": "/preview/blog",
      "/marketplace": "/preview/marketplace",
      "/marketplace/how-it-works": "/preview/marketplace/how-it-works",
      "/marketplace/project-request": "/preview/marketplace/project-request",
      "/character/urokojin": "/preview/character/urokojin",
      "/creator/Vtgshadowscribe": "/preview/creator/Vtgshadowscribe",
      "/blog/why-i-built-vantaorigin": "/preview/blog/why-i-built-vantaorigin",
    };

    for (const [path, preview] of Object.entries(wanted)) {
      fetched.mockClear();
      await ask(path, "curl/8.4.0");
      expect(fetched.mock.calls[0]?.[0], path).toBe(`https://api.vantaorigin.com${preview}`);
    }
  });
});

describe("A browser", () => {
  it("gets the app, and the API is never called for it", async () => {
    const fetched = served();
    vi.stubGlobal("fetch", fetched);

    for (const [name, agent] of BROWSERS) {
      expect(await ask("/character/urokojin", agent), name).toBeUndefined();
    }
    expect(fetched).not.toHaveBeenCalled();
  });
});

describe("A crawler that looks like a browser", () => {
  it("is still given the written page", async () => {
    // Modern Googlebot sends Mozilla/5.0 with AppleWebKit and Chrome in it.
    // Checked before the browser test, or it would be handed the app.
    const fetched = served();
    vi.stubGlobal("fetch", fetched);

    for (const [name, agent] of CRAWLERS) {
      const answer = await ask("/character/urokojin", agent);
      expect(answer, name).toBeInstanceOf(Response);
    }
    expect(fetched).toHaveBeenCalledTimes(CRAWLERS.length);
  });
});

describe("When the API cannot answer", () => {
  it("falls back to the app rather than failing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ENOTFOUND"); }));
    expect(await ask("/character/urokojin", "curl/8.4.0")).toBeUndefined();
  });

  it("does not pass on an error page as though it were the character", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Bad gateway", { status: 502 })));
    expect(await ask("/character/urokojin", "curl/8.4.0")).toBeUndefined();
  });

  it("leaves an address it has no written copy of alone", async () => {
    const fetched = served();
    vi.stubGlobal("fetch", fetched);
    // Not in the list, so nothing to serve: the app answers.
    expect(await ask("/settings", "curl/8.4.0")).toBeUndefined();
    expect(fetched).not.toHaveBeenCalled();
  });
});

describe("What it is allowed to touch", () => {
  it("covers every page that has a written copy, and nothing private", () => {
    expect(config.matcher).toContain("/");
    expect(config.matcher).toContain("/character/:slug");
    expect(config.matcher).toContain("/creator/:username");
    expect(config.matcher).toContain("/blog/:slug");

    for (const path of ["/settings", "/creators-hub", "/admin", "/signin"]) {
      expect(config.matcher).not.toContain(path);
    }
  });
});
