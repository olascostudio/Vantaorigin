# VantaOrigin design system: type, colour, space

A light, calm, dashboard-shaped interface for creators and visitors.
Written 17 November 2026.

Every number here was either measured in this repo, read from a published
design system, or computed from WCAG relative luminance. Where something
could not be verified it says so. Nothing is a vibe.

Companion research: `research_notes/Minimalist admin dashboard references/`
(16 November, 1,172 lines: spacing scales, sidebar shell patterns, and the
Vercel / Stripe / Linear / Plausible token systems).

---

## 1. What is wrong today, measured

### The fonts are not undefined, they are abandoned

Four families load on every page. Usage across the whole codebase:

| Token | Family | Uses |
|---|---|---|
| `font-ui` | Inter | **849** |
| `font-display` | Spicy Rice | 4 |
| `font-pill` | Instrument Sans | 2 |
| `font-body` | Comic Neue | **1** |

The site is **99.2% Inter**. Comic Neue is fetched over the network, in two
weights, for a single paragraph at `src/components/Hero.jsx:350`. Instrument
Sans exists for two pill buttons. All seven non-Inter usages are on the
landing page.

`index.html:69` requests Spicy Rice, Comic Neue at 2 weights, **Inter at six
weights** and Instrument Sans in one render-blocking call: **17.5KB of CSS
before a single font file is fetched**.

`README.md:44` explains how this happened: the Figma design used SF Pro and
General Sans, neither licensed for web, so Inter was substituted. The other
three are fragments of that compromise, not decisions.

### The contrast failures, ranked by usage

Measured against the six real backgrounds in the codebase:

| Colour | Uses | Page `#0e0e0e` | Card `#1e2637` | Panel `#222b3c` | Hub `#222c40` |
|---|---|---|---|---|---|
| `text-neutral-500` | **33** | 4.07 | 3.19 | 2.99 | 2.95 |
| `text-primary` `#fc187b` | 20 | 5.11 | 4.00 | 3.76 | 3.70 |
| `text-accent` `#bd7132` | 6 | 5.12 | 4.02 | 3.77 | 3.71 |
| `text-secondary` `#9333ea` | 3 | 3.59 | 2.81 | 2.64 | 2.60 |
| `text-neutral-600` | 3 | 2.47 | 1.94 | 1.82 | **1.79** |

AA for body text is 4.5:1. Everything above fails somewhere; the top row
fails everywhere. `text-neutral-600` at 1.79 on a hub panel is near invisible.

Fine, and already the most used: `text-neutral-300` (73 uses, 9.4 to 13.0)
and `text-neutral-400` (79 uses, 5.5 to 7.7).

**The pattern underneath:** every brand colour passes on the near-black page
and fails on the raised surfaces. Cards got lighter and nobody re-measured.

### Going light does not carry the palette across

| | On `#0e0e0e` | On white |
|---|---|---|
| Pink `#fc187b` | 5.11 passes | **3.78 fails** |
| Purple `#9333ea` | **3.59 fails** | 5.38 passes |

The colours swap roles. This is the single most important fact for the move,
and it is why the palette below is rebuilt rather than inverted.

---

## 2. Type

### The decision

**Inter Variable** for everything in the interface.
**Bricolage Grotesque Variable** for display headings only, if you want
personality.

Both SIL OFL 1.1, both self-hosted, both variable.

Inter because it is already 99.2% of the site, it is neutral enough to
disappear, and it has **verified tabular figures**, which matters the moment
there is an orders table with money in it.

Bricolage Grotesque because it carries an **optical-size axis (`opsz` 12 to
96)**: it can be characterful at 48px and perfectly plain at 16px, from one
file. For a comics and character platform that wants personality without
looking like generic SaaS, that is the right tool. Axes: `opsz` 12-96,
`wdth` 75-100, `wght` 200-800. Latin only.

Rejected, with reasons:

