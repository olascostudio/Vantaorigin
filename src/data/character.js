// Categories and characters, from the API.
//
// The pages keep the shape they always used (alias, cover, visibility, and so
// on); the two translators below map that to the API's fields, so the screens
// did not have to be rewritten when the data moved off the browser.
import { api } from "./api";

const BLANK_ENTRY = { name: "", description: "" };

const BLANK_STATS = [
  { attribute: "Strength", level: 1, note: "" },
  { attribute: "Agility", level: 1, note: "" },
  { attribute: "Durability", level: 1, note: "" },
  { attribute: "Intelligence", level: 1, note: "" },
  { attribute: "Energy", level: 1, note: "" },
];

// Shown on the marketing pages, where there is no signed-in creator.
//
// A real published character, so every ability and number here is his rather
// than something invented to fill the shape. He belongs to Heartline Comics,
// not to this site, and the credit below is the whole reason it is safe to
// show him at all.
export const DEFAULT_CHARACTER = {
  id: null,
  alias: "Hope Breaker",
  universe: "The Heartline Universe",
  cover: null,
  banner: null,
  visibility: "private",
  power: "0",
  likes: 1,
  liked: false,
  creator: "@Heartline",
  tagline: "I came to humble some false gods",
  backstory:
    "Marcus Sinclair was a highly trained soldier on a mission inside an ancient temple. During the operation, his teammate Dom Hawkins betrayed the squad, killing their fellow soldiers. Marcus fought Dom, and both fell into a mysterious pit.",
  core: {
    name: "Nether Energy",
    description:
      "Manipulates black-and-white ghostly energy to create devastating supernatural attacks, weapons, and defensive constructs.",
    extras: [
      {
        name: "Wraith Form",
        description:
          "Becomes invisible and intangible, allowing him to pass through solid objects and avoid conventional attacks.",
      },
      {
        name: "Soul Drain",
        description: "Absorbs spiritual energy from enemies to weaken them and replenish his own power.",
      },
    ],
  },
  signature: {
    name: "Soul Chains",
    description:
      "Summons chains through Wraith Zone portals that bind an opponent’s soul, completely immobilising them and preventing ability use.",
  },
  weakness: {
    name: "Anti-Wraith Technology",
    description:
      "Specialised technology can disrupt his abilities, particularly his invisibility and intangibility, leaving him open to conventional attacks.",
  },
  alignment: {
    name: "Antihero, Chaotic Good",
    description:
      "A ruthless supernatural vigilante who protects innocent people and defends the Bronx. Motivated by justice, he operates outside the law.",
  },
  assets: [],
  stats: [
    { attribute: "Strength", level: 7, note: "" },
    { attribute: "Agility", level: 8, note: "" },
    { attribute: "Durability", level: 8, note: "" },
    { attribute: "Intelligence", level: 8, note: "" },
    { attribute: "Energy", level: 9, note: "" },
  ],
};

// API row -> what the pages expect.
function toClient(row, creatorName = "") {
  const details = row.details || {};
  return {
    id: row.id,
    categoryId: row.categoryId,
    alias: row.name,
    slug: row.slug || null,
    universe: row.universe || "",
    tagline: row.tagline || "",
    backstory: row.backstory || "",
    power: row.power || "0",
    likes: row.likes ?? 0,
    liked: Boolean(row.liked),
    cover: row.coverUrl || null,
    accent: row.accent || null,
    banner: row.bannerUrl || null,
    visibility: row.isPublic ? "public" : "private",
    creator: row.creator?.username || creatorName,
    core: { ...BLANK_ENTRY, extras: [], ...(details.core || {}) },
    signature: { ...BLANK_ENTRY, ...(details.signature || {}) },
    weakness: { ...BLANK_ENTRY, ...(details.weakness || {}) },
    alignment: { ...BLANK_ENTRY, ...(details.alignment || {}) },
    stats: details.stats?.length ? details.stats : BLANK_STATS,
    assets: row.assets || [], // [{ id, url }]
  };
}

// What the pages hold -> the API's fields.
function toApi(character) {
  return {
    name: character.alias,
    categoryId: character.categoryId ?? null,
    universe: character.universe,
    tagline: character.tagline,
    backstory: character.backstory,
    power: character.power,
    coverUrl: character.cover,
    accent: character.accent ?? null,
    bannerUrl: character.banner,
    isPublic: character.visibility === "public",
    details: {
      core: character.core,
      signature: character.signature,
      weakness: character.weakness,
      alignment: character.alignment,
      stats: character.stats,
    },
  };
}

// ---- the signed-in creator's library ----

export async function loadLibrary() {
  const [categories, characters] = await Promise.all([
    api.get("/categories"),
    api.get("/characters"),
  ]);
  return { categories, characters: characters.map((row) => toClient(row)) };
}

export const addCategory = (name) => api.post("/categories", { name });
export const renameCategory = (id, name) => api.patch(`/categories/${id}`, { name });
export const deleteCategory = (id) => api.delete(`/categories/${id}`);
export const deleteCharacter = (id) => api.delete(`/characters/${id}`);

export async function loadCharacter(id) {
  if (id) {
    const characters = await api.get("/characters");
    const found = characters.find((row) => row.id === id);
    if (found) return toClient(found);
  }
  return null;
}

// A visitor's view: works signed out, and only for published characters.
export async function loadPublicCharacter(id) {
  return toClient(await api.get(`/public/characters/${id}`));
}

export async function loadPublicCharacters(limit = 24) {
  const rows = await api.get(`/public/characters?limit=${limit}`);
  return rows.map((row) => toClient(row));
}

export async function createCharacter({ categoryId, name, universe, tagline, origin, cover }) {
  const row = await api.post("/characters", {
    categoryId,
    name,
    universe,
    tagline,
    backstory: origin,
    coverUrl: cover,
    power: "0",
    details: {
      core: { ...BLANK_ENTRY, extras: [] },
      signature: { ...BLANK_ENTRY },
      weakness: { ...BLANK_ENTRY },
      alignment: { ...BLANK_ENTRY },
      stats: BLANK_STATS,
    },
  });
  return toClient(row);
}

export async function saveCharacter(character) {
  if (!character?.id) return false;
  await api.patch(`/characters/${character.id}`, toApi(character));
  return true;
}

// ---- artwork ----

// Uploads the file, then attaches it to the character.
export async function addAsset(characterId, file) {
  const { url } = await api.upload("/uploads?folder=assets", file);
  return api.post(`/characters/${characterId}/assets`, { url });
}

export const removeAsset = (assetId) => api.delete(`/assets/${assetId}`);

// Uploads an image and hands back its URL, for covers and backgrounds.
export async function uploadImage(file, folder = "covers") {
  const { url } = await api.upload(`/uploads?folder=${folder}`, file);
  return url;
}

// A cover comes back with the colour its card should be trimmed in.
export async function uploadCover(file) {
  const { url, accent } = await api.upload("/uploads?folder=covers", file);
  return { url, accent: accent || null };
}

// ---- likes ----

// Hands back the new count and whether this reader is one of the likes, so
// the card can settle on what the API says rather than on a guess.
export const likeCharacter = (id, liked) =>
  liked ? api.delete(`/characters/${id}/like`) : api.post(`/characters/${id}/like`);
