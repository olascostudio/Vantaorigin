// Who gets the written page, and who gets the app.
//
// The app draws everything in the browser, so anything that does not run
// JavaScript sees a five word shell. The API renders the same pages as plain
// HTML at /preview/*, and the job here is deciding which of the two a
// request should be answered with.
//
// It used to be decided by a list of crawler names, in vercel.json. That
// list serves whoever we thought to write down and nothing to everybody
// else, and measured against the live site, nine of ten ordinary fetches got
// the empty shell: curl, python-requests, node-fetch, axios, Go-http-client,
// Java, Postman, a bare Mozilla/5.0, and a request with no user-agent at
// all. A language model reading a page for somebody usually sends one of
// those rather than announcing itself as a crawler, so the pages were blank
// for exactly the readers the preview routes were built for.
//
// So the question is turned around. It is not "is this a crawler we have
// heard of", it is "can this thing run the app". A browser says Mozilla/5.0
// and names a rendering engine; that is true of every mainstream browser and
// of a headless one driven by an agent, which runs the scripts and so reads
// the page properly on its own. Anything else is handed the written page.
// Being wrong now means an unknown reader gets readable HTML instead of
// nothing, which is the better way round to be wrong.
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

// Named outright, because several of these arrive looking like a browser.
// Modern Googlebot sends Mozilla/5.0 with AppleWebKit and Chrome in it, so
// it has to be recognised before the browser test or it would be handed the
// app and left to render it.
const CRAWLER =
  /(facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|slackbot|slack-imgproxy|discordbot|telegrambot|whatsapp|pinterest|redditbot|embedly|quora link preview|skypeuripreview|vkshare|nuzzel|applebot|bingbot|googlebot|google-extended|duckduckbot|yandex|baiduspider|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexitybot|perplexity-user|youbot|bytespider|amazonbot|ccbot|diffbot|cohere-ai|meta-externalagent|moonshot|kimi|bot|crawler|spider|preview)/i;

// A browser says Mozilla/5.0 and names an engine. Chrome, Safari, Firefox,
// Edge and every headless build of them do; curl, a script and an empty
// user-agent do not.
const RUNS_SCRIPTS = (agent) => /Mozilla\/5\.0/i.test(agent) && /(AppleWebKit|Gecko|Trident)/i.test(agent);

// Where the written copy of each address lives. A character and a creator
// carry a name in the path, so those are matched rather than looked up.
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
  if (named) return `${API}/preview/${named[1]}/${named[2]}`;

  return null;
};

export default async function middleware(request) {
  const agent = request.headers.get("user-agent") || "";

  // Anything that can run the app is given the app.
  if (!CRAWLER.test(agent) && RUNS_SCRIPTS(agent)) return undefined;

  const target = writtenPage(new URL(request.url).pathname);
  if (!target) return undefined;

  // A reader arriving while the API is down, or getting an error back from
  // it, gets what it would have got anyway. A page is not worth breaking
  // over a preview.
  try {
    const answer = await fetch(target, {
      headers: { "user-agent": agent || "VantaOrigin" },
      signal: AbortSignal.timeout(5000),
    });
    if (!answer.ok) return undefined;

    return new Response(await answer.text(), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=3600",
        // Says which of the two answers this is, so it can be checked from
        // outside without guessing at word counts.
        "x-vanta-render": "server",
      },
    });
  } catch {
    return undefined;
  }
}