- **Satoshi, General Sans, Clash Display, Cabinet Grotesk** (Fontshare): not
  OFL. They use the Indian Type Foundry's own licence, and its exact terms
  could not be read in this research. The README already claims General Sans
  is not licensed for web, which conflicts with secondary sources. **Read the
  licence file that ships with the download before using any of them.**
- **Anton, Boldonse**: too heavy and condensed for anything but a single
  poster-style hero.
- **Spicy Rice, Comic Neue, Instrument Sans**: replaced. Spicy Rice's job
  goes to Bricolage at a large optical size.

### The scale

Triangulated from IBM Carbon's type sets, GitHub Primer's typography
primitives and Atlassian's tokens, which agree closely. rem against a 16px
root.

| Role | Mobile (360px) | Desktop | Weight | Notes |
|---|---|---|---|---|
| Page title | 24px / 32 | 32px / 40 | 600 | Carbon heading-05, Primer Title large |
| Section heading | 20px / 28 | 20px / 28 | 600 | Carbon heading-03, Atlassian Heading M |
| Card title | 16px / 24 | 16px / 24 | 600 | Carbon heading-02, Primer Title small |
| Body, dense | 14px / 20 | 14px / 20 | 400 | Carbon body-01, Atlassian Body M |
| Body, reading | 16px / 24 | 16px / 24 | 400 | Carbon body-02, Atlassian Body L |
| Small / meta | 12px / 16 | 12px / 16 | 400 | Carbon label-01, Atlassian Body S |
| Table cell | 14px / 20 | 14px / 20 | 400 | plus `tabular-nums` |
| Table header | 12px / 16 | 12px / 16 | 600 | |

**Two body sizes on purpose.** 14px in the creator dashboard, where density
helps. 16px on visitor-facing pages, where reading does. Carbon makes exactly
this split (productive vs expressive) and it is the right one here: creators
scan, readers read.

**Weights: 400 body, 500 UI labels and buttons, 600 headings.** Carbon and
Primer both stop at 600 and never use 700 for text. The current build loads
six Inter weights including 800 and 900; three are enough.

**Numbers in columns** get Tailwind's `tabular-nums` class on the cell, right
aligned. Verified on Inter. Never on headings.

### Loading

Self-host. **Google Fonts gives no cross-site caching benefit any more** —
browser caches have been partitioned since Chrome 86 in October 2020, so a
font fetched from `fonts.googleapis.com` is not shared with any other site.
All it costs now is a third-party connection and a render-blocking request.

```
npm i @fontsource-variable/inter @fontsource-variable/bricolage-grotesque
```

Import in `src/main.jsx`, delete the `<link>` and the two `preconnect` lines
from `index.html`, preload only the Inter Latin woff2, `font-display: swap`.
Latin and latin-ext subsets only. Fontsource does not set a default
`font-display`, so set it explicitly.

```js
// tailwind.config.js
fontFamily: {
  sans:    ["'Inter Variable'", "Inter", "system-ui", "sans-serif"],
  display: ["'Bricolage Grotesque Variable'", "'Bricolage Grotesque'", "sans-serif"],
}
```

Three tokens become two. `font-ui`, `font-body` and `font-pill` all collapse
into `sans`; `font-display` keeps its name and changes its face. That is 852
of 856 usages renaming to one token.

---

## 3. Colour

**Decided: warm paper, purple primary.** Light, warm, every value measured
against both surfaces it can appear on.

### Surfaces

| Token | Hex | Role |
|---|---|---|
| `paper` | `#f4f4f0` | the page behind everything |
| `surface` | `#fffffe` | cards, panels, the sidebar |
| `line` | `#e5e3dc` | decorative edges between surfaces |
| `control-line` | `#908a7e` | the edge of an input or a button |

Warm paper costs nothing in contrast: pure black on `#f4f4f0` is 19.05:1
against 19.59 on a cool grey. What it buys is a page that reads as paper
rather than as a tool, which is the right register for a comics publisher.

