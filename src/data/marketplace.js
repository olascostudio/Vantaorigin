// Marketplace copy. The categories themselves come from ArtStation albums in
// portfolio.json; see scripts/sync-artstation.mjs.

import portfolio from "./portfolio.json";

export const ALBUMS = portfolio.albums || [];
export const PROJECTS = portfolio.projects || [];
export const lastSyncedAt = portfolio.syncedAt;

// artistsIn counted the artists inside an album for the chip row above the
// grid. The chips are gone, and nothing else asked the question, so it went
// with them rather than sitting here as an export with no callers. The
// artist is still on each project, which is what the search reads.

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
