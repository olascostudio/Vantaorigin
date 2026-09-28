// A temporary probe: can this server reach ArtStation?
//
// The scheduled sync fails on GitHub's runners, and the likeliest reason is
// that Cloudflare turns away datacenter addresses. Before rebuilding the sync
// around that, it is worth knowing whether Render's address fares any better.
// Returns status codes only — nothing here that is not already public.
//
// Delete once the question is settled.
const USER = "vantaoriginstudio";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const TARGETS = [
  ["albums (quick.json)", `https://www.artstation.com/users/${USER}/quick.json`],
  ["projects.json", `https://www.artstation.com/users/${USER}/projects.json?page=1`],
  ["rss", `https://www.artstation.com/${USER}.rss`],
];

export default async function debugRoutes(app) {
  app.get("/debug/artstation", async () => {
    const results = await Promise.all(
      TARGETS.map(async ([name, url]) => {
        const started = Date.now();
        try {
          const response = await fetch(url, {
            headers: {
              "User-Agent": UA,
              Accept: "application/json, text/xml, */*",
              "Accept-Language": "en-GB,en;q=0.9",
            },
            signal: AbortSignal.timeout(20_000),
          });
          const body = await response.text();
          return {
            name,
            status: response.status,
            ms: Date.now() - started,
            bytes: body.length,
            // Enough to tell JSON from a Cloudflare challenge page.
            looksLike: body.trimStart().slice(0, 60).replace(/\s+/g, " "),
          };
        } catch (error) {
          return { name, status: "error", ms: Date.now() - started, error: error.message };
        }
      })
    );

    return { from: "render", results };
  });
}
