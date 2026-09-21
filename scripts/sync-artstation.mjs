// Pulls the studio's ArtStation posts into src/data/portfolio.json.
//
// ArtStation has no official API, so this uses two public endpoints:
//   - users/{user}/projects.json  the catalogue (paged, 50 at a time)
//   - {user}.rss                  large images, most recent 50 posts only
// Both need a browser User-Agent or Cloudflare answers 403.
//
// Images already captured stay in the file, so the archive grows over time
// even though the RSS window keeps moving.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const USER = process.env.ARTSTATION_USER || "vantaoriginstudio";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "portfolio.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const MAX_PAGES = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cloudflare fingerprints the client: Node's own fetch gets a 403 on the JSON
// endpoint while curl sails through, so curl does the fetching and fetch() is
// only a fallback for hosts where curl is missing.
async function get(url, { json = false } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { stdout } = await run(
        "curl",
        ["-sSL", "--compressed", "--max-time", "45", "-H", `User-Agent: ${UA}`, "-w", "\\n%{http_code}", url],
        { maxBuffer: 64 * 1024 * 1024 }
      );
      const split = stdout.lastIndexOf("\n");
      const status = Number(stdout.slice(split + 1).trim());
      const body = stdout.slice(0, split);
      if (status === 200) return json ? JSON.parse(body) : body;
      lastError = new Error(`${status} for ${url}`);
    } catch (error) {
      lastError = error;
      // no curl on this machine — try Node's fetch instead
      if (error.code === "ENOENT") {
        const response = await fetch(url, { headers: { "User-Agent": UA } });
        if (response.ok) return json ? response.json() : response.text();
        lastError = new Error(`${response.status} for ${url}`);
      }
    }
    if (attempt < 3) await sleep(attempt * 2000);
  }

  throw lastError;
}

async function fetchProjects() {
  const collected = [];
  let total = Infinity;

  for (let page = 1; page <= MAX_PAGES && collected.length < total; page += 1) {
    const data = await get(
      `https://www.artstation.com/users/${USER}/projects.json?page=${page}`,
      { json: true }
    );
    total = data.total_count ?? collected.length;
    if (!data.data?.length) break;
    collected.push(...data.data);
    await sleep(1200); // be a polite visitor
  }

  return collected;
}

