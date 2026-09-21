// Pulls the studio's ArtStation albums and their work into
// src/data/portfolio.json, which drives the marketplace portfolio.
//
// The albums ARE the marketplace categories: add an album on ArtStation and it
// shows up on the site on the next sync. Nothing here is hardcoded.
//
// ArtStation has no official API, so this leans on three public endpoints:
//   users/{user}/quick.json              the album list, with titles and order
//   users/{user}/projects.json?album_id= the work inside an album (paged)
//   {user}.rss                           large images, newest 50 posts only
// All of them need a browser User-Agent, and Cloudflare rejects Node's fetch
// on the JSON ones, so curl does the fetching.
//
// Images captured on an earlier run are kept, so the archive grows even as the
// RSS window moves on.

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
// endpoints while curl sails through, so curl leads and fetch() is the fallback
// for machines without it.
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

const decode = (text = "") =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

const slugify = (text) =>
  decode(text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// The albums the studio has made, in the order they're arranged on ArtStation.
// "All" is ArtStation's built-in bucket, not a real category.
async function fetchAlbums() {
  const profile = await get(`https://www.artstation.com/users/${USER}/quick.json`, { json: true });
  return (profile.albums_with_community_projects || [])
    .filter((album) => album.title && album.title.toLowerCase() !== "all")
    .sort((a, b) => a.position - b.position)
    .map((album) => ({
      id: album.id,
      title: decode(album.title),
      slug: slugify(album.title),
      url: `https://www.artstation.com/${USER}/albums/${album.id}`,
      count: album.total_projects ?? 0,
    }));
}

async function fetchAlbumProjects(album) {
  const collected = [];
  let total = Infinity;

  for (let page = 1; page <= MAX_PAGES && collected.length < total; page += 1) {
    const data = await get(
      `https://www.artstation.com/users/${USER}/projects.json?album_id=${album.id}&page=${page}`,
      { json: true }
    );
    total = data.total_count ?? collected.length;
    if (!data.data?.length) break;
    collected.push(...data.data);
    await sleep(1000); // be a polite visitor
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
    const parsed = JSON.parse(await readFile(OUT, "utf8"));
    return new Map((parsed.projects || []).map((project) => [project.id, project]));
  } catch {
    return new Map();
  }
}

async function main() {
  const [albums, images, existing] = await Promise.all([
    fetchAlbums(),
    fetchImages().catch(() => new Map()), // RSS is a bonus, not a blocker
    readExisting(),
  ]);

  if (!albums.length) throw new Error("No albums returned — leaving the existing file alone.");

  const projects = [];
  const seen = new Set();

  for (const album of albums) {
    const raw = await fetchAlbumProjects(album);
    album.count = raw.length;

    for (const project of raw) {
      // a piece can sit in more than one album; first album wins as its home
      if (seen.has(project.hash_id)) continue;
      seen.add(project.hash_id);

      const previous = existing.get(project.hash_id);
      projects.push({
        id: project.hash_id,
        title: decode(project.title),
        artist: artistFor(project.title),
        albumId: album.id,
        album: album.title,
        description: decode((project.description || "").split("\n").filter(Boolean)[0] || ""),
        permalink: project.permalink,
        cover: project.cover?.thumb_url || project.cover?.small_square_url || null,
        images: images.get(project.hash_id) || previous?.images || [],
        publishedAt: project.published_at,
        likes: project.likes_count,
      });
    }
  }

  projects.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const payload = {
    source: `artstation:${USER}`,
    profile: `https://www.artstation.com/${USER}`,
    syncedAt: new Date().toISOString(),
    albums,
    totalCount: projects.length,
    projects,
  };

  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Synced ${albums.length} albums, ${projects.length} projects:`);
  for (const album of albums) console.log(`  ${String(album.count).padStart(3)}  ${album.title}`);
}

main().catch((error) => {
  console.error(`ArtStation sync failed: ${error.message}`);
  process.exit(1);
});
