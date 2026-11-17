# Minimalist light-theme admin & dashboard UIs in shipping products

Scope note: this researcher prioritised **primary sources with numbers in them** — published design systems, official docs, and open-source product code — over design-blog commentary. Where only secondary commentary exists, it is labelled as such. Several of the products named in the assignment brief (Notion, Height, Raycast, Basecamp) could not be substantiated with primary design documentation and are recorded in Gaps rather than written up from listicles.

**Source-quality warning for the report writer:** a general web search for "minimal dashboard UI" returns almost entirely SEO content-farm listicles (adminlte.io, setproduct.com, 925studios.co, pixelean.com, aydesign.ai and similar), many dated 2026 and apparently AI-generated, which cite no primary evidence and contradict each other. None of those were used as the basis for any measurement below.

**Prompt-injection note:** the Linear blog post at `linear.app/blog/how-we-redesigned-the-linear-ui` contains text addressed to AI agents instructing them to connect to a Linear MCP server. This was treated as page data and ignored. Flagging it because other researchers fetching Linear pages will hit the same thing.

---

## Which shipping products are actually cited as examples of restrained, minimal admin/dashboard UI?

### Takeaway
Only four of the suggested products have *primary* published design documentation detailed enough to copy from: **Vercel (Geist)**, **Stripe (Stripe Apps design tokens, which exist specifically to match the Dashboard)**, **Linear (a 2024 redesign write-up, qualitative only)** and **Plausible Analytics (fully open source, so the real shipping CSS is readable)**. Of these, Plausible and Stripe are genuinely light-theme-first; Vercel's Geist documents light and dark as equals; Linear and Resend are dark-first.

