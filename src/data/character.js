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
export const DEFAULT_CHARACTER = {
  id: null,
  alias: "Switch Face",
  realm: "The Emberforge of Creation",
  cover: null,
  banner: null,
  visibility: "private",
  power: "1.3M",
  creator: "Joseph Marine",
  tagline: "The One Who Becomes Anyone.",
  backstory:
    "Born in the underground city of Vantora District 7, Switch Face was once a top-tier illusion engineer—an elite specialist who designed holographic masks for espionage operatives. After a betrayal by his own unit, his face was erased from identity records, leaving him legally nonexistent.",
  core: {
    name: "Facial & Form Morphing Illusion",
    description:
      "Switch Face can seamlessly replicate another person’s appearance, vocal tone, and physical silhouette for short periods.",
    extras: [
      { name: "Perfect Mimicry (Short Duration)", description: "Copies a face, voice and build exactly." },
      { name: "Voice Pattern Cloning", description: "Reproduces anyone’s voice after a few seconds." },
    ],
  },
  signature: { name: "Mirror Shatter Pulse", description: "Mirrored projections flicker in all directions." },
  weakness: { name: "Identity Fracture", description: "Every mimic leaves a psychological imprint." },
  alignment: { name: "Chaotic Neutral", description: "Guided by personal vendettas more than allegiance." },
  assets: [],
  stats: [
    { attribute: "Strength", level: 6, note: "Relies on deception not brute force" },
    { attribute: "Agility", level: 8, note: "Vulnerable when illusions break" },
    { attribute: "Durability", level: 4, note: "Agile, evasive movement" },
    { attribute: "Intelligence", level: 10, note: "Highly strategic, adaptive" },
    { attribute: "Energy", level: 10, note: "Illusions are elite-tier" },
  ],
};

// API row -> what the pages expect.
function toClient(row, creatorName = "") {
  const details = row.details || {};
  return {
    id: row.id,
    categoryId: row.categoryId,
    alias: row.name,
    realm: row.realm || "",
    tagline: row.tagline || "",
    backstory: row.backstory || "",
    power: row.power || "0",
    cover: row.coverUrl || null,
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
    realm: character.realm,
    tagline: character.tagline,
    backstory: character.backstory,
    power: character.power,
    coverUrl: character.cover,
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

export async function createCharacter({ categoryId, name, realm, tagline, origin, cover }) {
  const row = await api.post("/characters", {
    categoryId,
    name,
    realm,
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