**Two border colours, deliberately.** `line` at `#e5e3dc` measures 1.16:1 on
paper. That is fine for separating a card from the page, because the two
surfaces already differ, and **not** fine as the only thing marking a
control's edge, where WCAG 1.4.11 wants 3:1. `control-line` at `#908a7e`
measures 3.11:1 and can carry an input border. Using the pale one on form
fields is the most common way a light UI fails an audit.

### Text: a warm ramp, not the cool one

| Token | Hex | On paper | On surface | |
|---|---|---|---|---|
| `ink` | `#1c1a17` | 15.75 | 17.35 | headings |
| `body` | `#3d3933` | 10.40 | 11.46 | body text |
| `muted` | `#6b6459` | 5.30 | 5.84 | meta, captions, table headers |

These replace the blue-grey ramp from the admin work (`#1b2233`, `#39435a`,
`#677181`). Those were measured against a cool grey page and hold up fine
there, but blue-grey text on warm paper reads muddy: the two casts fight. The
warm ramp above hits the same contrast targets with the same hue family as
the page.

The lesson from the old `muted` still applies: it was deliberately `#677181`
rather than the obvious `#6b7585`, because that one measures 4.66 on white
and **4.35 on the page**, and fails there. A muted tone has to be checked
against the *darker* of the two surfaces, which is why `#6b6459` above is
quoted on paper first.

### Brand: purple

The pink is out. It was a second designer's addition, not the original
identity, and the measurements never liked it anyway: `#fc187b` is 3.78:1
both as text and under white text, so a filled pink button with a normal-size
white label fails AA on any light surface.

Every purple candidate passes on warm paper, both as text and carrying white:

| Hex | As text on paper | White text on it |
|---|---|---|
| `#5b21b6` | 8.15 | 8.98 |
| `#6a28a8` | 7.67 | 8.46 |
| `#6d28d9` | 6.44 | 7.10 |
| `#7c3aed` | 5.17 | 5.70 |
| `#9333ea` | 4.88 | 5.38 |

### The original design, sampled

The original export was pixel-sampled rather than eyeballed. It is a 290x2000
preview, so flat areas are reliable and fine detail is not.

**Pink is 0.053% of the image. Purple is 5.96%.** A ratio of 112 to 1. The
pink was added later; it is not in the identity.

Dominant surfaces, which are 68.5% of the whole design:

| Hex | Share | Role |
|---|---|---|
| `#111628` | 45.67% | page |
| `#1b2337` | 22.85% | card / raised surface |

Note what that means for the current build: the card `#1e2637` in the repo is
almost exactly the original `#1b2337` and survived intact, but the page
drifted from a **navy** `#111628` to a flat near-black `#0e0e0e`. The design
lost its blue cast somewhere and nobody noticed.

The structural purples, past the nebula artwork, cluster at **`#7130ad`** and
**`#4e278c`**. `#7130ad` is rgb(113,48,173) against the spec's own deep
purple `#6a28a8` at rgb(106,40,168): the same colour inside compression
error.

**So the brand purple is `#6a28a8`**, which was sitting in the build spec all
along, and it is not `#9333ea`.

### Why the pink happened, and why light fixes it

On the original dark surfaces the brand purple is **unreadable as text**:

| Colour | On page `#111628` | On card `#1b2337` |
|---|---|---|
| `#6a28a8` | **2.12** | **1.85** |
| `#9333ea` | **3.34** | **2.91** |
| `#fc187b` | 4.75 | 4.14 |

The purple never was a text colour in that design. It is a fill, a glow, a
gradient, an artwork colour. The pink, at 4.75 on the page, is the only one
of the three that reads.

So the pink was not arbitrary. It was a workaround for a real problem: the
brand colour could not be used for a link or a label on a dark page. It
solved that the wrong way, by changing the brand.

The light interface solves it the right way. On warm paper the identical
purple measures **7.67 as text and 8.46 under white**. Same colour, opposite
role: a surface colour in the dark identity, a text colour in the light
workspace. Nothing needs inventing.

### Two surfaces, one identity

The original is dark and the dashboard should be light, and that is not a
contradiction. It is the split researched earlier: expressive brand,
calm interface.

