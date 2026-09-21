// Single source of truth for the character data shown on the profile pages.
// Front-end only: it lives in localStorage until there's an API.

export const STORAGE_KEY = "vantaorigin:character-profile";

const BACKSTORY = `Born in the underground city of Vantora District 7, Switch Face was once a top-tier illusion engineer—an elite specialist who designed holographic masks for espionage operatives. After a betrayal by his own unit, his face was erased from identity records, leaving him legally nonexistent. In revenge, he fused prototype illusion tech into his nervous system, granting him the ability to shift his appearance at will.
Now he moves between worlds, never showing the same face twice—both hero and ghost, both legend and lie.`;

export const DEFAULT_CHARACTER = {
  alias: "Switch Face",
  power: "1.3M",
  creator: "Joseph Marine",
  name: "Obaalu — The Emberforge of Creation 🔥",
  tagline: "The One Who Becomes Anyone.",
  backstory: `${BACKSTORY}\n\n${BACKSTORY}`,
  core: {
    name: "Facial & Form Morphing Illusion",
    description:
      "Switch Face can seamlessly replicate another person’s appearance, vocal tone, and physical silhouette for short periods. The longer the disguise is maintained, the more it strains his mental stability.",
    extras: [
      "Perfect Mimicry (Short Duration)",
      "Voice Pattern Cloning",
      "Shadow Duplication (Decoy Projection)",
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
    { attribute: "Attack", level: 6, note: "Relies on deception not brute force" },
    { attribute: "Speed", level: 8, note: "Vulnerable when illusions break" },
    { attribute: "Defense", level: 4, note: "Agile, evasive movement" },
    { attribute: "Intelligence", level: 10, note: "Highly strategic, adaptive" },
    { attribute: "Special Ability Power", level: 10, note: "Illusions are elite-tier" },
  ],
};

export function loadCharacter() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CHARACTER, ...JSON.parse(raw) } : DEFAULT_CHARACTER;
  } catch {
    return DEFAULT_CHARACTER;
  }
}

export function saveCharacter(character) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
    return true;
  } catch {
    return false;
  }
}