// hash id -> large image urls, scraped from the RSS feed
async function fetchImages() {
  const xml = await get(`https://www.artstation.com/${USER}.rss`);
  const byHash = new Map();

  for (const chunk of xml.split("<item>").slice(1)) {
    const link = (chunk.match(/<link>([^<]+)<\/link>/) || [])[1] || "";
    const hash = (link.match(/artwork\/([A-Za-z0-9]+)/) || [])[1];
    if (!hash) continue;
    const images = [
      ...new Set([...chunk.matchAll(/https:\/\/cdn[a-z]?\.artstation\.com[^"'\s<)]+/g)].map((m) => m[0])),
    ].filter((url) => /\/(large|original|medium)\//.test(url));
    if (images.length) byHash.set(hash, images);
  }

  return byHash;
}

// Sections and categories come from the post titles, since the studio's posts
// carry no tags. Tags win when they exist, so tagging on ArtStation makes this
// exact instead of inferred. Order matters: the most specific rule first.
const RULES = [
  { test: /\b3d\b|low.?poly|sculpt|zbrush|blender|maya/, section: "3D Art & Design", categories: [
    [/character|creature|figure/, "Character Modeling"],
    [/environment|architecture|scene|world|map/, "Environment Art"],
    [/sculpt/, "Sculpting"],
    [/./, "Props & Assets"],
  ] },
  { test: /\banim(ation|ated)?\b|\brig(ging)?\b|storyboard/, section: "Animation", categories: [
    [/3d/, "3D Animation"],
    [/rig/, "Rigging"],
    [/storyboard/, "Storyboards"],
    [/./, "2D Animation"],
  ] },
  { test: /motion graphic|title sequence|logo anim|vfx/, section: "Motion Graphics", categories: [
    [/title/, "Title Sequences"],
    [/logo/, "Logo Animation"],
    [/vfx/, "VFX"],
    [/./, "Social Cuts"],
  ] },
  { test: /video edit|trailer|reel\b|colou?r grad/, section: "Video Editing", categories: [
    [/trailer/, "Trailers"],
    [/reel|short/, "Shorts & Reels"],
    [/grad/, "Colour Grading"],
    [/./, "Long Form"],
  ] },
  { test: /brand|identity|graphic design|marketing|flyer|advert|campaign/, section: "Marketing & Promotion", categories: [
    [/campaign/, "Campaign Art"],
    [/advert|flyer/, "Ad Creatives"],
    [/copy/, "Copywriting"],
    [/./, "Campaign Art"],
  ] },
  { test: /token|nft|collectible/, section: "Vanta Tokens & Utilities", categories: [
    [/utility/, "Utility Design"],
    [/drop/, "Drops"],
    [/collectible/, "Collectibles"],
    [/./, "Token Art"],
  ] },
  // default: everything else is 2D work
  { test: /./, section: "2D Art & Design", categories: [
    [/cover/, "Book & Comic Cover"],
    [/comic|panel|strip/, "Comic Page & Panels"],
    [/poster|promo/, "Posters & Promotional Arts"],
    [/character/, "Character Design"],
    [/./, "Illustrations & Concept Art"],
  ] },
];

function classify(title, tags) {
  const haystack = `${title} ${(tags || []).join(" ")}`.toLowerCase();
  const rule = RULES.find((candidate) => candidate.test.test(haystack));
  const [, category] = rule.categories.find(([pattern]) => pattern.test(haystack));
  return { section: rule.section, category };
}

// Titles come in two shapes:
//   "Cover Art Done By Carlos Idrobo of VantaOrigin Studio"
//   "3D Assets . Bruno Diaz . Vantaorigin Studio"
function artistFor(title) {
  const doneBy = title.match(/done by ([^]+?) of vantaorigin/i);
  if (doneBy) return doneBy[1].trim();

  const parts = title.split(/\s*\.\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3 && /vantaorigin/i.test(parts[parts.length - 1])) {
    return parts[parts.length - 2];
  }
  return "VantaOrigin Studio";
}

async function readExisting() {
  try {
    const raw = await readFile(OUT, "utf8");
    const parsed = JSON.parse(raw);
    return new Map((parsed.projects || []).map((project) => [project.id, project]));
  } catch {
    return new Map();
  }
}

async function main() {
  const [raw, images, existing] = await Promise.all([
    fetchProjects(),
    fetchImages().catch(() => new Map()), // RSS is a bonus, not a blocker
    readExisting(),
  ]);

  if (!raw.length) throw new Error("No projects returned — leaving the existing file alone.");

  const projects = raw
    .map((project) => {
      const previous = existing.get(project.hash_id);
      const { section, category } = classify(project.title, project.tag_list);
      return {
        id: project.hash_id,
        title: project.title,
        artist: artistFor(project.title),
        section,
        category,
        description: (project.description || "").split("\n").filter(Boolean)[0] || "",
        permalink: project.permalink,
        cover: project.cover?.thumb_url || project.cover?.small_square_url || null,
        // keep images we captured on an earlier run once RSS moves past them
        images: images.get(project.hash_id) || previous?.images || [],
        publishedAt: project.published_at,
        likes: project.likes_count,
      };
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const payload = {
    source: `artstation:${USER}`,
    profile: `https://www.artstation.com/${USER}`,
    syncedAt: new Date().toISOString(),
    totalCount: projects.length,
    projects,
  };

  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  const withImages = projects.filter((project) => project.images.length).length;
  console.log(`Synced ${projects.length} projects (${withImages} with full images).`);
}

main().catch((error) => {
  console.error(`ArtStation sync failed: ${error.message}`);
  process.exit(1);
});