- **Public and marketing pages** keep the dark cosmic identity: page
  `#111628`, surface `#1b2337`, purple as fill and glow, artwork carrying it.
- **The creator dashboard and any working surface** use warm paper, the warm
  neutral ramp, and purple as the text and link colour.

The purple is the hinge. It is the one value that is literally the same on
both sides.

### Status

| Token | Hex | On white | On page |
|---|---|---|---|
| `success` | `#15803d` | 5.02 | 4.68 |
| `danger` | `#b91c1c` | 6.47 | 6.04 |
| `warning` | `#92400e` | 7.09 | 6.61 |
| `info` | `#1d4ed8` | 6.70 | 6.25 |

All four pass on both surfaces. These came out of fixing the admin, where
five status colours were failing and a green "Yes" measured 1.74:1.

**Never use colour alone for status.** An order state needs a word, not just
a dot.

### What this replaces

`background #0e0e0e`, `surface #3c3c3c`, `line #1c1c1c`, `subtext #acacac`,
`plum #1c1224`, `auth-bg #111827` all go. `secondary` (the purple) becomes
the primary and keeps or deepens its value. `primary` (the pink) is retired,
not translated. `accent #bd7132` has no role here either.

Scale of the change: `text-primary` has 20 usages and `bg-primary` more, so
removing the pink is a visible edit across the site, not a token swap. It
should wait for the original design rather than be guessed at.

---

## 4. Space

From the November research. Three systems converge on an 8px base with a
three-step set for padding and gaps.

**Scale**: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80. Tailwind's default
spacing already matches this; no config change needed.

**The three-step rule** (Primer states it as tokens): **8 / 16 / 24** for
condensed, normal and spacious, covering both container padding and gaps
between things. Reserve 32 to 80 for separating page-level regions.

Carbon's guidance, worth following: deviating from the scale should be
avoided, and a layout may step *down* the scale at smaller breakpoints. Their
worked example drops 16px at 1440px to 8px at 768px.

**Card**: 16px padding mobile, 24px desktop. **Gap between cards**: 16px.
**Page gutter**: 16px at 360px, 24px at 768px, 32px and up beyond.

---

## 5. Shape and elevation

On light surfaces, elevation comes from a border plus a very small shadow,
not from a big soft one. The current dark UI leans on surface lightness,
which has no equivalent here.

- **Radius**: 12px for cards and inputs, 8px for small controls, full for
  pills and avatars. Pick one and hold it; the current codebase has
  `rounded-[25px]`, `rounded-[42.105px]` and `rounded-2xl` in play.
- **Shadow**: one step only, `0 1px 2px rgb(16 24 40 / 0.05)`. A second,
  larger step for overlays and menus. Nothing else.
- **Focus**: a 2px `brand` ring at `#6a28a8`, which measures 8.46 against
  white and 7.89 against the page, both well past the 3:1 a focus indicator
  needs. **Draw it inside the element** when the container clips, which is
  how the creators-page ring disappeared: an `outline-offset-2` on a box
  inside `overflow-hidden` is cut away entirely.

---

## 6. References, with honest access notes

Your galleries fight automation. What actually happened:

| Source | Result |
|---|---|
| Behance | **Renders in a real browser**, blocks plain fetching |
| Dribbble | Did not render; search results readable as text only |
| Mobbin | HTTP 403, blocked |
| saasinterface.com | Certificate not valid, unreachable today |
| Ko-fi, lapa.ninja | HTTP 403 |
| Read.cv | HTTP 402 |
| collectui.com | HTTP 522 |

Behance search for minimal creator dashboards returns 2,000+ results, but
almost all are fintech, AI and CRM concept shots rather than shipping product
UI. The two genuinely on-topic:

