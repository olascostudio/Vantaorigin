// The front page, for readers that do not run JavaScript.
//
// Every other page a crawler asks for is handed to the API by a rewrite in
// vercel.json: a character, a creator, the blog, discover, about, help. The
// front page had the same rule and it never fired, because Vercel applies
// those rewrites only after looking for a file, and "/" is index.html. The
// file won every time, so the most important page on the site answered a
// crawler with the empty shell: five words, all of them the title.
//
// Middleware runs before that check, which is the whole reason this file
// exists. It is deliberately the only thing here, and it only ever looks at
// "/": anything else is none of its business.
export const config = { matcher: "/" };

// The same readers vercel.json names. Kept as one expression rather than a
// list of names so there is one thing to read.
const CRAWLER =
  /(facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|slackbot|slack-imgproxy|discordbot|telegrambot|whatsapp|pinterest|redditbot|embedly|quora link preview|skypeuripreview|vkshare|nuzzel|applebot|bingbot|googlebot|google-extended|duckduckbot|yandex|baiduspider|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexitybot|perplexity-user|youbot|bytespider|amazonbot|ccbot|diffbot|cohere-ai|meta-externalagent|moonshot|kimi|bot|crawler|spider|preview)/i;

const HOME = "https://api.vantaorigin.com/preview/home";

export default async function middleware(request) {
  const agent = request.headers.get("user-agent") || "";
  if (!CRAWLER.test(agent)) return undefined;

  // A person opening the site is never held up by this, and a crawler that
  // arrives while the API is down gets what it would have got anyway. The
  // front page is not worth breaking over a link preview.
  try {
    const answer = await fetch(HOME, {
      headers: { "user-agent": agent },
      signal: AbortSignal.timeout(4000),
    });
    if (!answer.ok) return undefined;

    return new Response(await answer.text(), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=3600",
        // Says which of the two answers this is, so it can be checked from
        // outside without guessing at cache headers.
        "x-vanta-render": "crawler",
      },
    });
  } catch {
    return undefined;
  }
}
