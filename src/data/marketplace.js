import portfolio from "./portfolio.json";

// Marketplace taxonomy and copy. Listings will replace the placeholder panel
// once the catalogue (and the ArtStation import) is wired up.

export const CATEGORIES = [
  {
    id: "art-design",
    label: "Art & Design",
    heading: true,
    children: [
      {
        id: "2d-art-design",
        label: "2D Art & Design",
        filters: [
          "Book & Comic Cover",
          "Comic Page & Panels",
          "Character Design",
          "Illustrations & Concept Art",
          "Posters & Promotional Arts",
        ],
      },
      {
        id: "3d-art-design",
        label: "3D Art & Design",
        filters: ["Character Modeling", "Environment Art", "Props & Assets", "Sculpting"],
      },
    ],
  },
  {
    id: "animation",
    label: "Animation",
    filters: ["2D Animation", "3D Animation", "Rigging", "Storyboards"],
  },
  {
    id: "motion-graphics",
    label: "Motion Graphics",
    filters: ["Title Sequences", "Logo Animation", "VFX", "Social Cuts"],
  },
  {
    id: "video-editing",
    label: "Video Editing",
    filters: ["Trailers", "Shorts & Reels", "Long Form", "Colour Grading"],
  },
  {
    id: "marketing-promotion",
    label: "Marketing & Promotion",
    filters: ["Campaign Art", "Ad Creatives", "Copywriting", "Community Growth"],
  },
  {
    id: "vanta-tokens",
    label: "Vanta Tokens & Utilities",
    filters: ["Token Art", "Utility Design", "Drops", "Collectibles"],
  },
];

// Flat list of the selectable categories (headings excluded).
export const SELECTABLE = CATEGORIES.flatMap((category) =>
  category.children ? category.children : [category]
);

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Post Your Project Brief:",
    body: "Tell us what you're building, what you need, your requirements, timeline, and budget.",
  },
  {
    step: "02",
    title: "Meet Your Creative:",
    body: "We match your project with a vetted creator from the VantaOrigin network whose skills fit your needs.",
  },
  {
    step: "03",
    title: "Secure the Payment",
    body: "Fund the project through our secure payment process. Payment is held until the agreed project requirements are met.",
  },
  {
    step: "04",
    title: "Create & Collaborate",
    body: "Work directly with your assigned creative while VantaOrigin provides structure throughout the project.",
  },
  {
    step: "05",
    title: "Review & Approve",
    body: "Review the completed work and request any revisions included in your project agreement.",
  },
  {
    step: "06",
    title: "Project Complete",
    body: "Once the agreed deliverables are approved, payment is released to the creator and your project is complete.",
  },
];

// --- counts from the synced ArtStation data ----------------------------------
// These recompute whenever the sync rewrites portfolio.json, so the sidebar and
// chips always show what the studio has actually posted.

const projects = portfolio.projects || [];

export const sectionCounts = projects.reduce((totals, project) => {
  totals[project.section] = (totals[project.section] || 0) + 1;
  return totals;
}, {});

export const categoryCounts = projects.reduce((totals, project) => {
  const key = `${project.section}|${project.category}`;
  totals[key] = (totals[key] || 0) + 1;
  return totals;
}, {});

export const countFor = (section, category) =>
  category ? categoryCounts[`${section}|${category}`] || 0 : sectionCounts[section] || 0;

// Categories the sync produced that aren't in the hand-written taxonomy yet,
// so new kinds of work still show up rather than vanishing.
export const extraCategoriesFor = (sectionLabel) => {
  const known = new Set(
    (SELECTABLE.find((item) => item.label === sectionLabel)?.filters || [])
  );
  return [
    ...new Set(
      projects
        .filter((project) => project.section === sectionLabel && !known.has(project.category))
        .map((project) => project.category)
    ),
  ];
};

export const lastSyncedAt = portfolio.syncedAt;
