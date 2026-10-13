import { describe, it, expect, vi, afterEach } from "vitest";
import middleware from "../middleware.js";

// Who gets the plain HTML of the front page.
//
// The rewrite in vercel.json never fired for "/" because Vercel looks for a
// file first and finds index.html, so a crawler asking for the front page got
// the empty shell: five words, all of them the title. This runs before that
// check. The risk of running anything on the front page is that it breaks the
// front page, so most of what is tested here is that it gets out of the way.

const ask = (agent) =>
  middleware(new Request("https://www.vantaorigin.com/", { headers: { "user-agent": agent } }));

const BROWSERS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

const CRAWLERS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)",
  "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  "Mozilla/5.0 (compatible; PerplexityBot/1.0)",
  "facebookexternalhit/1.1",
  "TelegramBot (like TwitterBot)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
];

afterEach(() => vi.unstubAllGlobals());

const served = (body = "<html><body><h1>Your characters. One link.</h1></body></html>") =>
  vi.fn(async () => new Response(body, { status: 200 }));

describe("The front page, asked for by a crawler", () => {
  it("hands over the written page instead of the shell", async () => {
    const fetched = served();
    vi.stubGlobal("fetch", fetched);

    for (const agent of CRAWLERS) {
      const answer = await ask(agent);
      expect(answer, agent).toBeInstanceOf(Response);
      expect(await answer.text()).toContain("Your characters. One link.");
      expect(answer.headers.get("x-vanta-render")).toBe("crawler");
    }
    expect(fetched).toHaveBeenCalledTimes(CRAWLERS.length);
  });

  it("asks the API for the front page and nothing else", async () => {
    const fetched = served();
    vi.stubGlobal("fetch", fetched);

    await ask(CRAWLERS[0]);
    expect(fetched.mock.calls[0][0]).toBe("https://api.vantaorigin.com/preview/home");
  });
});

describe("The front page, asked for by a person", () => {
  it("is left alone, and the API is never called", async () => {
    const fetched = served();
    vi.stubGlobal("fetch", fetched);

    for (const agent of BROWSERS) {
      expect(await ask(agent), agent).toBeUndefined();
    }
    expect(fetched).not.toHaveBeenCalled();
  });

  it("is left alone when there is no user agent at all", async () => {
    const fetched = served();
    vi.stubGlobal("fetch", fetched);

    const answer = await middleware(new Request("https://www.vantaorigin.com/"));
    expect(answer).toBeUndefined();
    expect(fetched).not.toHaveBeenCalled();
  });
});

describe("When the API cannot answer", () => {
  it("falls back to the ordinary page rather than failing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("getaddrinfo ENOTFOUND"); }));
    expect(await ask(CRAWLERS[0])).toBeUndefined();
  });

  it("does not pass on an error page as though it were the front page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Bad gateway", { status: 502 })));
    expect(await ask(CRAWLERS[0])).toBeUndefined();
  });
});

describe("What it is allowed to touch", () => {
  it("runs on the front page only", async () => {
    const { config } = await import("../middleware.js");
    expect(config.matcher).toBe("/");
  });
});
