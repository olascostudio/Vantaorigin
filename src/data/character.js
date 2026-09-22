// Single source of truth for the creator's categories and characters.
// Front-end only: it lives in localStorage until there's an API.

import { readImage } from "./readImage";

export { readImage };

export const LIBRARY_KEY = "vantaorigin:characters";
// Where a single character was stored before categories existed.
const LEGACY_KEY = "vantaorigin:character-profile";

const BACKSTORY = `Born in the underground city of Vantora District 7, Switch Face was once a top-tier illusion engineer—an elite specialist who designed holographic masks for espionage operatives. After a betrayal by his own unit, his face was erased from identity records, leaving him legally nonexistent. In revenge, he fused prototype illusion tech into his nervous system, granting him the ability to shift his appearance at will.
Now he moves between worlds, never showing the same face twice—both hero and ghost, both legend and lie.`;

export const DEFAULT_CHARACTER = {
  // Filled from the create-character form; the rest is edited on the profile.
  alias: "Switch Face", // character name
  realm: "The Emberforge of Creation", // the universe they belong to
  cover: null, // uploaded card art (data URL); null falls back to the sample art
  banner: null, // background behind the origin story; null uses the default art
  visibility: "private", // "public" shows it on Discover
  power: "1.3M",
  creator: "Joseph Marine",
  tagline: "The One Who Becomes Anyone.",
  backstory: `${BACKSTORY}\n\n${BACKSTORY}`,
  core: {
    name: "Facial & Form Morphing Illusion",
    description:
      "Switch Face can seamlessly replicate another person’s appearance, vocal tone, and physical silhouette for short periods. The longer the disguise is maintained, the more it strains his mental stability.",
    extras: [
      {
        name: "Perfect Mimicry (Short Duration)",
        description: "Copies a face, voice and build exactly, but only holds it for a few minutes.",
      },
      {
        name: "Voice Pattern Cloning",
        description: "Reproduces anyone’s voice after hearing a few seconds of it.",
      },
      {
        name: "Shadow Duplication (Decoy Projection)",
        description: "Throws a moving decoy of himself to draw attacks away.",
      },
    ],
  },
  signature: {
    name: "Mirror Shatter Pulse",
    description:
      "Switch Face releases a burst of mirrored projections—illusions flicker in all directions, confusing enemies and masking his true position. During this time, only the real Switch Face casts a visible shadow.",
  },
  weakness: {
    name: "Identity Fracture",
    description:
      "Every mimic made leaves a psychological imprint—memories, emotions, fragments of personality. Too many forms at once risks identity collapse; he must constantly reaffirm who he actually is, or lose himself to the personas he wears.",
  },
  alignment: {
    name: "Chaotic Neutral",
    description:
      "Switch Face is unpredictable—guided more by personal vendettas and instincts than moral allegiance. He will help the weak if it benefits his goals, but he has no loyalty to any side.",
  },
  assets: [],
  stats: [
    { attribute: "Strength", level: 6, note: "Relies on deception not brute force" },
    { attribute: "Agility", level: 8, note: "Vulnerable when illusions break" },
    { attribute: "Durability", level: 4, note: "Agile, evasive movement" },
    { attribute: "Intelligence", level: 10, note: "Highly strategic, adaptive" },
    { attribute: "Energy", level: 10, note: "Illusions are elite-tier" },
  ],
};

// Stat names used before the rename.
const RENAMED_STATS = {
  Attack: "Strength",
  Speed: "Agility",
  Defense: "Durability",
  "Special Ability Power": "Energy",
};

// Older saves stored extra abilities as plain strings and had no realm field.
function migrate(saved) {
  const next = { ...DEFAULT_CHARACTER, ...saved };
  next.stats = (next.stats || []).map((row) => ({
    ...row,
    attribute: RENAMED_STATS[row.attribute] || row.attribute,
  }));
  if (saved.core) {
    next.core = {
      ...saved.core,
      extras: (saved.core.extras || []).map((extra) =>
        typeof extra === "string" ? { name: extra, description: "" } : extra
      ),
    };
  }
  // Blob URLs die with the tab that made them, so drop any that were saved.
  next.assets = (next.assets || []).filter((asset) => !String(asset).startsWith("blob:"));
  if (String(next.cover).startsWith("blob:")) next.cover = null;
  return next;
}

const BLANK_ENTRY = { name: "", description: "" };

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function writeLibrary(library) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    return true;
  } catch {
    return false;
  }
}

// { categories: [{ id, name }], characters: [{ id, categoryId, ...profile }] }
export function loadLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) {
      const library = JSON.parse(raw);
      return {
        categories: library.categories || [],
        characters: (library.characters || []).map(migrate),
      };
    }

    // First run after categories shipped: file the old single character.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const category = { id: newId(), name: "My Characters" };
      const library = {
        categories: [category],
        characters: [{ ...migrate(JSON.parse(legacy)), id: newId(), categoryId: category.id }],
      };
      writeLibrary(library);
      localStorage.removeItem(LEGACY_KEY);
      return library;
    }
  } catch {
    // unreadable storage behaves like an empty library
  }
  return { categories: [], characters: [] };
}

export function addCategory(name) {
  const library = loadLibrary();
  const category = { id: newId(), name: name.trim() };
  writeLibrary({ ...library, categories: [...library.categories, category] });
  return category;
}

// Removes the category and every character filed under it.
export function deleteCategory(id) {
  const library = loadLibrary();
  writeLibrary({
    categories: library.categories.filter((category) => category.id !== id),
    characters: library.characters.filter((character) => character.categoryId !== id),
  });
}

// A character by id; without one, the most recently created. The sample
// character stands in when nothing has been made yet.
export function loadCharacter(id) {
  const { characters } = loadLibrary();
  const found = id ? characters.find((character) => character.id === id) : characters.at(-1);
  return found || DEFAULT_CHARACTER;
}

export function saveCharacter(character) {
  if (!character.id) return false; // the sample is read-only
  const library = loadLibrary();
  return writeLibrary({
    ...library,
    characters: library.characters.map((existing) =>
      existing.id === character.id ? character : existing
    ),
  });
}

export function deleteCharacter(id) {
  const library = loadLibrary();
  writeLibrary({
    ...library,
    characters: library.characters.filter((character) => character.id !== id),
  });
}

// A fresh profile built from the create-character form. Everything the form
// doesn't ask for starts blank for the creator to fill in on the profile.
export function createCharacter({
  categoryId,
  name,
  realm,
  tagline,
  origin,
  creator,
  cover,
  visibility = "private",
}) {
  const library = loadLibrary();
  const character = {
    ...DEFAULT_CHARACTER,
    id: newId(),
    categoryId,
    power: "0",
    core: { ...BLANK_ENTRY, extras: [] },
    signature: { ...BLANK_ENTRY },
    weakness: { ...BLANK_ENTRY },
    alignment: { ...BLANK_ENTRY },
    // keep the attribute rows, reset their values
    stats: DEFAULT_CHARACTER.stats.map(({ attribute }) => ({ attribute, level: 1, note: "" })),
    alias: name,
    realm,
    tagline,
    backstory: origin,
    creator,
    cover,
    visibility,
    assets: [],
  };
  writeLibrary({ ...library, characters: [...library.characters, character] });
  return character;
}

