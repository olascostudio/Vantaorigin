# Measurable Rules for Minimalist, Data-Dense Admin Interfaces

Scope note: all design-system pages below are living documentation with no version stamp on the page; they were fetched **16 November 2026**. Tailwind docs were served as **v4.3**. Dated articles and papers carry their own dates inline. Where a figure comes from a secondary source (a summary of Tufte or Few rather than their own text), it is labelled as such.

---

## Spacing: scales for dense interfaces, card/section gaps, and when whitespace stops helping

### Takeaway
Three respected systems independently converge on an 8px-based scale with a **3-step "condensed / normal / spacious" set of 8px / 16px / 24px** for both container padding and gaps between things, with 32–80px reserved for page-level separation; Primer states this triplet explicitly as tokens. There is, by contrast, **no authoritative published threshold for when whitespace stops helping** — the only sources making that argument are vendor blogs.

### Cited Findings

**IBM Carbon (spacing scale)**
- Full scale, 13 steps: `$spacing-01` 2px, `-02` 4px, `-03` 8px, `-04` 12px, `-05` 16px, `-06` 24px, `-07` 32px, `-08` 40px, `-09` 48px, `-10` 64px, `-11` 80px, `-12` 96px, `-13` 160px — [IBM Carbon, Spacing overview](https://carbondesignsystem.com/elements/spacing/overview/)
- The scale is built on "multiples of two, four, and eight"; Carbon does **not** state a strict multiple-of-8 rule — [IBM Carbon, Spacing](https://carbondesignsystem.com/elements/spacing/overview/)
- "Deviating from the spacing scales should be avoided whenever possible" — [IBM Carbon, Spacing](https://carbondesignsystem.com/elements/spacing/overview/)
- Tokens are not responsive, but a layout may step down the scale at smaller breakpoints; Carbon's worked example drops `$spacing-05` (16px) at 1440px to `$spacing-03` (8px) at 768px — [IBM Carbon, Spacing](https://carbondesignsystem.com/elements/spacing/overview/)
- Carbon gives **no numeric values** for card gaps, container padding or gaps between sections on this page; stacking is described only qualitatively — [IBM Carbon, Spacing](https://carbondesignsystem.com/elements/spacing/overview/)

**Atlassian (spacing scale with usage buckets — the most prescriptive source found)**
- Base unit 8px = `space.100`; every token is a multiple of it; scale runs 0–80px: 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px — [Atlassian Design System, Spacing](https://atlassian.design/foundations/spacing)
- **0–8px** (`space.0`–`space.100`): padding inside small components — badges, icon buttons, **table cells**; padding within inputs; vertical spacing between elements in a card; gaps between repeating elements (button groups); gap between a trigger and its menu; gap between small icons and text — [Atlassian, Spacing](https://atlassian.design/foundations/spacing)
- **12–24px** (`space.150`–`space.300`): padding inside larger components such as buttons; space between an avatar or large icon and content; vertical spacing between elements in cards; spacing between items in less densely packed components — [Atlassian, Spacing](https://atlassian.design/foundations/spacing)
- **32–80px** (`space.400`–`space.1000`): "space between page content, such as from the top of the page to the header" — the only section-level number any system gave — [Atlassian, Spacing](https://atlassian.design/foundations/spacing)
- Atlassian gives no compact-density guidance; it says only that the system "lays a foundation for … customisable UI density in the future" — [Atlassian, Spacing](https://atlassian.design/foundations/spacing)

**GitHub Primer (an explicit answer to "padding inside vs gap between")**
- `--stack-gap-condensed` 8px / `--stack-gap-normal` 16px / `--stack-gap-spacious` 24px — [Primer, Size primitives](https://primer.style/foundations/primitives/size)
- `--stack-padding-condensed` 8px / `--stack-padding-normal` 16px / `--stack-padding-spacious` 24px — i.e. **padding and gap use the same three values** — [Primer, Size primitives](https://primer.style/foundations/primitives/size)
- Base-size scale: 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 64, 80, 96, 112, 128px — [Primer](https://primer.style/foundations/primitives/size)
- Control heights: xsmall 24px, small 28px, medium 32px, large 40px, xlarge 48px; control inline padding condensed/normal/spacious 8/12/16px; control block padding 2px (xs), 4px (sm), 6px (md), 10px (lg) — [Primer](https://primer.style/foundations/primitives/size)
- Border width default 1px, thick 2px; radius small 3px, default/medium 6px, large 12px; focus outline 2px with -2px offset — [Primer](https://primer.style/foundations/primitives/size)
- Primer lists tokens but gives **no usage rules** tying them to padding vs gaps vs sections — [Primer](https://primer.style/foundations/primitives/size)

**Carbon data tables (real numbers for the densest admin element)**
- Row heights: xs 24px, sm 32px, md 40px, lg 48px, xl 64px; the column header row should match the table's row size; xl is recommended only when rows hold two lines, and takes 16px padding-top — [IBM Carbon, Data table style](https://carbondesignsystem.com/components/data-table/style/)
- Padding between columns 16px (`$spacing-05`); sort-icon padding 8px; checkbox/radio 20px with 16px side padding; chevron click target 32px — [Carbon, Data table style](https://carbondesignsystem.com/components/data-table/style/)
- Table header: margin-top 16px, margin-bottom 24px, side padding 16px — [Carbon, Data table style](https://carbondesignsystem.com/components/data-table/style/)
- Pagination and toolbar heights must match row height (xs 24, sm 32, md 40, lg 48) — [Carbon, Data table style](https://carbondesignsystem.com/components/data-table/style/)

**Tailwind's own scale (the implementation target)**
- `--spacing: 0.25rem` (4px at a 16px root); every spacing utility is a multiple of that one variable, so `px-4` = 1rem — [Tailwind CSS v4.3, Theme variables](https://tailwindcss.com/docs/theme)
- Default radii: `--radius-xs` 2px, `sm` 4px, `md` 6px, `lg` 8px, `xl` 12px, `2xl` 16px, `3xl` 24px — [Tailwind v4.3](https://tailwindcss.com/docs/theme)

**Material density (numbers exist, but for Material 2)**
- Density scale has three levels — default (0), comfortable (−1), compact (−3) — on a **4px interval**, so a 36px button at −3 becomes 24px — [Material, Using Material Density on the Web](https://m2.material.io/blog/material-density-web); [@material/density README](https://cdn.jsdelivr.net/npm/@material/density@14.0.0/README.md)
- Compact density is recommended for "data-rich applications that need to display a lot of information in a small amount of space"; and "when increasing component density you should also decrease your layout or grid density" — [Material, Applying density](https://material.io/design/layout/applying-density.html)
- Default-density touch targets should be at least 48×48dp with at least 8dp between targets — [Material, Applying density](https://material.io/design/layout/applying-density.html)
- Caveat: the density guidance is labelled **beta** on material.io and the search results mix Material 2 and Material 3 — [Material, Applying density](https://material.io/design/layout/applying-density.html)

**When whitespace stops helping (weak evidence base)**
- Atlassian's elevation page is the strongest systems-level statement in this direction: "Raised elevations can create visual noise, so don't use to group content when a border or white space would suffice" — [Atlassian, Elevation](https://atlassian.design/foundations/elevation)
- A UX case write-up argues added breathing room in an enterprise control panel looked better but failed in use — framed in its title as "How white space killed an enterprise app (and why data density matters)" — [uxdesign.cc](https://uxdesign.cc/how-white-space-killed-an-enterprise-app-and-why-data-density-matters-b3afad6a5f2a)
- A design system states that overly sparse interfaces waste screen real estate and force excessive scrolling and clicking, while overly dense ones overwhelm — [Basis Design, Density](https://design.basis.com/foundations/density)
- LogRocket argues dense, information-rich interfaces "can be clearer and more usable in many situations" and that "content — not aesthetic — considerations should prompt designers to work at higher density levels", validated by usability and comprehension testing — [LogRocket](https://blog.logrocket.com/balancing-information-density-in-web-development/)
- One blog gives a specific figure — 12–16px of vertical cell padding for dense numeric tables to stop rows blurring during horizontal scanning — but the search summary explicitly could not verify it against original research — [LogRocket/secondary, unverified](https://blog.logrocket.com/balancing-information-density-in-web-development/)

### Inferences
- The checkable rule the three systems jointly support: **every spacing value on the page must be one of 4, 8, 12, 16, 24, 32, 48, 64, 80px**. In Tailwind that is `1, 2, 3, 4, 6, 8, 12, 16, 20` only — any arbitrary value (`p-[13px]`, `gap-5` at 20px is permissible under Atlassian but not Carbon) is a violation you can grep for.
- A defensible dense-admin default drawn straight from Primer's triplet: **8px inside dense cells, 16px card padding, 16px gap between cards, 24px gap between subsections, 32–48px between major page regions.** This is checkable by inspecting computed styles.
- Carbon's breakpoint example implies a verifiable responsive rule: at narrow widths, step **down one token**, not to an arbitrary smaller number.
- Carbon's table row heights give the cleanest density dial for this project: 32px rows (`h-8`) is "dense", 40px (`h-10`) is default, 48px is comfortable. Pair with Atlassian's rule that **table cell padding belongs in the 0–8px bucket**, not 12–16px.
- Because Material requires layout density to drop as component density rises, a page that compresses rows to 32px should *not* also compress page gutters; the two moves cancel out.
- No source supports "more whitespace is always better". The only testable proxy I can derive from the cited material is the Gestalt proximity relation — the gap *within* a group must be visibly smaller than the gap *between* groups (e.g. 8px vs 24px, a 1:3 ratio) — but I found no published source stating a required ratio, so treat this as my inference, not guidance.

### Gaps
- **No published numeric answer for "gap between cards" or "gap between sections"** from Carbon, Primer or Material; only Atlassian's 32–80px page-content bucket and Primer's condensed/normal/spacious triplet come close.
- **Shopify Polaris was not captured**: `polaris.shopify.com/design/space` now 301-redirects to `shopify.dev/docs/api/polaris`, which was not fetched, so Polaris's space scale and any proximity/whitespace guidance is missing from these notes.
- **Material 3's own layout/spacing page rendered empty** (JavaScript-only content), so all Material numbers here are Material 2 and carry a beta label. M3 margins/pane spacing in dp are unverified.
- No source found that quantifies the point of diminishing returns for whitespace in a dense UI; the 12–16px cell padding figure circulating on blogs is unverified against primary research.

---

## Typography: how few sizes and weights, scales for dense screens, line length and line height

### Takeaway
IBM Carbon's "productive" type set is the directly applicable answer: a data-dense product UI runs on a **14px base with a 12px small/label size and two weights (400 and 600)**, with tighter line heights than marketing type (14/18 rather than 14/20). No system publishes a maximum count of sizes or weights, but Carbon's own data table ships with exactly **three** type styles.

### Cited Findings

**Carbon's productive vs expressive split**
- Productive type (product UI) is based on **14px**; expressive (marketing/editorial) on **16px**. Productive styles end `-01`, expressive `-02` — [IBM Carbon, Type sets](https://carbondesignsystem.com/elements/typography/type-sets/)
- "Product pages have a higher density of information housed inside containers for space efficiency, and in these situations fixed type styles are a must" — [Carbon, Type sets](https://carbondesignsystem.com/elements/typography/type-sets/)
- Expressive styles "would be distracting if used in product"; productive type is "more condensed" to keep users focused on tasks — [Carbon, Typography overview](https://carbondesignsystem.com/guidelines/typography/overview/)
- Fluid heading and display styles should **not** be used inside a container — [Carbon, Type sets](https://carbondesignsystem.com/elements/typography/type-sets/)

**The complete productive (dense-UI) type set — size/line-height/weight/letter-spacing**
- `label-01`, `helper-text-01`, `legal-01`: 12px / 16px / 400 / +0.32px — [Carbon, Type sets](https://carbondesignsystem.com/elements/typography/type-sets/)
- `code-01` (IBM Plex Mono): 12px / 16px / 400 / +0.32px — [Carbon, Type sets](https://carbondesignsystem.com/elements/typography/type-sets/)
- `body-compact-01`: 14px / 18px / 400 / +0.16px — [Carbon](https://carbondesignsystem.com/elements/typography/type-sets/)
- `body-01`: 14px / 20px / 400 / +0.16px — [Carbon](https://carbondesignsystem.com/elements/typography/type-sets/)
- `heading-compact-01`: 14px / 18px / **600** / +0.16px; `heading-01`: 14px / 20px / 600 — [Carbon](https://carbondesignsystem.com/elements/typography/type-sets/)
- `heading-03`: 20px / 28px / 400; `heading-04`: 28px / 36px / 400; `heading-05`: 32px / 40px / 400 — [Carbon](https://carbondesignsystem.com/elements/typography/type-sets/)
- Note the pattern: **compact variants cut line height to ~1.29 (18/14); non-compact body is ~1.43 (20/14)** — [Carbon](https://carbondesignsystem.com/elements/typography/type-sets/)

**Weights**
- "We suggest using IBM Plex Light, Regular, and SemiBold for digital experiences" — i.e. 300 / 400 / 600; 300 appears only at 42px+ in the published sets — [Carbon, Typography overview](https://carbondesignsystem.com/guidelines/typography/overview/)
- SemiBold is for section headers and "should not be used for long text" — [Carbon, Typography overview](https://carbondesignsystem.com/guidelines/typography/overview/)
- Italics are for emphasis only — titles of works, technical terms, device names, captions — [Carbon, Typography overview](https://carbondesignsystem.com/guidelines/typography/overview/)
- Carbon states **no maximum number of weights or sizes** for a layout — [Carbon, Typography overview](https://carbondesignsystem.com/guidelines/typography/overview/)

**Carbon's type scale (the ratio question)**
- 17 steps from 12px to 92px: 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 54, 60, 68, 76, 84, 92 — generated by Xₙ = Xₙ₋₁ + {INT[(n−2)/4] + 1} × 2 from y₀ = 12px. It is **not** a constant-ratio scale; increments grow (2px, then 4, then 6…) — [Carbon, Typography overview](https://carbondesignsystem.com/guidelines/typography/overview/)

**A whole data table in three styles**
- Table title 20px/400 (`$heading-03`); column header 14px/**600** (`$heading-compact-01`); row text 14px/400 (`$body-compact-01`) — [Carbon, Data table style](https://carbondesignsystem.com/components/data-table/style/)

**Tailwind defaults (and where they diverge from Carbon)**
- `text-xs` 12px / line-height 16px; `text-sm` 14px / 20px; `text-base` 16px / 24px; `text-lg` 18px / 28px; `text-xl` 20px / 28px; `text-2xl` 24px / 32px — [Tailwind CSS v4.3, Theme variables](https://tailwindcss.com/docs/theme)

**Line length**
- Optimal average line length is **45–90 characters including spaces**, a rule of thumb of "between two and three alphabets" (one alphabet = lowercase a–z) — [Butterick's Practical Typography, Line length](https://practicaltypography.com/line-length.html) (no author or date given on the page as fetched; the work is by Matthew Butterick)
- Butterick explicitly rejects measuring in inches/cm because point size changes characters per inch; characters per line works at any size — [Practical Typography](https://practicaltypography.com/line-length.html)
- Carbon's typography pages give **no** line-length or characters-per-line guidance (checked both overview and type sets) — [Carbon, Typography overview](https://carbondesignsystem.com/guidelines/typography/overview/)

**Minimalist typography, with a warning**
- "Dramatic typography" appeared in 75% of 112 minimalist sites analysed; bold/large type carries hierarchy when few other elements exist — but overformatted text "can look like an ad and be ignored" — [Kate Moran, NN/g, *The Characteristics of Minimalism in Web Design*, 12 July 2015](https://www.nngroup.com/articles/characteristics-minimalism/)

### Inferences
- A directly checkable budget, assembled from Carbon's productive set: **two sizes do the work (12px and 14px), a third for page/section titles (20px), two weights (400, 600)**. Anything beyond ~4 sizes and 2 weights on an admin screen is unsupported by any system's own product-UI set.
- **Tailwind's `text-sm` is line-height 20px; Carbon's dense equivalent is 18px.** For table rows and compact cards you must override leading (`leading-[18px]`), or the page will be ~10% taller per row than Carbon's dense spec. This is verifiable by computed style.
- Tailwind has no 12/16 "label" pairing problem: `text-xs` is already 12/16, matching `label-01` exactly, so labels, helper text and legal text should all be `text-xs` — one class, three roles.
- Carbon's 600-weight-for-headers-only rule converts to a grep: `font-semibold` should appear on column headers and section headings and essentially nowhere inside paragraph or cell text.
- Line length applies to prose columns, not tables: 45–90 characters at 14px is roughly 300–640px of text column, so a full-width description cell in a wide admin table exceeds the comfortable measure and should be constrained (e.g. `max-w-prose` or an explicit `max-w-[60ch]`).

### Gaps
- **No design system publishes a maximum number of type sizes or weights per screen.** Carbon, Primer and Atlassian all decline to state one; the "two sizes, two weights" figure above is my inference from Carbon's productive set, not a cited rule.
- No source found giving a **line-height recommendation specific to table rows** (as distinct from body text), other than Carbon's compact 18/14 pairing.
- Minimum legible size for small print in dense UI: no cited rule found. Carbon's floor is 12px; WCAG sets no minimum font size.

---

## Colour: how many, meaning-only use, and the exact accessibility thresholds

### Takeaway
A restrained admin interface needs **greyscale plus one or two accent colours** (NN/g found 95% of minimalist sites used a limited or monochromatic palette, 46% with one or two accents), with colour reserved for meaning and never for quantity. The hard, verifiable floor is WCAG 2.2: **4.5:1 for text, 3:1 for large text, and 3:1 for the visual information that identifies any interface component or meaningful graphic**.

### Cited Findings

**WCAG 2.2 SC 1.4.3 Contrast (Minimum), Level AA**
- Text and images of text require a contrast ratio of **at least 4.5:1**; **large-scale text requires 3:1** — [W3C, Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- "Large scale" = **at least 18 point, or 14 point bold**; the page converts at 1pt = 1.333px, so ~**18.5px bold or 24px regular** — [W3C, Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- Ratios are **not rounded**: 4.499:1 fails — [W3C, Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- Exempt: incidental text (inactive components, pure decoration, invisible text, text in a picture with significant other visual content) and logotypes — [W3C, Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- SC 1.4.6 Contrast (Enhanced), Level AAA uses **7:1** — [W3C, Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

**WCAG 2.2 SC 1.4.11 Non-text Contrast, Level AA — the 3:1 rule for interface components**
- Normative requirement: the visual presentation of the listed items must have "a contrast ratio of at least 3:1 against adjacent color(s)" — [W3C, Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Covers "**Visual information required to identify user interface components and states, except for inactive components**" — including selected and focused states — [W3C, SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Covers "**Parts of graphics required to understand the content**, except when a particular presentation of graphics is essential" — e.g. an icon's shape, or pie slices when the chart has no labels or values — [W3C, SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- **Borders**: a border is only required when nothing else identifies the control; where the border *is* the only cue it must meet 3:1. A text input with a light grey border (#AAA on white, under 3:1) **fails** when no label identifies it. A bottom-border-only input still needs that border at 3:1. An input distinguished only by background colour needs 3:1 against the adjacent background — [W3C, SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- **Shadows don't count**: colours that don't help identify the component — "a subtle drop shadow", or a thin border between two already-contrasting areas — can be ignored when measuring — [W3C, SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- **Focus indicators** must contrast with adjacent colours; a thin light-grey outline on white fails. Default browser focus styling is exempt from the contrast requirement but must still be visible — [W3C, SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- **Icons**: icons needed to understand a control (e.g. a dropdown arrow) and status icons with no accompanying text must meet 3:1 — [W3C, SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Exempt: inactive/disabled components, brand logos, essential presentations (photos, flags, screenshots, heat maps), purely aesthetic graphics, and information available in another form — [W3C, SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

**How many colours a restrained interface needs**
- Of 112 minimalist sites: **95% used a limited or monochromatic palette**; 49% (55 sites) were monochromatic and 51 of those greyscale; **46% (52 sites) used one or two accent colours**, typically marking clickable or key elements — [Moran, NN/g, 12 July 2015](https://www.nngroup.com/articles/characteristics-minimalism/)
- Few: "A common problem is the use of too many colors, especially bright colors. Because dashboards are often densely packed with information, the visual content must be kept as simple as possible." — [Stephen Few, *Common Pitfalls in Dashboard Design*, Perceptual Edge, Feb 2006 (© 2005 in footers), Pitfall #12](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- Few: "When overused, color loses its power to highlight what's most important" and "It is best to keep colors subdued and neutral, except when you are using color to highlight something as especially important" — [Few, 2006, Pitfall #12](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- Few's worked example of decorative colour: bars already labelled on the Y axis given one colour each — "the colors mean nothing… time is wasted as our brains — whether consciously or unconsciously — search for the nonexistent meaning of these differences" — [Few, 2006, Pitfall #12](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)

**Colour for meaning, not decoration or quantity**
- Colour "should not be used to communicate information about quantitative values or magnitude" because people don't perceive colours as ordered — [Page Laubheimer, NN/g, *Dashboards: Making Charts and Graphs Easier to Understand*, 18 June 2017](https://www.nngroup.com/articles/dashboards-preattentive/)
- Colour works best as a **secondary cue**: shape, borders or spatial grouping should carry category meaning, with colour reinforcing it — [Laubheimer, NN/g, 2017](https://www.nngroup.com/articles/dashboards-preattentive/)
- Length and 2D position are the most accurately judged preattentive attributes (bars, lines, scatter); area and angle are poorly judged, so pie, donut, treemap and radial gauges are discouraged for quick reading — [Laubheimer, NN/g, 2017](https://www.nngroup.com/articles/dashboards-preattentive/)
- Avoid 3D effects: they distort shapes and alignment and make values harder to read even when used purely aesthetically — [Laubheimer, NN/g, 2017](https://www.nngroup.com/articles/dashboards-preattentive/)

**Colour-blindness figures — sources disagree**
- NN/g: up to **4.5% of the general population**, roughly **8% of men** and **0.5% of women** — [Laubheimer, NN/g, 2017](https://www.nngroup.com/articles/dashboards-preattentive/)
- Few: red/yellow/green coding "exclude[s] the **10% of males and 1% of females** who are color blind" — [Few, 2006, Pitfall #12](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- These are inconsistent and both are cited without primary epidemiological sources; report the range, not an average.

**Categorical palette ceilings — sources disagree substantially**
- "Seven is a good maximum" — [EU Data Visualisation Guide, Colour for categories](https://data.europa.eu/apps/data-visualisation-guide/colour-for-categories)
- Cap at **ten**, after which groups become hard to distinguish — [Atlassian, How to choose colors for data visualization](https://www.atlassian.com/data/charts/how-to-choose-colors-data-visualization); same ten-colour limit, with grouping or an "other" bucket beyond that — [Datylon](https://www.datylon.com/blog/a-guide-to-data-visualization-color-palette)
- **No more than 6** categories — [NHS Scotland Turas, Categorical palette](https://www.turasdesignsystem.nhs.scot/design/data-visualisation/categorical-palette/)
- Categorical colours "become more difficult to comprehend starting at 6 colors, and extremely difficult to understand at 12"; beyond that, change chart type or use a table — [Innovaccer Design](https://design.innovaccer.com/data-visualizations/color/usage/)
- Outlier: a recommended maximum of **30** colours, reserved for "exceptionally complex scenarios" — [Semrush Intergalactic](https://developer.semrush.com/intergalactic/data-display/color-palette/color-palette)

### Inferences
- The palette that every cited source would accept for this project: **one neutral ramp + one accent/brand hue + exactly as many semantic hues as you have states to express** (typically success, warning, danger). Everything else is decoration by Few's definition.
- A checkable audit rule: for every coloured element, name the meaning it encodes. If two elements differ in colour but not in meaning (Few's labelled bars), the colour is non-data ink and should be removed.
- **Tailwind's default light borders will fail 1.4.11 wherever a border is a control's only identifying cue.** `border-gray-200`/`border-gray-300` on white are very low-contrast neutrals (the v3 hex equivalents were approximately `#e5e7eb` and `#d1d5db`); WCAG's own worked example fails `#AAA` on white, which is darker than both. Verify each with a contrast checker rather than trusting the token name; expect to need roughly `gray-500`-level darkness for a *load-bearing* input border or focus ring. I did not compute these ratios, so treat the specific tokens as "must measure", not as a sourced result.
- Decorative rules and dividers *between two already-contrasting areas* are explicitly exempt from the 3:1 rule, so a table's hairline row dividers can legitimately stay very light; an input's outline cannot. This is the single most useful distinction in 1.4.11 for a dense admin UI.
- Because large text drops to 3:1 only at 18.66px bold / 24px, almost **all** text on a 12–14px dense admin screen is held to 4.5:1 — there is no "it's just a label" exemption unless the control is disabled.

### Gaps
- No source found stating a maximum number of **UI** (non-chart) colours; the 6/7/10/30 figures all concern categorical data-viz palettes and are inconsistent with one another.
- WCAG sets no requirement for the contrast of *decorative* dividers, so "how light may a hairline be" has no accessibility answer — only aesthetic judgement.
- Few's and NN/g's colour-blindness prevalence figures conflict and neither cites a primary medical source.

---

## Borders vs shadows vs background fills

### Takeaway
The two strongest sources point the same way for dense admin UI: **separate regions with whitespace, a 1px border, or a background fill — and reserve shadows for things that actually float** (menus, modals, dragged cards). Accessibility reinforces it: a shadow can be *ignored* when measuring whether a component is identifiable, so a shadow cannot be the thing that defines a region, whereas a border can.

### Cited Findings

**Atlassian (the most explicit design-system position)**
- "To differentiate areas of the UI in other ways, use whitespace or borders instead" — [Atlassian, Elevation](https://atlassian.design/foundations/elevation)
- "Raised elevations can create visual noise, so don't use to group content when a border or white space would suffice" — [Atlassian, Elevation](https://atlassian.design/foundations/elevation)
- A **flat card** = default surface (`elevation.surface`) + a **1px solid `color.border`**; raised surfaces are reserved for *movable* cards and always pair with `elevation.shadow.raised`; overlay surfaces are for floating UI (modals, dropdowns) — [Atlassian, Elevation](https://atlassian.design/foundations/elevation)
- Borders are the default approach for **scrolled content**, e.g. sticky headers and footers; overflow shadows (`elevation.shadow.overflow.*`) are reserved for cases where a border might be missed, such as very small UI or bordered tables — [Atlassian, Elevation](https://atlassian.design/foundations/elevation)
- Avoid excessive raised and overlay use: it makes busy UI — [Atlassian, Elevation](https://atlassian.design/foundations/elevation)

**Carbon (what a dense table actually uses)**
- Row separation is a `border-bottom` using `$border-subtle`; selected rows use `$border-subtle-selected`; focus uses `$focus` — [Carbon, Data table style](https://carbondesignsystem.com/components/data-table/style/)
- Column headers are distinguished by **background fill**, not a border: `$layer-accent` (plus hover/active variants); zebra rows also use `$layer-accent` — [Carbon, Data table style](https://carbondesignsystem.com/components/data-table/style/)
- No shadow token appears anywhere in Carbon's data table specification — [Carbon, Data table style](https://carbondesignsystem.com/components/data-table/style/)

**Accessibility tips the balance**
- "A subtle drop shadow" is among the colours that "don't help identify the component" and can be ignored when measuring 1.4.11 — so shadows carry no accessibility weight as separators — [W3C, Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Conversely, where a boundary is the only cue identifying a control, that border must reach 3:1 — a border can do the job, if it is dark enough — [W3C, SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

**Strong borders have a cost (Few)**
- In Few's critique of a dashboard where nothing stands out: the logo and navigation buttons "are prominent, both as a result of their position on the screen and the use of **strong borders**, but they aren't data and should therefore be subdued" — [Few, 2006, Pitfall #10](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)

**Flatness vs signalling clickability (the real counter-argument)**
- Flat patterns and textures appeared in **96%** of minimalist sites, and flat design drops highlights, shadows and gradients — but NN/g found flat design "often hurts usability, since flat elements can fail to signal clickability", recommending a **mostly flat design with clearly clickable elements** — [Moran, NN/g, 12 July 2015](https://www.nngroup.com/articles/characteristics-minimalism/)

**Lower-quality web guidance, included because it is where the "current thinking" conversation happens — treat as opinion, not evidence**
- Borders define edges on flat surfaces; shadows suit floating layers like menus and modals — [Hightouch UI, Borders](https://ui.hightouch.com/foundation/borders)
- Shadows can delineate boundaries "with greater subtlety and reduced visual prominence" than borders — the opposing position — [Supercharge, Shadows in UI design](https://supercharge.design/articles/shadows-in-ui-design)
- For closely positioned elements such as a series of cards, shadows merge and clutter, so spacing or borders work better — [Cieden, When to avoid shadows](https://cieden.com/book/sub-atomic/shadows/when-to-avoid-shadows)
- Background-colour differences often separate regions better than either, and a border is a problem when it is the first thing you notice — [Frequency, Depth & Shadows](https://brand.frequency.media/guidelines/depth-shadows)

### Inferences
- A rule you can verify by reading the markup: **no `shadow-*` class on any element that is not floating** (dropdown, popover, modal, toast, dragged item). On a light-background admin page, cards, panels, table containers and sticky headers get `border` + `bg-white`/`bg-gray-50`, not `shadow-sm`.
- Three separator mechanisms, used in a fixed order of preference, each checkable: **(1) whitespace from the spacing scale, (2) a 1px border, (3) a background fill one step off the page background.** Reaching for a fourth (shadow) means the hierarchy failed.
- Carbon's table proves fills and borders are sufficient at the densest scale in an admin UI — if a 64-row table needs no shadow, neither does a card grid.
- Two borders meeting (card border + table border + section border) is the dense-UI failure mode that the Frequency and Cieden arguments both circle; a checkable version is "no element should have a visible border whose immediate parent also has one, unless they are separated by at least 8px of padding".
- Since flatness can cost clickability signalling, the compensating rule is that **interactive** elements must differ from static ones by something measurable — border at 3:1, a fill change, or a cursor plus focus ring — rather than by shadow alone.

### Gaps
- I found **no empirical study** (eye-tracking, task-time, error-rate) comparing borders, shadows and fills as region separators. The design-system positions are reasoned assertions; the blog sources are opinion. This is a genuinely under-evidenced area.
- Atlassian's elevation page names tokens but publishes **no shadow values** on that page, so the exact blur/opacity it considers acceptable is not captured here.
- Carbon's `$border-subtle` and `$layer-accent` resolve to theme-dependent colours that I did not look up, so their actual contrast ratios on white are unverified.

---

## What should be removed: data-ink, chart junk, icons, labels, decoration

### Takeaway
Tufte's rule ("erase non-data-ink") and Few's Pitfalls #3, #11 and #12 give a concrete removal list: decorative graphics, meaningless colour variety, 3D, gauges, excess precision, and icons that sit beside numbers they don't explain. NN/g's own dashboard example removes decorative icons next to figures. The one serious counter-evidence is Bateman et al.'s 2010 "Useful Junk?" study, which found embellished charts no less accurate and *better* recalled weeks later — a finding its own authors declined to generalise.

### Cited Findings

**Tufte's data-ink ratio (secondary sources only — the book text was not accessible)**
- The data-ink ratio is defined as data-ink divided by the total ink used to print the graphic, equivalently **1.0 − the proportion of a graphic that can be erased without loss of data-information**; data-ink is the non-erasable core — [Tufte's Principles of Data-Ink (Columbia course book)](https://jtr13.github.io/cc19/tuftes-principles-of-data-ink.html); [Holistics, Data-ink ratio](https://www.holistics.io/blog/data-ink-ratio/)
- Tufte's rule is "**Erase non-data-ink, within a reason**", on the grounds that ink which fails to depict statistical information holds little interest and can clutter the data — a thick mesh of grid lines being the stock example — [jtr13/cc19](https://jtr13.github.io/cc19/tuftes-principles-of-data-ink.html)
- A companion rule: **erase redundant data-ink**, again within reason — ink that repeats a value already shown — [jtr13/cc19](https://jtr13.github.io/cc19/tuftes-principles-of-data-ink.html)
- The "within reason" qualifier is load-bearing: some sources note it is sometimes necessary to add non-data-ink back to make a graph readable — [jtr13/cc19](https://jtr13.github.io/cc19/tuftes-principles-of-data-ink.html)
- Origin is *The Visual Display of Quantitative Information*; the summaries above are course slides and blogs, so exact book wording is unverified — [Jim Nielsen's notes](https://notes.jim-nielsen.com/n/2021-04-28-1222/)

**Few's removal list (primary text)**
- Pitfall #3, excessive detail or precision: "dashboards should never display information that is more detailed or precise than necessary"; his example is "$3,848,305.93 rather than $3,848,306 or perhaps even $3.8M", and timestamps "down to the level of seconds, which seems excessive". "With a dashboard, every unnecessary piece of information results in wasted time" — [Few, Feb 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- Pitfall #11, useless decoration: decoration "becomes an absurd distraction from the task at hand"; "even people who enjoy the decoration upon first sight will grow weary of it in a short time"; decorative graphics are "pure decoration, visual content that the viewer must process to get to the data" — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- Pitfall #6 is named "Introducing meaningless variety" and Pitfall #7 "Using poorly designed display media" — [Few, 2006, table of contents](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- Pitfall #13, on aesthetics: Few is **not** anti-beauty — "I'm not advocating that we add touches to make dashboards pretty, but rather that we attractively display the data itself without adding anything whatsoever. There is a difference." He also notes a too-dark graph background as a specific fault — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)

**NN/g on removal**
- NN/g's dashboard example shows that **removing decorative icons next to numbers** makes the figures easier to find: large unadorned numbers scan better than numbers paired with money-themed icons — [Laubheimer, NN/g, 2017](https://www.nngroup.com/articles/dashboards-preattentive/)
- Guideline 8 of 8 for complex applications: "**Remove nonessential graphics and icons.** Salience doesn't always require added emphasis like bright color or heavier weight" — [Kate Kaplan, NN/g, *8 Design Guidelines for Complex Applications*, 8 November 2020](https://www.nngroup.com/articles/complex-application-design/)
- Minimalism = "a low-density aesthetic style in which a design provides the bare minimum components needed to fulfill some purpose"; designers should minimise "noise" — elements of low informational value, including "anything meant for 'decoration' only" — [NN/g, Aesthetic and Minimalist Design (Usability Heuristic #8)](https://www.nngroup.com/articles/aesthetic-minimalist-design/)
- **87%** of the 112 minimalist sites showed "restricted features and elements", removing graphic elements with no clear purpose — tempered by the mantra "subtract it till it breaks" and a warning against cutting content users need — [Moran, NN/g, 12 July 2015](https://www.nngroup.com/articles/characteristics-minimalism/)
- NN/g has a dedicated treatment of chart junk, following Tufte in removing even gridlines and decoration that carry no data — [NN/g, Clutter-Free Charts (video)](https://www.nngroup.com/videos/chartjunk/)

**The counter-evidence — stated as disagreement, not averaged**
- Bateman et al., *Useful Junk? The Effects of Visual Embellishment on Comprehension and Memorability of Charts* (CHI 2010): accuracy in describing **embellished** charts was no worse than plain charts, and recall after a two-to-three-week gap was significantly better — [Bateman et al., 2010 (PDF)](https://vis.csail.mit.edu/classes/6.859/readings/pdfs/Bateman-UsefulJunk.pdf)
- The authors themselves did **not** recommend embellishment as a general strategy — [Bateman et al., 2010](https://vis.csail.mit.edu/classes/6.859/readings/pdfs/Bateman-UsefulJunk.pdf)
- Limits: ~20 participants and a small set of Holmes-style graphs; a statistics blog criticised the plain comparison charts as themselves poorly made — [Gelman, Statistical Modeling blog](https://statmodeling.stat.columbia.edu/?p=11385)
- Few's rebuttal: parts of the embellishment camp have "exceeded the study's reach by using it to justify design practices that research has firmly established as harmful and ineffective" — [Few, 2011 (PDF mirror)](https://webspace.science.uu.nl/~telea001/uploads/VACourse/Few11.pdf)
- A follow-up study found data-**relevant** enhancements aided recall of titles and thematic elements but did **not** significantly affect recall of specific data values, and that recall of chart topics was *worse* than plain charts when the embellishment was unrelated — [IJSW, Memorability of Enhanced Informational Graphics](https://journals.shareok.org/ijsw/article/view/54)

### Inferences
- A removal checklist you can run against a built page, all of it traceable above: no 3D; no gauges, pies, donuts or treemaps; no icon beside a number unless the icon encodes something the number doesn't; no colour without a named meaning; no decorative illustration; no gridline that isn't needed to read a value; numbers rounded to the precision a decision needs (`$3.8M`, not `$3,848,305.93`); no timestamp more precise than the task requires.
- The data-ink ratio is not literally computable for an HTML admin page, but a usable proxy is a **count**: for each element, state the datum it carries; elements with no datum are candidates for deletion. Tufte's "erase redundant data-ink" maps to the common admin bug of labelling the same value twice (column header + repeated unit in every cell + icon).
- Bateman's finding does not transfer to this project even taken at face value: it concerns **memorability of standalone charts weeks later**, whereas an operational admin screen is read repeatedly for immediate action, where Few's "time is of the essence" argument applies. Say this explicitly rather than treating the literature as balanced-and-therefore-neutral.
- Few's Pitfall #13 is the guard against over-applying everything else: the target is "attractively display the data itself", so stripping to bare unstyled HTML is also a failure mode.

### Gaps
- **Tufte's primary wording is unverified.** The data-ink definition and quotes come from course notes and blogs; the book was not accessible. The frequently cited "maximise the data-ink ratio" and "data density" / "shrink principle" concepts were not confirmed against primary text here.
- Few's *Common Pitfalls* paper carries **Feb 2006** on its title page but **© 2005** in its page footers; cite with that ambiguity noted.
- The widely repeated numbers attributed to Few — "seven or fewer visual elements", "no more than two notifications", "put the essential items in the upper left" — came only from **secondhand ArcGIS help pages summarising his 2007 real-time situation-awareness whitepaper**, e.g. [Author effective dashboards (ArcGIS help)](https://gis.streamstats.usgs.gov/arcgis/help/en/portal/latest/use/author-effective-dashboards.htm). They do **not** appear in the 2006 paper I read. Treat as unverified.
- NN/g's chart-junk video was not viewed (video format); only its existence and framing are cited.

---

## Density and information hierarchy: deciding what belongs on the screen at all

### Takeaway
Few's primary text supplies the only hard constraint anyone publishes — **everything must fit on one screen with no scrolling or fragmentation**, justified by short-term memory limits — plus two usable cut tests: a measure without context doesn't earn its place, and if everything is prominent, nothing is. NN/g adds the mechanism for what survives the cut: staged/progressive disclosure, with secondary detail reachable without leaving the screen. **No source gives a maximum number of metrics or widgets.**

### Cited Findings

**The single-screen rule (Few, Pitfall #1)**
- "Something powerful happens when information is seen together, at the same time… Something critical is sacrificed when the viewer must lose sight of some data in order to scroll down or over, or move from screen to screen to see the rest." — [Few, Feb 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- The stated reason is cognitive: "we can only hold a few chunks of information at a time in short-term memory. Relying on the mind's eye to retain a visualization that is no longer visible is a limited venture" — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- He names the benefit "the **simultaneity of vision**, the ability to see everything you need at once" — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- Fragmenting data behind radio buttons or list boxes is the same error as scrolling: in his example the viewer "can never compare the performance of products or regions, which is a common need". "Splitting the big picture into a series of separate small pictures is a mistake when seeing the big picture is worthwhile." — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)

**Cut test 1 — a number without context doesn't belong (Few, Pitfall #2)**
- "To state that quarter-to-date sales total $736,502 without any context means little. Compared to what? Is this good or bad?… Are we on track?" — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- The fix is specific and checkable: add "one or more comparative measures, such as a target or some history, as well as a quick visual means for assessing the measure's qualitative state (for example, good, satisfactory, or bad)" — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- "A great deal of space is used by these gauges to tell us far too little" — his objection to gauges is a space-per-datum argument — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)

**Cut test 2 — flat prominence is failure (Few, Pitfall #10)**
- "If you're like me, because everything in this dashboard is visually prominent and vying for your attention, nothing in particular grabs your attention. When this happens the dashboard has failed." — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- "**When everything is visually prominent, nothing stands out. All of the data displayed on a dashboard ought to be important, but not all data are equally important.**" — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- Non-data chrome must be subdued: logos and navigation "aren't data and should therefore be subdued" — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)

**Layout and arrangement (Few, Pitfall #9)**
- The top-left is "the most prominent position" and "prime real estate"; spending it on a vendor logo and navigation controls is "a waste" — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- Related measures must be adjacent: his example faults a dashboard for placing a trend line away from the average-order-size meter it relates to, so "their relationship" can't be easily seen — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)
- "The goal is not simply to make the dashboard look good, but to arrange the data in a manner that fits the way it's used. The most important data ought to be prominent. Data that requires immediate attention ought to stand out. Data that should be compared ought to be arranged and visually designed to encourage comparisons." — [Few, 2006](https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf)

**NN/g on what to show and what to defer**
- "Every extra unit of information in an interface competes with the relevant units of information and diminishes their relative visibility" — [NN/g, 10 Usability Heuristics Applied to Complex Applications](https://www.nngroup.com/articles/usability-heuristics-complex-applications/)
- Keep a dashboard to a single, at-a-glance screen focused on one task, with interaction kept to a minimum — dashboards are not for exploration — [Laubheimer, NN/g, 18 June 2017](https://www.nngroup.com/articles/dashboards-preattentive/)
- Distinguish **operational** dashboards (time-sensitive action, continuously changing data) from **analytical** ones (later analysis, less urgency) — the audience test that precedes layout — [Laubheimer, NN/g, 2017](https://www.nngroup.com/articles/dashboards-preattentive/)
- Guideline 6, "Reduce Clutter Without Reducing Capability": use **staged disclosure** so options appear only when relevant (e.g. a sub-setting appears after its parent checkbox is checked) — [Kaplan, NN/g, 8 November 2020](https://www.nngroup.com/articles/complex-application-design/)
- Guideline 7, "Ease Transition Between Primary and Secondary Information": let users reach supplemental information **without leaving the main screen**, e.g. a hover tooltip giving precise chart values — [Kaplan, NN/g, 2020](https://www.nngroup.com/articles/complex-application-design/)
- The article names 8 guidelines and 5 traits but gives **no numeric thresholds** — no click counts, pixel values or time limits — [Kaplan, NN/g, 2020](https://www.nngroup.com/articles/complex-application-design/)

**Deciding table columns by task (NN/g)**
- The four major user tasks for a data table: (1) find records fitting specific criteria, (2) compare data, (3) view/edit/add a single row's data, (4) take action on records — [Page Laubheimer, NN/g, *Data Tables: Four Major User Tasks*, 3 April 2022](https://www.nngroup.com/articles/data-tables/)
- Column decisions: make the first column a **human-readable identifier**, not an auto-generated ID; **order default columns by importance**; keep related columns adjacent; make hiding/reordering columns easy with a visible indicator of what is hidden — [Laubheimer, NN/g, 2022](https://www.nngroup.com/articles/data-tables/)
- Comparison support: freeze header rows and header columns when the table is larger than the screen; use **borders, zebra striping, or hover highlighting** to help users keep their place — [Laubheimer, NN/g, 2022](https://www.nngroup.com/articles/data-tables/)
- Row actions: inline actions work for **one or two** actions; with more they become crowded or hidden in a menu. Batch actions use row checkboxes with controls above or below the table — [Laubheimer, NN/g, 2022](https://www.nngroup.com/articles/data-tables/)
- Editing: edit in place only if the table is narrow; make editable rows look different from read-only rows; avoid modals for deep editing because they cover adjacent records — a **non-modal side panel** is better; accordions "tend to clutter the display" — [Laubheimer, NN/g, 2022](https://www.nngroup.com/articles/data-tables/)
- The article gives **no** recommended column count, truncation rule or density figure — [Laubheimer, NN/g, 2022](https://www.nngroup.com/articles/data-tables/)

**Density has to be balanced across scales (Material)**
- "When increasing component density you should also decrease your layout or grid density" — [Material, Applying density](https://material.io/design/layout/applying-density.html)

### Inferences
- The one genuinely checkable density rule available: **open the page at the target viewport and count what requires scrolling or a control-click to see.** Few's standard is zero for anything that must be compared. For an admin app this realistically applies per *panel* (a dashboard summary) rather than to paginated tables, which are a list, not a dashboard.
- A three-question cut test, each answerable yes/no about a built screen, assembled from the Few and NN/g material: (1) does this element answer a question the user has *right now* (operational) or could it wait (analytical → another screen)? (2) does it carry a comparison (target, previous period, threshold) or is it a bare number? (3) is it in the top-left prime real estate while being chrome rather than data?
- Few's Pitfall #10 implies a prominence budget that is visually auditable: squint at the screen; if more than one or two things pull the eye, emphasis has been spent too widely. Combine with Kaplan's guideline 8 — salience should be achieved by **removing competitors** rather than by adding colour or weight.
- NN/g's four table tasks give a defensible column-cutting procedure: list the user's task, keep the columns that serve finding/comparing, and move the rest behind the row-detail side panel. That also resolves where cut content goes, which Few's single-screen rule alone does not.
- NN/g's borders-or-zebra-or-hover trio means the row-tracking job needs exactly **one** of those three, not all three — a concrete over-decoration check for the table.

### Gaps
- **No source gives a maximum number of metrics, widgets, cards or columns per screen.** NN/g explicitly has no such rule; the "seven or fewer visual elements" figure circulating online traces only to secondhand ArcGIS summaries of Few (see previous section's Gaps), not to his own text I read.
- No published method converts "fits on one screen" into a viewport size, so the single-screen rule is only checkable once you fix a target resolution — and Few's 2006 paper predates modern displays and responsive layout.
- No empirical evidence found on whether progressive/staged disclosure in admin tools costs task time; NN/g presents it as a guideline, not a measured result.
- Few's paper contains an appended vendor addendum (ProClarity); the surrounding commercial context should be noted even though the 13 pitfalls themselves are his.
