// Telling search engines about a page the moment it exists.
//
// Google has no such button for ordinary pages: their Indexing API is for
// job adverts and live streams, and the old sitemap ping was retired, so
// there the sitemap and the links between pages do the work.
//
// Bing, Yandex and Seznam share one: IndexNow. A URL sent here is usually
// looked at within minutes rather than whenever a crawler next wanders by.
// It is worth more than it sounds: ChatGPT's web search reads Bing's index,
// so this is the shortest road from "published" to an assistant being able to
// answer about a character.
//
// Ownership is proved by a file at the site root holding the same key.
import { config } from "./config.js";

const ENDPOINT = "https://api.indexnow.org/indexnow";

const site = () => (config.SITE_URL || "https://www.vantaorigin.com").replace(/\/$/, "");
const host = () => new URL(site()).host;

export const indexNowReady = () => Boolean(config.INDEXNOW_KEY);

// The pages that change when one character is published: the character
// itself, the creator's page, and the list everything is found from.
export function pagesTouchedBy({ characterId, username }) {
  const urls = [`${site()}/discover`];
  if (characterId) urls.push(`${site()}/character?id=${characterId}`);
  if (username) urls.push(`${site()}/creator/${String(username).replace(/^@+/, "")}`);
  return [...new Set(urls)];
}

// Fire and forget: a search engine not hearing about a page is a small loss,
// and never a reason to fail the request that published it.
export async function tellSearchEngines(app, what, { fetchImpl = fetch } = {}) {
  if (!indexNowReady()) return false;

  const urlList = pagesTouchedBy(what);
  if (!urlList.length) return false;

  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: host(),
        key: config.INDEXNOW_KEY,
        keyLocation: `${site()}/${config.INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    // 200 accepted, 202 accepted but the key is still being checked.
    if (!response.ok && response.status !== 202) {
      app?.log?.warn(`IndexNow answered ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    app?.log?.warn({ err: error }, "IndexNow could not be reached");
    return false;
  }
}