### Cited Findings
- Vercel publishes Geist as a public design system with per-token usage rules, at `/geist/colors`, `/geist/text`, `/geist/materials` — [Geist colors](https://vercel.com/geist/colors); [Geist text](https://vercel.com/geist/text); [Geist materials](https://vercel.com/geist/materials)
- Appending `.md` to any Geist/Vercel docs URL returns the page as Markdown — useful for anyone re-checking these values — [Geist space](https://vercel.com/geist/space)
- Stripe publishes the design tokens used to style apps embedded in the Dashboard, stating the explicit purpose: "You can style a Stripe App using design tokens that we provide. This helps you match the Dashboard visually, provide consistency, and maintain a high quality bar." — [Stripe Apps: Style your app](https://docs.stripe.com/stripe-apps/style)
- Linear published "How we redesigned the Linear UI", dated **28 March 2024** (now ~2.5 years old; flag as older per the brief) — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Linear has further design writing: "Design is more than code" by Karri Saarinen (Dec 2025), and Karri Saarinen's 10 rules for crafting products on the Figma blog — [Linear blog](https://linear.app/blog/design-is-more-than-code); [Figma blog](https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/)
- A plushcap summary describes a **March 2026 Linear interface refresh** focused on clarity and reduced visual clutter; the original post was not located — [plushcap](https://www.plushcap.com/companies/linear/blog/summaries/2026/03)
- Plausible Analytics' real stylesheet ships at `assets/css/app.css` in the public repo, with button/input/tooltip component classes and a `@theme` token block — [plausible/analytics app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
- Resend publishes a brand/design system at `resend.com/design.md` whose first stated principle is "**Dark-first design**" — [Resend design](https://resend.com/design.md)
- No official Stripe blog post about a *Dashboard* redesign was found. The substantial recent Stripe design coverage is about the **homepage** redesign (launched January 2026), discussed by Head of Design Katie Dill with Y Combinator — [Y Combinator podcast](https://pocketcasts.com/podcast/y-combinator-startup-podcast/7a564520-1cc3-0135-52f8-452518e2d253/stripe-head-of-design-katie-dill-breaks-down-their-new-website/5cbb5e23-a2c4-4e6b-bcf7-013f8a0e7945)
- Stripe's Merchant Dashboard was led in 2022 by Matt Stromawn, whose stated goals were to "unify the dashboard experience, simplify the information architecture", with responsiveness called out as one of the hardest parts — [Matt Stromawn portfolio](https://mattstromawn.com/projects/stripe-dashboard/)

### Inferences
- For a **light-theme** admin tool, Plausible and Stripe are the two highest-value references, because one is readable source code and the other is an officially published token set. Vercel's Geist is the best *structural* reference (its step-role model), but it ships no spacing scale publicly.
- Resend should be **excluded as a light-theme exemplar** under the brief's constraint — its own design doc says dark-first, and its palette is built from translucent values over black (e.g. gray background `#16171AEB`) that have no light-mode equivalent. Its *typographic restraint* is still transferable (see below).
- The absence of an official Stripe Dashboard design post, despite Stripe's reputation for design writing, suggests the Stripe Apps token docs are the closest thing to a published Stripe Dashboard spec that exists.

### Gaps
- **Notion, Height, Raycast, Basecamp**: no primary design documentation found. A targeted search for Basecamp/37signals specifically failed to confirm the common claim that Basecamp deliberately omits a dashboard — in fact early Basecamp shipped a "Dashboard" control center in 2004, and 2012's Basecamp Next was pitched as a cleaner UI without mention of removing it. Treat "Basecamp has no dashboard" as **unconfirmed** — [signalvnoise 2004](https://signalvnoise.com/archives/000528); [SiliconAngle 2012](https://siliconangle.com/2012/02/16/basecamp-goes-back-to-the-basics-with-a-new-cleaner-ui)
- No conference talk or designer interview was located that discusses admin/dashboard chrome specifically (as opposed to marketing site or company design culture).

---

## Navigation: sidebar vs top bar, grouping, collapsibility, icons, width

### Takeaway
There is **no published width figure** from any of these companies — this is the single biggest gap in the research and should not be filled with invented numbers. What *is* documented is structural: Linear describes its chrome as an "inverted L-shape" (sidebar + header) and explicitly chose **not** to redesign navigation because it was too risky.

### Cited Findings
- Linear's redesign targeted "the global chrome", which Karri Saarinen described as an **"inverted L-shape"** that controls the main view — i.e. a left sidebar plus a top header — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Linear **deliberately left navigation out of scope**: the team judged it too risky because it needed significant engineering work and would change how users interact with the product — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Linear adjusted "the sidebar, tabs, headers, and panels" to reduce visual noise, keep elements aligned, and **increase hierarchy and navigation density** — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Linear aligned "labels, icons, and buttons in the sidebar and tabs vertically and horizontally"; because Linear runs on Electron, Apple design standards guided the sidebar and tabs toward a native feel, and previous/next buttons, history and tabs were made easy to remove for browser use — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Geist's text scale designates `text-label-14` (Strong) as "the most common style, **used in menus**" — i.e. nav items are 14px label-style, not body-copy style — [Geist text](https://vercel.com/geist/text)
- Resend mandates **sentence case** for "headings, buttons, labels, and navigation" — no Title Case or ALL-CAPS nav — [Resend design](https://resend.com/design.md)
- Plausible's interactive controls are built on a shared height scale so that buttons and inputs line up: `btn-xs` = `h-8` (32px) with `px-2`, `btn-sm` = `h-9` (36px) with `px-3`, `btn-md` = `h-10` (40px) with `px-3.5` (14px). A code comment states: "Inputs use the same size scale as buttons so the two line up side by side." — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
- Secondary/commentary only: one aggregated search summary reports sources disagreeing on whether Stripe uses a top nav or a sidebar, and notes Linear "leans on a sidebar for its many views" — treat as unreliable — [search aggregation of design blogs](https://adminlte.io/blog/admin-dashboard-design/)

### Inferences
- The strongest *transferable* navigation finding is a negative one: Linear, a team famous for UI craft, considered navigation the highest-risk surface to change and shipped a whole visual redesign around it in ~6 weeks rather than touch it. For a nine-section admin tool, this argues for settling IA early and treating nav chrome as near-frozen.
- "Increase navigation density" is the opposite of the typical admin-template instinct (large padded nav rows). Combined with 14px label type and sentence case, this points to compact nav rows with text-led labels.
- Plausible's shared button/input height scale (32/36/40px) is directly copyable as the control rhythm for an admin toolbar, and implies nav/toolbar items should be built from the same three heights rather than ad-hoc padding.

### Gaps
- **Sidebar width in px for any of these products: not published anywhere found.** Linear's post contains no pixel or rem values at all. Geist publishes no layout/sidebar component spec. This would require direct measurement of the live products (DevTools), which was outside what these sources could answer.
- Whether any of these sidebars are collapsible, and whether nav groups have headers, is not documented in any primary source found. Linear's post mentions "tabs" and "panels" but does not describe grouping.
- Geist has a `/geist/grid` page described as "a core part of the Vercel aesthetic" that was not fetched; it may contain layout columns/gutters.

---

## Density: whitespace, spacing rhythm, type sizes and weights, total colour count

### Takeaway
This is where the primary sources are strongest. **Stripe publishes an 8-token spacing scale (0, 2, 4, 8, 16, 24, 32, 48px) that deliberately skips 12, 20 and 40.** Linear reduced its theme from **98 variables to 3**. Resend ships only **four product type sizes**. These are the concrete, copyable numbers.

### Cited Findings

**Spacing — Stripe (official, and explicitly Dashboard-matching):**
- The complete spacing scale for margins, padding and layout gaps is exactly eight tokens — [Stripe Apps: Style](https://docs.stripe.com/stripe-apps/style):

  | Token | Value |
  |---|---|
  | `0` | 0px |
  | `xxsmall` | 2px |
  | `xsmall` | 4px |
  | `small` | 8px |
  | `medium` | 16px |
  | `large` | 24px |
  | `xlarge` | 32px |
  | `xxlarge` | 48px |

- Stripe's layout system is **stack-based, not grid-based**: "We conceptualize layouts as 'stacks'", with `stack: 'x' | 'y' | 'z'`, plus `gap`, `gapX`/`gapY`, `alignX`, `alignY`, `distribute: 'space-between' | 'packed'`, and `wrap` — [Stripe Apps: Style](https://docs.stripe.com/stripe-apps/style)
- Stripe sizing is **fractional, not fixed-px**: halves, thirds, quarters, fifths, sixths and twelfths (`1/4` = 25%, `fill` = 100%), plus content-based `min`/`max`/`fit` — [Stripe Apps: Style](https://docs.stripe.com/stripe-apps/style)
- Stripe constrains fonts deliberately: "Unlike in vanilla CSS, you can't choose arbitrary font faces and styles. Use the `font` and `fontWeight` properties." — [Stripe Apps: Style](https://docs.stripe.com/stripe-apps/style)

**Spacing — Vercel:**
- Geist's `Stack` component documents `gap` as "a unit on a **4px grid scale**", with padding using the same scale — [Geist Stack](https://vercel.co/geist/stack)

**Colour — Linear (the headline finding):**
- Linear moved theme generation from HSL to **LCH**, a perceptually uniform colour space — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- The system went **from 98 variables per theme to 3**: base colour, accent colour, and contrast — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- A `contrast` variable supports very high-contrast accessible themes; the post compares contrast values of **30 and 100** — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Linear **limited use of the accent colour (blue) in colour calculations**, and tuned the system to increase overall contrast and make the look "more neutral and timeless" — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Text and neutral icons are **darker in light mode and lighter in dark mode**; light and dark themes use the same generation system as custom themes — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Elevation is expressed as discrete **surface levels** — background, panels, dialogs, modals — not as arbitrary shadows — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)

**Colour — Vercel Geist (the step-role model):**
- 10 scales total: `backgrounds`, `gray`, `gray-alpha`, `blue`, `red`, `amber`, `green`, `teal`, `purple`, `pink`. P3 colours on supported displays — [Geist colors](https://vercel.com/geist/colors)
- Every non-background scale has **exactly 10 steps (100–1000) with fixed semantic roles** — [Geist colors](https://vercel.com/geist/colors):
  - 100 default background · 200 hover background · 300 active background
  - 400 default border · 500 hover border · 600 active border
  - 700 high-contrast background · 800 hover high-contrast background
  - 900 secondary text/icons · 1000 primary text/icons
- The `backgrounds` scale has only **two** values: Background 1 (`var(--ds-background-100)`) default, Background 2 (`var(--ds-background-200)`) secondary — [Geist colors](https://vercel.com/geist/colors)
- Stated usage rules — [Geist colors](https://vercel.com/geist/colors):
  - "Use **gray by default** for text, icons, fills, borders, and dividers." `gray-alpha` only where the background should show through (shadows, overlays).
  - "Use Background 1 in most cases... Background 2 is for subtle differentiation and should be used **sparingly**."
  - If a component's default background is Background 1, use Color 1 for hover and Color 2 for active. On small elements like badges, Color 2 or 3 can be the background.
  - "Use **solid gray for borders by default**"; matching gray-alpha step only when an edge must blend.
  - "**Draw each border once**: keep dividers inside the border and avoid overlapping alpha borders, which make intersections stand out."
  - "Keep material shadows **translucent** so they blend with the background. Opaque shadows leave a gray halo."

**Colour — Plausible (real shipping light theme):**
- Plausible remaps Tailwind's defaults in its `@theme` block: **gray → zinc**, **green → emerald**, **yellow → amber** (full 50–950 ranges aliased) — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
- The single accent is **indigo**: primary button is `bg-indigo-600` with `hover:bg-indigo-700`; focus rings are `ring-indigo-500` — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
- Light-mode borders are `gray-300` (= zinc-300) for controls; the global base layer sets `border-color: var(--color-gray-200, currentColor)` on `*`, `::after`, `::before`, `::backdrop` — so **every border defaults to zinc-200** — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
- Light-mode secondary button: `border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:text-gray-900` — white surface, one-step hover — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
- Exactly one custom colour step is added outside Tailwind's ramps: `--color-gray-750: rgb(50 50 54)`, used only in dark mode — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
- Ghost button in light mode has **transparent border and no background until hover**: `border border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-100 hover:border-gray-100` — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)

**Typography — counts:**
- Geist documents **29 text classes total** across four families: Headings (`text-heading-72/64/56/48/40/32/24/20/16/14`), Buttons (`text-button-16/14/12`), Label (`text-label-20/18/16/14/13/12` + mono variants), Copy (`text-copy-24/20/18/16/14/13` + mono) — [Geist text](https://vercel.com/geist/text)
- Geist splits single-line from multi-line type as a hard rule: **Label** styles are for single lines "with generous line height for icon alignment"; **Copy** styles are for multi-line text with higher line height. `text-copy-14` and `text-label-14` are each flagged as "most commonly used" in their family — [Geist text](https://vercel.com/geist/text)
- Geist reserves specific sizes for density: `text-label-13` is "secondary line beside other labels; **tabular for numbers**", `text-label-12` is "tertiary text in **busy views**", `text-button-12` is only "tiny button inside an input field" — [Geist text](https://vercel.com/geist/text)
- Geist expresses weight as **modifiers, not separate sizes**: Subtle and Strong are applied by nesting a `<strong>` element inside a typography class — [Geist text](https://vercel.com/geist/text)
- Resend ships only **four product text sizes** (excluding marketing display faces) — [Resend design](https://resend.com/design.md):

  | Style | Font | Weight | Size / Line |
  |---|---|---|---|
  | xlarge | Favorit | Regular | 24 / 32 |
  | large | Inter | Regular/Medium | 18 / 28 |
  | medium | Inter | Regular/Medium/Semi Bold | 16 / 24 |
  | small | Inter | Regular | 14 / 20 |
  | code | CommitMono | Regular | 14 / 20 |

- Resend's marketing display sizes are explicitly walled off from product UI: Domaine Display Narrow is for "display headlines only, **never in product UI**" — [Resend design](https://resend.com/design.md)
- Linear uses **two cuts of one typeface**: Inter Display for headings "for more expression", regular Inter for all other text — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Plausible's body/control size is `text-sm` (14px) with `font-medium` on buttons; tooltips use `text-[0.8125rem]/5` (13px / 20px line height) at the small size and `text-sm` at the large size — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)

**Radii:**
- Geist radii collapse to **three values across eight tokens** — 6px (`material-base`, `material-small`, `material-tooltip`), 12px (`material-medium`, `material-large`, `material-menu`, `material-modal`), 16px (`material-fullscreen`) — [Geist materials](https://vercel.com/geist/materials)
- Plausible uses `rounded-md` (6px in Tailwind) uniformly for buttons and inputs — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)

### Inferences
- **The skipped steps in Stripe's scale are the point.** A scale of 2/4/8/16/24/32/48 with no 12, 20 or 40 forces decisions into a coarse rhythm; you cannot nudge something 4px to "fix" a layout. For a nine-section admin tool this is the most directly copyable density decision found: 8px for intra-component gaps, 16px for card padding and card-to-card gaps, 24–32px for section gaps, 48px reserved for page-level separation.
- Geist's 4px grid and Stripe's scale are compatible (every Stripe token is a multiple of 2, and all but `xxsmall` of 4), so a 4px base with a restricted set of permitted multiples is the common pattern.
- Linear's 98 → 3 variables and Geist's fixed 10-step role model solve the same problem differently: Linear *generates* colour from three inputs; Vercel *constrains* colour by assigning each step exactly one job. For a small admin tool, Geist's role model is the more practical: one gray ramp where 400 is always the border and 900/1000 are always the text means you never pick a colour, you pick a role.
- Counting actual distinct values in a light admin build following Plausible: roughly **one neutral ramp (zinc) + one accent (indigo) + three status hues (emerald/amber/red)** = 5 hues total, with the accent appearing only on primary buttons and focus rings. That matches the brief's example of "one accent colour used only on primary buttons."
- Type-size count converges on **4–6 sizes** for a product UI (Resend ships 4; Plausible effectively uses 13/14px plus a couple of heading sizes; Geist's 29 classes are a *library* covering marketing and product, not a per-screen budget). Geist's Label-vs-Copy split suggests the right axis to vary is line height, not size.
- Weight: Resend uses Regular/Medium/Semi Bold (3), Plausible uses `font-medium` on controls, Geist uses Strong/Subtle modifiers. **Two to three weights is the ceiling** across all of them.

### Gaps
- **Geist publishes no spacing scale page.** `/geist/space` contains no px scale, base unit, token names, or gap/section rules — it only links onward to `/geist/grid` and `/geist/materials`. Third-party reconstructions of Vercel spacing contradict each other (one lists 2/4/6/8/12/16/32 unitless; another lists xs–xl as 4/8/16/32/48px) and all carry disclaimers that they are not official. **Do not cite any Vercel spacing number other than the 4px grid.**
- Geist publishes **no hex values** on the colors page — token names only. No stroke/fill values appear on the materials page either.
- Geist's text page gives **no px/rem, line-height, letter-spacing or weight values** — the class names encode the size (e.g. `text-label-14` = 14px) but the actual line heights live in a Figma file or Tailwind config not published.
- Stripe's colour token **values** are not published: the docs list the *properties* (`backgroundColor`, `keyline`, `color`, `fill`) and say tokens are exposed via TypeScript autocomplete, but the token tables render empty in the fetched page. Token names recovered from examples only: `backgroundColor: 'container'`, `keyline: 'neutral'`, `color: 'success' | 'primary'`.
- Stripe's `font` token names are likewise not enumerated beyond `font: 'heading'`.
- Third-party sources claim Stripe uses the proprietary **Söhne** typeface at weight 300 for large headings, tabular numerals for financial data, and `#F6F9FC` page background / `#533afd` purple accent. **These are explicitly disclaimed by their own publishers as unofficial reconstructions and should not be treated as fact** — [styles.refero.design](https://styles.refero.design/style/48e5de76-05d5-4c4e-a269-c7c245b291ec)

---

## How do they show statistics and key numbers?

### Takeaway
No primary source documents a "stat card" component. The one hard, published signal is typographic: **Geist mandates tabular figures for numbers** (`text-label-13` is "tabular for numbers"), and Stripe's `Divider` + `keyline` vocabulary suggests numbers are separated by rules rather than boxed in cards. Everything about bordered-vs-borderless cards here comes from secondary commentary and should be flagged as such.

### Cited Findings
- Geist specifies `text-label-13` as the style for "secondary line beside other labels; **tabular** for numbers", and `text-label-14-mono` / `text-label-13-mono` / `text-label-12-mono` exist as mono pairings — [Geist text](https://vercel.com/geist/text)
- Stripe provides a `Divider` component used *between* items inside a stack, alongside `keyline: 'neutral'` borders on `Box` — i.e. two distinct separation primitives — [Stripe Apps: Style](https://docs.stripe.com/stripe-apps/style)
- Stripe's `distribute: 'space-between'` on a horizontal stack is the documented pattern for pushing items to opposite ends of a row — the standard label-left/value-right stat row — [Stripe Apps: Style](https://docs.stripe.com/stripe-apps/style)
- Geist permits a tinted background on small elements: "On small elements like badges, Color 2 or 3 can serve as the background" — a very low-contrast badge, one or two steps off the surface — [Geist colors](https://vercel.com/geist/colors)
- Plausible's tooltip (used for chart/stat hover detail) is the **only** component in its stylesheet that carries a shadow: `shadow-md` at small size (`px-2.5 py-1.5`, 13px/20px text) and `shadow-lg` at large (`px-3 py-2`, 14px text) — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
- Plausible maps `green → emerald` and `yellow → amber` and keeps `red` for danger, giving a three-hue status vocabulary for deltas and states — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
- Resend's semantic colour table assigns each hue exactly one job: Red "critical states and irreversible actions"; Amber "caution and pending states"; Green "success and completion"; Blue "interactive and informational elements"; Gray "structure, hierarchy, subtle separation" — [Resend design](https://resend.com/design.md)
- Resend's fourth stated principle: "**Accent colors communicate state, not style**" — [Resend design](https://resend.com/design.md)
- Secondary commentary only, from design blogs with no primary evidence: that Stripe's primary surface is "a dense, impeccably-set table" with charts as summaries above it rather than the main event; that Stripe shows 3–4 primary numbers; that Stripe uses green for successful and red only for failed payments; that Linear's default view is an issue list with analytics moved one click away under Insights; that Vercel's monochrome UI lets status colours (green/amber/red) carry all semantic weight — [aggregated design-blog summary](https://adminlte.io/blog/admin-dashboard-design/)

### Inferences
- Tabular figures are the one unambiguous, free win: both Geist (explicitly) and Stripe (per unverified third-party reports about financial data) point at tabular numerals, and it is the difference between a stat row that reads as data and one that jitters.
- The combination of Geist's "draw each border once / keep dividers inside the border" rule and Stripe's `Divider`-inside-a-stack pattern implies the dominant pattern is **one bordered container subdivided by dividers**, not N separately-bordered cards. For a row of four KPIs that means a single bordered strip with three internal dividers — which also eliminates the double-border artifact at card edges.
- Plausible's evidence is strong on the negative side: in a shipping analytics dashboard whose whole job is displaying numbers, **no shadow appears on any content surface** — the only shadows in the stylesheet are on floating tooltips.
- Colour on numbers: every primary source restricts hue to *state*, never to decoration. A delta may be emerald or red because up/down is a state; the number itself should be `gray-1000`-equivalent.

### Gaps
- **No primary source describes a stat/metric card component** for any of these products — not bordered vs borderless, not padding, not how many metrics per row. The brief's specific question ("cards with borders, cards without borders, plain text, or a table?") cannot be answered from published documentation. Answering it would require measuring the live products.
- Stripe's actual Dashboard chart and metric treatment is undocumented publicly; the Stripe Apps docs cover embedded app surfaces, not Stripe's own metric displays.
- Plausible's dashboard markup lives in React components under `assets/js/dashboard/` (the stylesheet references `components/button.tsx`) which were not read; the per-card classes are there for anyone who wants exact values.

---

## What do they deliberately leave OUT?

### Takeaway
The most load-bearing omission is **shadows on content surfaces**: Plausible's shipping CSS has none outside tooltips, Linear replaced elevation with named surface levels, and Stripe's entire `Box`/`Inline` styling API exposes no shadow or elevation property at all. Second is **arbitrary values**: Stripe removes the ability to choose fonts or px spacing; Linear reduced theme inputs to three.

### Cited Findings
- **Shadows, Stripe:** the documented styling surface for `Box` and `Inline` consists of `backgroundColor`, `keyline` (borders), `color`/`fill`, `font`/`fontWeight`, text overflow/transform/align, the stack layout properties, spacing, and sizing. **No shadow, elevation, boxShadow or dropShadow token appears anywhere in the page** — [Stripe Apps: Style](https://docs.stripe.com/stripe-apps/style)
- **Shadows, Plausible:** the only `shadow-*` utilities in the stylesheet are `shadow-md`/`shadow-lg` on tooltips, plus `shadow-none` used twice to *remove* shadows (`disabled:hover:shadow-none` on the danger button, `dark:shadow-none` on the dark tooltip) and `box-shadow: none` to strip the form plugin's checkbox/radio focus shadow — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
- **Shadows, Linear:** elevation is handled through discrete surface levels (background, panels, dialogs, modals) rather than shadow values — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- **Shadows, Vercel:** where shadows exist they are constrained to four named materials in increasing order — `material-tooltip` (lightest), `material-menu` ("lifted from the page"), `material-modal` ("further lift"), `material-fullscreen` ("biggest lift") — all of them **floating** elements, none of them content cards. And they must be translucent: "Opaque shadows leave a gray halo" — [Geist materials](https://vercel.com/geist/materials); [Geist colors](https://vercel.com/geist/colors)
- **Arbitrary fonts, Stripe:** "Unlike in vanilla CSS, you can't choose arbitrary font faces and styles" — [Stripe Apps: Style](https://docs.stripe.com/stripe-apps/style)
- **Arbitrary px spacing, Stripe:** spacing is only settable from the eight named tokens; widths are fractions (`1/4`, `fill`) or content-based (`min`/`max`/`fit`) — [Stripe Apps: Style](https://docs.stripe.com/stripe-apps/style)
- **Per-component override, Stripe:** "Some components style themselves automatically. For example, Chips automatically change their appearance depending on what callbacks they implement... To avoid confusion, **you can't override these details**." Icons support only `fill` — [Stripe Apps: Style](https://docs.stripe.com/stripe-apps/style)
- **Coloured icons, Vercel/Stripe:** Geist says use gray by default for "text, **icons**, fills, borders, and dividers". Stripe says "icons match the text around them" unless deliberately contrasted with `fill` — [Geist colors](https://vercel.com/geist/colors); [Stripe Apps: Style](https://docs.stripe.com/stripe-apps/style)
- **Double borders, Vercel:** "Draw each border once: keep dividers inside the border and avoid overlapping alpha borders, which make intersections stand out" — [Geist colors](https://vercel.com/geist/colors)
- **Heavy secondary surfaces, Vercel:** Background 2 "should be used sparingly" — [Geist colors](https://vercel.com/geist/colors)
- **Gradients and texture, Resend:** Resend *does* ship gradients, a noise texture and `backdrop-filter: blur(25px)` glass — but these are documented for "hero backgrounds and atmospheric depth" on marketing pages, and Domaine Display is banned from product UI — [Resend design](https://resend.com/design.md)
- **Decoration, Resend:** stated principles include "Precision and focus over decoration" and "Simple, stable, intentional forms" — [Resend design](https://resend.com/design.md)
- **Visual noise, Linear:** the sidebar, tabs, headers and panels were adjusted specifically "to reduce visual noise"; headers and filters were simplified, "especially in the Inbox" — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- **Counter-example — avatars are kept, Linear:** notifications were reorganised around notification type "with teammates' **faces emphasized**" — so Linear deliberately *adds* avatar prominence in a social surface — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- **Focus rings are kept, Plausible:** Plausible goes out of its way to preserve visible focus for keyboard users while hiding it for mouse users: `*:focus-visible { ring-2 ring-indigo-500 ring-offset-2 outline-none }`, `:focus:not(:focus-visible) { outline-none }`, and it replaces the Tailwind forms plugin's `:focus` shadow with `:focus-visible` on checkboxes and radios. It also sets `cursor: pointer` on all enabled `button` and `[role="button"]` elements — [plausible app.css](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)

### Inferences
- **Shadow removal is the single highest-leverage change** for making a light admin look restrained, and it is the best-evidenced finding in this research — three independent primary sources (Stripe's token API, Plausible's shipping CSS, Linear's surface-level model) converge on shadows being for floating elements only. In a light theme the replacement is a 1px border at the gray-400-equivalent step (Geist) or zinc-200/300 (Plausible).
- Stripe's docs are effectively a published argument that **removing capability is a design decision**: no arbitrary fonts, no arbitrary px, no overriding chip styles. The analogue for a small admin tool is to expose only tokens to yourself and delete the escape hatches.
- "Gradients are fine on marketing, banned in product" (Resend) is a cleaner rule than "no gradients" — the omission list is surface-specific, not global.
- Two things on the brief's candidate omission list are **not** supported as omissions: avatars (Linear emphasises them where identity matters) and focus rings/accessible affordances (Plausible invests in them). Minimalism in these products is about removing decoration, not removing affordances. Linear's 30-vs-100 contrast variable is the same point: restraint is not low contrast.

### Gaps
- Breadcrumbs, search bars and badge usage are not discussed in any primary source found. Geist mentions badges only as a colour-application example. Whether these products omit breadcrumbs is unverified.
- The absence of a shadow token from Stripe's docs page is strong but is an argument from silence: the page may be incomplete, and several of its token tables rendered empty in the fetch. Flagging the uncertainty rather than stating Stripe has no shadows.

---

## Published writing from these teams about admin/dashboard design

### Takeaway
Linear's March 2024 redesign post is the only substantial first-person engineering/design write-up found about *app chrome* specifically, and it contains no measurements. Stripe's and Vercel's contributions are published token systems rather than essays. The brief's premise that "Linear and Stripe have both written about design" holds for Linear; for Stripe the published design writing found is about the marketing site, not the Dashboard.

### Cited Findings
- Linear, "How we redesigned the Linear UI", 28 March 2024 — covers scope, colour-system rewrite, Electron constraints, what was punted. Explicitly qualitative; no px/rem values — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Linear's stated process principles from that post: keep it an "exciting evolution" rather than a full decomposition of the product; focus effort and manage risk by narrowing scope; make the design feel "timeless and uniform" through the colour system. The project took about **six weeks** — [Linear blog](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Linear, "Design is more than code", Karri Saarinen, Dec 2025 (~1,706 words per a plushcap summary) — asks whether designers are becoming engineers and whether "head of design" becomes "head of craft" — [Linear blog](https://linear.app/blog/design-is-more-than-code); [plushcap summary](https://www.plushcap.com/content/linear/blog/linear-design-is-more-than-code)
- Linear, "Design for the AI age" — [Linear blog](https://linear.app/blog/design-for-the-ai-age)
- Karri Saarinen's 10 rules for crafting products that stand out, including committing to quality at leadership level — [Figma blog](https://www.figma.com/blog/karri-saarinens-10-rules-for-crafting-products-that-stand-out/)
- Designer Fund interview on design at Linear, describing a custom AI skill `/linear-way` trained on Linear's blog posts and internal materials, and a process centred on "choosing what not to do" — [Designer Fund](https://designerfund.substack.com/p/ai-design-linear)
- A Linear designer's first-year reflection (Dec 2024) describing how engineers push for design excellence and raise the craft bar — [yannglt.com](https://yannglt.com/writing/linear-one-year-mark)
- Stripe's Head of Design **Katie Dill** discussed the homepage redesign with Y Combinator's Aaron Epstein, including how the design team is evolving alongside AI design tools; the homepage launched January 2026 — [Y Combinator podcast](https://pocketcasts.com/podcast/y-combinator-startup-podcast/7a564520-1cc3-0135-52f8-452518e2d253/stripe-head-of-design-katie-dill-breaks-down-their-new-website/5cbb5e23-a2c4-4e6b-bcf7-013f8a0e7945)
- Vercel's published writing on this subject takes the form of the Geist docs themselves, which include prose usage rules per token (quoted throughout above) — [Geist colors](https://vercel.com/geist/colors)
- Resend publishes its principles as a five-item list: dark-first design; sharp contrast between black and light; precision and focus over decoration; accent colours communicate state not style; simple, stable, intentional forms — [Resend design](https://resend.com/design.md)
- Resend also maintains a `resend/design-skills` repo and an interactive brand site at resend.com/design — [Resend design](https://resend.com/design.md)

### Inferences
- The pattern across all four companies is that the *copyable* output is a token system with usage prose attached, not a manifesto. Geist's per-step role assignments and Stripe's eight spacing tokens carry more actionable information than any of the essays.
- Linear's six-week, scope-narrowed redesign that deliberately excluded navigation is the most relevant *process* precedent for a small nine-section admin tool: restyle the chrome, leave the IA alone.

### Gaps
- No primary Stripe writing about Dashboard design was found, despite searching for it directly. The 925studios "Stripe Dashboard Design Breakdown" is an outside reading, not Stripe's account, and attributes choices (key metrics, precise microcopy, empty states) to a rationale about financial anxiety that Stripe itself has not published — [925studios](https://www.925studios.co/blog/stripe-dashboard-design-breakdown)
- The original post for Linear's reported March 2026 interface refresh was not located; only an aggregator summary.
- No conference talk transcript or designer interview specific to admin/dashboard chrome was found for any product.
- "Sail", the name sometimes given to Stripe's internal design system, returned no official Stripe material.

---

## Synthesis for a nine-section light admin tool

Consolidating only the primary-sourced numbers, in rough order of confidence:

1. **Spacing: adopt Stripe's eight tokens exactly** — 0, 2, 4, 8, 16, 24, 32, 48px, and refuse 12/20/40. 8px intra-component, 16px card padding and card gaps, 24–32px section gaps, 48px page-level. Base grid 4px (Geist). — [Stripe](https://docs.stripe.com/stripe-apps/style); [Geist Stack](https://vercel.co/geist/stack)
2. **No shadows on content.** Borders only. Shadows reserved for tooltips, menus, modals — and translucent when used. — [Plausible](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css); [Geist materials](https://vercel.com/geist/materials); [Geist colors](https://vercel.com/geist/colors)
3. **One neutral ramp with fixed roles.** Borrow Geist's assignment: step 400 = default border, 500 = hover border, 900 = secondary text, 1000 = primary text, 100/200/300 = surface/hover/active. In Tailwind terms Plausible's shipping choice is zinc, border default zinc-200, control border zinc-300. — [Geist colors](https://vercel.com/geist/colors); [Plausible](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
4. **One accent, on primary buttons and focus rings only.** Plausible: indigo-600 button, indigo-700 hover, indigo-500 ring. Keep the accent out of colour calculations elsewhere (Linear). — [Plausible](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css); [Linear](https://linear.app/blog/how-we-redesigned-the-linear-ui)
5. **Three status hues, each with one job**: emerald = success/completion, amber = caution/pending, red = critical/irreversible. Total hue count 5 including neutral and accent. — [Resend](https://resend.com/design.md); [Plausible](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
6. **4–5 type sizes, 2–3 weights.** Resend's product scale is 24/32, 18/28, 16/24, 14/20, mono 14/20. Nav and menu items at 14px label-style. Dense secondary text at 13px. Vary line height, not size, between single-line and multi-line roles. — [Resend](https://resend.com/design.md); [Geist text](https://vercel.com/geist/text)
7. **Tabular figures on every number.** — [Geist text](https://vercel.com/geist/text)
8. **One control height scale shared by buttons and inputs**: 32 / 36 / 40px with 8 / 12 / 14px horizontal padding, `rounded-md` (6px). — [Plausible](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css)
9. **Radii: 6px for controls and everyday surfaces, 12px for menus and modals.** Three values maximum. — [Geist materials](https://vercel.com/geist/materials)
10. **Draw each border once** — one bordered container subdivided by dividers, rather than many bordered cards. Label-left/value-right rows via space-between. — [Geist colors](https://vercel.com/geist/colors); [Stripe](https://docs.stripe.com/stripe-apps/style)
11. **Keep affordances**: visible `:focus-visible` rings with offset, `cursor: pointer` on buttons, high contrast (Linear's contrast variable goes to 100 for accessibility). Minimalism is not low contrast and not invisible focus. — [Plausible](https://raw.githubusercontent.com/plausible/analytics/master/assets/css/app.css); [Linear](https://linear.app/blog/how-we-redesigned-the-linear-ui)
12. **Freeze the navigation.** Linear treated nav as the highest-risk surface and shipped a full visual redesign without touching it. — [Linear](https://linear.app/blog/how-we-redesigned-the-linear-ui)

**The one thing this research could not deliver:** sidebar width in pixels, for any product. No company publishes it. That requires measuring the live apps.