- [TikTok Creator Tracker 2026 — Minimalist Dashboard UI](https://www.behance.net/gallery/251062003/TikTok-Creator-Tracker-2026-Minimalist-Dashboard-UI)
- [Clearhouse — Creator Partnerships Paid on Proof](https://www.behance.net/gallery/257462099/Clearhouse-Creator-Partnerships-Paid-on-Proof)

Neither is visually verified: the thumbnails lazy-load and did not paint.

### What I did look at directly

**[Gumroad](https://gumroad.com)** — the most useful reference for you, and
visually verified. Page `#f4f4f0`, a warm paper white rather than pure white.
Text pure black, so roughly 19:1. Buttons black with white text and
**`border-radius: 0`**, completely square. The h1 is **96px at weight 400** —
enormous and *light*, not bold. No CSS custom properties at all.

The lesson: its personality comes from three decisions, warm paper, square
corners, and huge light headings, not from decoration. That is exactly the
"minimal but not generic" you asked for, and it costs nothing to read.

**[Cara](https://cara.app)** — the closest thing to VantaOrigin that exists,
an artist portfolio and social platform. Pure black `#000`, white text, and
**the default Tailwind system font stack with no custom face at all**. It
disappears typographically and lets the artwork carry everything. Worth
sitting with, because it is the opposite bet from Gumroad's and also works.

### Published light systems with real values

- **GitHub Primer**: page `#ffffff`, muted `#f6f8fa`, border `#d1d9e0`, text
  `#1f2328`. Note how close that is to the palette above: Primer's border is
  `#d1d9e0` against our `#e6e8ec`, and their text `#1f2328` against our
  `#1b2233`.
- **Vercel Geist**: publishes token names and a `.md` version of every docs
  page, but the hex values did not render for either researcher.
- **Stripe, Polaris, Radix**: values not retrieved this pass.

---

## 7. The spec's section 10, as a checklist

The build spec asks for these by name. Where each is answered:

- **Mobile first** — two body sizes, the 360px column of the type scale, and
  the page gutter stepping 16/24/32.
- **Design tokens in one place so a designer can restyle without a rewrite**
  — everything in sections 2 to 5 belongs in `tailwind.config.js` as named
  tokens. No raw hex in components. The current codebase has `bg-[#1e2637]`
  and `bg-[#222c40]` scattered through it, which is precisely what made the
  contrast drift invisible.
- **Clear empty, loading and error states for every screen** — not a colour
  question, but the one rule worth writing down now: a failure and an
  emptiness are different things and must never both be shown. The creators
  page printed "we could not load" and "nobody has published anything yet"
  stacked together, one of them false.
- **Escrow reassurance in one short line, delivery estimate before payment,
  total visible before paying** — content, carried by the `muted` token at
  12px, and these must not be the pale border colour's job.

---

## What this costs

The type change is mechanical: 852 of 856 font-token usages rename to one
token, three families leave, and `index.html` loses a render-blocking
request. Half a day.

The colour change is not mechanical, because it is a dark-to-light inversion
across every page, and the brand colours change role. That is a real piece of
work and should be done surface by surface, measuring as it goes, starting
with the creator dashboard where the light palette already exists and is
proven.

## Decided

1. **Warm paper**, `#f4f4f0`, with the warm neutral ramp.
2. **Purple primary.** The pink is retired: it came from a second designer,
   not the original identity.
3. **Bricolage Grotesque** for display, Inter for everything else.

4. **Brand purple `#6a28a8`**, confirmed by sampling the original design and
   matching the build spec's own deep purple. Not `#9333ea`.
5. **Two surfaces**: dark navy for the public identity, warm paper for the
   working interface.

## Still open

1. **What replaces the pink's job on the dark side.** On `#111628` the pink
   was the only one of the three that could be a link or a label. If the dark
   pages keep purple as fill only, they need a readable accent for text that
   is not white. A light violet tint would do it: anything around `#c4a5e8`
   measures well past 4.5 on both dark surfaces, and keeps the hue.
2. **Does the page go back to navy `#111628`?** The build drifted to
   `#0e0e0e` and lost the blue cast the original had.
3. **The display face in the original.** Bricolage may be standing in for
   something that already exists; the preview is too small to identify a
   typeface from.
