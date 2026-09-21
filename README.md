# VantaOrigin — Landing Page

React + Tailwind CSS + Vitest, built from the Figma design (Landing - Desktop,
node `3:613`).

## Setup

```bash
npm install
npm run dev      # start dev server
npm test         # run Vitest suite
npm run build    # production build
```

## What's here

`src/App.jsx` renders the sections in design order:

| Component | Figma frame |
| --- | --- |
| `Hero.jsx` (+ `Navbar.jsx`) | Herosection |
| `Realms.jsx` | Section 2 — Create Your Realm |
| `CommunityWorlds.jsx` | Explore Worlds carousel |
| `HowItWorks.jsx` | How VantaOrigin Works |
| `Features.jsx` | Builders + Featured Creators |
| `CreateTogether.jsx` | Create Together banner |
| `Footer.jsx` | Footer + logo pattern |

Shared helpers: `SectionHeading.jsx`, and `Rotated.jsx` (reproduces Figma's
rotated layers for the hero cards and background curves).

Tests: `src/App.test.jsx` and `src/components/*.test.jsx`.

## Assets

All images and icons live in `src/assets/landing/<section>/` and are imported
directly, so nothing depends on Figma's temporary asset URLs.

Several exported images are very large (up to 9 MB, 4096px PNGs). Compress or
resize them (e.g. to WebP at ~2x display size) before shipping.

## Fonts

Loaded from Google Fonts in `index.html`: Spicy Rice (display), Comic Neue
(hero subtitle), Inter (UI) and Instrument Sans (pill buttons). The design also
uses SF Pro and General Sans, which aren't licensed for web use; Inter is used
in their place.

## Design tokens

Defined in `tailwind.config.js`: `background`, `surface`, `line`, `subtext`,
`primary`, `secondary`, `accent`, `plum`, plus the `shadow-block` (offset white
CTA block) and `shadow-card` shadows.

## Known approximations

- Glass/blur effects (navbar, badges, carousel arrows) aren't included in
  Figma's code export and are approximated with `backdrop-blur`.
- The Create Together background crop is approximated with `object-position`.
- The footer's pink logo row uses the brand logo mark; the white row uses the
  exported pattern logos.
- The hidden "01–04" step numbers in How It Works (same colour as the
  background in Figma) are omitted.
