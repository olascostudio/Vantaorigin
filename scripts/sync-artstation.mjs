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
// Every post in the feed, not only its pictures: the newest fifty, which is
// all ArtStation puts there. Used on its own when the JSON is refused.
async function fetchFeed() {
  const xml = await get(`https://www.artstation.com/${USER}.rss`);
  const posts = [];

  for (const chunk of xml.split("<item>").slice(1)) {
    const link = (chunk.match(/<link>([^<]+)<\/link>/) || [])[1] || "";
    const hash = (link.match(/artwork\/([A-Za-z0-9]+)/) || [])[1];
    if (!hash) continue;

    const rawTitle = decode((chunk.match(/<title>([^]*?)<\/title>/) || [])[1] || "");
    // The feed appends " by <studio>" to every title; the site does not.
    const title = rawTitle.replace(/\s+by\s+Vantaorigin\s+Ent\.?$/i, "").trim() || rawTitle;
    const published = (chunk.match(/<pubDate>([^<]+)<\/pubDate>/) || [])[1];
    const images = [
      ...new Set([...chunk.matchAll(/https:\/\/cdn[a-z]?\.artstation\.com[^"'\s<)]+/g)].map((m) => m[0])),
    ].filter((url) => /\/(large|original|medium)\//.test(url));

    posts.push({
      hash,
      title,
      permalink: link,
      images,
      publishedAt: published ? new Date(published).toISOString() : new Date().toISOString(),
    });
  }

  return posts;
}

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
// ArtStation keeps every size of a picture at the same address with one
// path segment changed: .../100/060/110/<size>/<file>.jpg. The project
// endpoint that would list a piece's other images is behind Cloudflare, so
// this is how a sharp picture is had without it.
const SIZES = /\/(micro_square|smaller_square|small_square|medium|large|4k)\/(?=[^/]+$)/;

const atSize = (url, size) => (url && SIZES.test(url) ? url.replace(SIZES, `/${size}/`) : url);

// The feed carries every picture, but only for the newest fifty posts. Older
// work keeps whatever an earlier run captured, and failing that shows its
// cover at full size -- which beats blowing up a thumbnail. An empty list
// counts as nothing, so mind the length rather than the array.
function fullImages(fromFeed, previous, rawCover) {
  if (fromFeed?.length) return fromFeed;
  const kept = (previous?.images || []).filter((image) => !image.includes("_square"));
  if (kept.length) return kept;
  return rawCover ? [atSize(rawCover, "large")] : [];
}

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
    return {
      payload: parsed,
      byId: new Map((parsed.projects || []).map((project) => [project.id, project])),
    };
  } catch {
    return { payload: null, byId: new Map() };
  }
}

// ArtStation answers the JSON endpoints only for addresses it likes: both
// GitHub's runners and our own host get a 403 challenge page, while the feed
// is served to either without complaint. So when the JSON is refused we take
// what the feed gives, the newest work, its pictures and when it was posted,
// and leave everything an earlier full run learned exactly as it was.
//
// The feed says nothing about which album a piece belongs to, so new work
// arrives under "Latest Work" and is filed properly by the next full run.
const LATEST_ALBUM = {
  id: 0,
  title: "Latest Work",
  slug: "latest-work",
  url: `https://www.artstation.com/${USER}`,
  count: 0,
};

async function syncFromFeed(previous, reason) {
  console.log(`ArtStation refused the album data (${reason}); reading the feed instead.`);
  if (!previous) throw new Error("Nothing to build on: no earlier sync to keep.");

  const posts = await fetchFeed();
  if (!posts.length) throw new Error("The feed came back empty.");

  const known = new Map((previous.projects || []).map((project) => [project.id, project]));
  const added = [];

  for (const post of posts) {
    const existing = known.get(post.hash);
    if (existing) {
      // Keep it where it is; only fill in pictures it never had.
      if (!existing.images?.length && post.images.length) existing.images = post.images;
      continue;
    }

    added.push({
      id: post.hash,
      title: post.title,
      artist: artistFor(post.title),
      albumId: LATEST_ALBUM.id,
      album: LATEST_ALBUM.title,
      description: "",
      permalink: post.permalink,
      cover: post.images[0] ? atSize(post.images[0], "small_square") : null,
      images: post.images,
      publishedAt: post.publishedAt,
      likes: 0,
    });
  }

  const projects = [...added, ...known.values()].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
  );

  const albums = (previous.albums || []).filter((album) => album.id !== LATEST_ALBUM.id);
  const waiting = projects.filter((project) => project.albumId === LATEST_ALBUM.id).length;
  if (waiting) albums.unshift({ ...LATEST_ALBUM, count: waiting });

  // The other albums keep the counts ArtStation gave them. A piece can sit in
  // several albums there while living in one here, so counting our own rows
  // would quietly shrink every category.

  await writeWhenChanged({ albums, projects, previous });
  console.log(`Feed sync: ${added.length} new, ${projects.length} in total.`);
}

// Shared by both paths: the file is only rewritten when the work changed, so
// a scheduled run that finds nothing new makes no commit.
async function writeWhenChanged({ albums, projects, previous }) {
  const unchanged =
    previous &&
    JSON.stringify({ albums: previous.albums, projects: previous.projects }) ===
      JSON.stringify({ albums, projects });

  if (unchanged) {
    console.log("Nothing new on ArtStation; the file stands as it is.");
    return false;
  }

  await writeFile(
    OUT,
    `${JSON.stringify(
      {
        source: `artstation:${USER}`,
        profile: `https://www.artstation.com/${USER}`,
        syncedAt: new Date().toISOString(),
        albums,
        totalCount: projects.length,
        projects,
      },
      null,
      2
    )}\n`
  );
  return true;
}

async function main() {
  const previousFile = await readExisting();
  const existing = previousFile.byId;

  // ArtStation refuses the JSON to datacenter addresses, so the scheduled
  // run skips straight to the feed rather than spending a minute being told
  // no three times.
  if (process.env.ARTSTATION_FEED_ONLY === "1") {
    return syncFromFeed(previousFile.payload, "asked for feed-only");
  }

  let albums;
  let images;
  try {
    [albums, images] = await Promise.all([
      fetchAlbums(),
      fetchImages().catch(() => new Map()), // the feed is a bonus here, not a blocker
    ]);
  } catch (error) {
    // Refused the JSON: take what the feed gives rather than nothing at all.
    return syncFromFeed(previousFile.payload, error.message);
  }

  if (!albums.length) throw new Error("No albums returned, leaving the existing file alone.");

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
      const rawCover = project.cover?.thumb_url || project.cover?.small_square_url || null;
      projects.push({
        id: project.hash_id,
        title: decode(project.title),
        artist: artistFor(project.title),
        albumId: album.id,
        album: album.title,
        description: decode((project.description || "").split("\n").filter(Boolean)[0] || ""),
        permalink: project.permalink,
        // The grid shows a square, so a square crop is the one to fetch --
        // one size up from the default, which was soft on a good screen.
        cover: atSize(rawCover, "small_square"),
        // The feed carries every picture for recent work. For everything
        // older, the cover at full size beats showing a thumbnail blown up.
        images: fullImages(images.get(project.hash_id), previous, rawCover),
        publishedAt: project.published_at,
        likes: project.likes_count,
      });
    }
  }

  projects.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  await writeWhenChanged({ albums, projects, previous: previousFile.payload });
  console.log(`Synced ${albums.length} albums, ${projects.length} projects:`);
  for (const album of albums) console.log(`  ${String(album.count).padStart(3)}  ${album.title}`);
}

main().catch((error) => {
  console.error(`ArtStation sync failed: ${error.message}`);
  process.exit(1);
});
