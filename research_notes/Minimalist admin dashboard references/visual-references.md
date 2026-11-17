# Minimalist light-theme SaaS admin dashboard references

Reference the user already picked: [SaaS AI Agent Interface Design — Enrolliq, by Filllo on Dribbble](https://dribbble.com/shots/27659548-SaaS-AI-Agent-Interface-Design-Enrolliq). Its qualities, as given in the brief: light lavender-grey page background, white cards with soft rounded corners and very light borders, narrow white left sidebar with grouped nav and a user card pinned at the bottom, a row of stat cards across the top, a table below, one accent colour used sparingly, lots of whitespace.

**Verification method note.** Entries marked *(visually verified)* were opened in a browser at 1440x900 and screenshotted during this research, so the light/dark call and the layout description are first-hand. Entries marked *(not visually verified)* come from search-result text only — Dribbble and Behance could not be rendered reliably in this environment (see Gaps). This distinction matters because the brief rejects dark dashboards, and I did not want to assert "light" where I had not seen it.

## What specific Dribbble, Behance, Mobbin, Land-book, SaaS Interface, Page Flows or Godly entries show light minimal admin dashboards with a grouped left sidebar?

### Takeaway

Of the suggested galleries, **SaaS Interface** and **SaaSUI** are the two that actually deliver openable, linkable, light admin-dashboard entries; Mobbin has exactly the right content and indexed public URLs but refuses automated access; Dribbble and Behance yield URLs but mostly concept kits rather than restrained product UI; Land-book and Godly were ruled out as marketing-page galleries, which the brief excludes.

### Cited Findings

- **SaaS Interface has a dedicated Dashboard page category** at `https://saasinterface.com/pages/dashboard/`, which claims 161 examples. Nine were readable in the fetched page: Secfi, June, Compound, Visitors, Grafana, Ahrefs, Casual, Similarweb and Mixpanel. The preview-image filenames carry dates of 2022 and 2023 (e.g. `secfi-3`, 2023/07; `june-2`, 2022/06) — [SaaS Interface, Dashboard category](https://saasinterface.com/pages/dashboard/)
- The same site's category list contains **Pages** (Dashboard, Lists & Tables, Settings, Billing/Plan, Boards, Directory, Activity Feed, …) and **Components** (Side Panel, Filters, Bulk Actions, …), but there is no "admin" category — [SaaS Interface](https://saasinterface.com/)
- **SaaSUI maintains a dashboard pattern index covering 99 apps**, each at `/pattern/dashboard/<slug>`, including Attio (2 screens), Linear (2), Cycle (1), Dub (1), Campsite (1), Vercel (1), Twenty (3), Slite (1), Front (1), Reform (1), PostHog (1), Read.cv (4), Mixpanel (1) — [SaaSUI dashboard pattern index](https://www.saasui.design/pattern/dashboard)
- **Mobbin catalogues exactly this pattern and exposes public URLs**, including a dashboard-layout screen category at `https://mobbin.com/explore/web/screens/dashboard-layout` and individual screens such as a Linear web project dashboard at `https://mobbin.com/explore/screens/f3f67643-02a7-49c9-a337-66eaf46c896b`. Its dashboard-layout category is described as also containing GitHub, Figma, ClickUp and Featurebase examples — [Mobbin explore: dashboard layout](https://mobbin.com/explore/web/screens/dashboard-layout); [Mobbin: Linear web project dashboard](https://mobbin.com/explore/screens/f3f67643-02a7-49c9-a337-66eaf46c896b)
- **Mobbin returned HTTP 403 Forbidden** when opened in an automated browser, rendering only a "The request was blocked" page *(visually verified)*. Separately, reviewers report Mobbin's web/SaaS coverage is thinner than its mobile coverage, with the largest searchable archive behind a paid subscription — [Mobbin alternatives review, InspoAI](https://www.inspoai.io/blogs/mobbin-alternatives); [Toolworthy, 10 Best Mobbin Alternatives 2026](https://www.toolworthy.ai/blog/mobbin-alternatives)
- **Dribbble entries found** *(not visually verified)*: [Minimal Sidebar for Botly AI Dashboard, by Tran Mau Tri Tam](https://dribbble.com/shots/22059096-Minimal-Sidebar-for-Botly-AI-Dashboard), which the listing says offers both light and dark modes; [Dashboard Sidebar Menu (Light & Dark Mode), by Artyom Cherepanov](https://dribbble.com/shots/24939861-Dashboard-Sidebar-Menu-Light-Dark-Mode), a collapsible sidebar in both themes; [Admin dashboard interface, by Flowbite](https://dribbble.com/shots/20272463-Admin-dashboard-interface), described by the designer as a Dashboard Page example from the Flowbite Pro package; [Dashboard Sidebar Navigation, by Zafor](https://dribbble.com/shots/15994018-Dashboard-Sidebar-Navigation), shown in light and dark modes
- **A Dribbble tag page for white dashboards exists but is nearly empty** — the `white-sidebar` tag reportedly holds only 3 designs — [Dribbble: white_dashboard tag](https://dribbble.com/tags/white_dashboard); [Dribbble: white-sidebar tag](https://dribbble.com/tags/white-sidebar)
- **A popular Dribbble sidebar shot must be rejected on theme**: Tran Mau Tri Tam's [Minimal sidebar navigation for dashboard](https://dribbble.com/shots/16451584-Minimal-sidebar-navigation-for-dashboard), the highest-liked result at roughly 1.8k likes, is explicitly a dark-theme version and is about 1,887 days old (c. 2020), so it fails both the light-theme and recency constraints
- **Behance entries found** *(not visually verified)*, all marketplace/Figma kits rather than shipping UI: [Clean & Minimal UI for Saas Dashboard, Qazi Ihtesham](https://www.behance.net/gallery/182104981/Clean-Minimal-UI-for-Saas-Dashboard); [Modern Dashboard UI — SaaS, Clean & Minimal](https://www.behance.net/gallery/218990241/Modern-Dashboard-UI-SaaS-Clean-Minimal-Design); [Kleon — Clean Admin Panel Dashboard UI Template](https://www.behance.net/gallery/120530047/Kleon-Clean-Admin-Panel-Dashboard-UI-Template), a light-and-dark template of about 30 screens

### Inferences

- SaaS Interface and SaaSUI are the better fit for this brief than Dribbble, because both catalogue *shipped* product screens. Dribbble's minimal-dashboard supply is dominated by sidebar-only studies and paid UI kits, which is why so few of its results are a whole admin screen with a grouped sidebar plus a stat row plus a table.
- Land-book and Godly were deliberately not mined: both are galleries of marketing/landing pages, and the brief rejects marketing pages. Page Flows is primarily a user-flow recording library behind a paywall, so it cannot satisfy the "URL I can open" constraint for a specific dashboard frame.
- Mobbin's URLs are worth handing to the user anyway. The 403 is a bot block, not a paywall on the page itself, so a human with a browser is likely to see the screen; the free tier does limit search.

### Gaps

- I could not visually confirm light vs dark for any Dribbble or Behance entry. Dribbble navigation was denied in the browser pane on one attempt and inconsistent on another, and I did not retry per site-access guidance. The light/dark claims above are the galleries' own descriptions, not my observation — the user should eyeball each before showing it to anyone.
- Mobbin's dashboard-layout category contents could not be enumerated (403), so I cannot say which of its screens are light or which have a grouped sidebar beyond what the search snippets named.
- SaaS Interface showed only 9 of its claimed 161 dashboard entries in the fetched page, and gives no per-example permalink — only image URLs. I could not therefore link to an individual product's screen on that site.
- I found no Page Flows, Land-book or Godly entry that meets the brief, so none is listed.

## Which real product screenshots are available publicly that show this pattern?

### Takeaway

SaaSUI is the single best public source of real, shipping-product dashboard screenshots for this pattern — the pages are free, openable, and each states how many real screens it holds — and four of its entries (Linear, Attio, Cycle, Dub) are light-theme admin UI with a grouped left sidebar.

### Cited Findings

- **Linear — 2 real screens, light** *(visually verified)*. The SaaSUI page renders two light screenshots showing a narrow grouped left sidebar against a white/near-white working area, with no stat-card row and essentially no colour beyond small status indicators — [SaaSUI: Linear dashboard UI](https://www.saasui.design/pattern/dashboard/linear)
- **Attio — 2 real screens, light** *(visually verified)*. Both screenshots are light, showing a grouped left sidebar and a dense record table across the main area — [SaaSUI: Attio dashboard UI](https://www.saasui.design/pattern/dashboard/attio)
- **Cycle — 1 real screen, light** *(visually verified)*. Light, narrow grouped sidebar, single restrained accent, very little decoration — [SaaSUI: Cycle dashboard UI](https://www.saasui.design/pattern/dashboard/cycle)
- **Dub — 1 real screen, light** *(visually verified)*. Light page with left sidebar and a sparse content area; the page is titled "Dub Dashboard UI: 1 real screens" — [SaaSUI: Dub dashboard UI](https://www.saasui.design/pattern/dashboard/dub)
- **Vercel — 1 real screen, but off-pattern** *(visually verified)*. The catalogued screen is Vercel's project grid with top navigation and dark card thumbnails, not a left-sidebar admin dashboard, so it does not match the Enrolliq skeleton — [SaaSUI: Vercel dashboard UI](https://www.saasui.design/pattern/dashboard/vercel)
- **Campsite — 1 real screen, light but off-pattern** *(visually verified)*. Light, but it is a social/feed surface with large colourful media thumbnails and an avatar-heavy header rather than a stat-and-table admin screen — [SaaSUI: Campsite dashboard UI](https://www.saasui.design/pattern/dashboard/campsite)
- **SaaS Interface's dashboard set is also all real products**, naming Secfi, June, Compound, Visitors, Grafana, Ahrefs, Casual, Similarweb and Mixpanel — [SaaS Interface, Dashboard category](https://saasinterface.com/pages/dashboard/)
- **Mobbin's Linear and Notion web dashboard screens** are catalogued with public URLs, including a Linear cycle view with progress indicators and charts and a Notion dashboard-layout screen with charts and cards — [Mobbin: Linear web project dashboard](https://mobbin.com/explore/screens/f3f67643-02a7-49c9-a337-66eaf46c896b); [Mobbin explore: web](https://mobbin.com/explore/web)

### Inferences

- Real shipping products systematically differ from the Enrolliq concept in one specific way: they rarely lead with a row of big stat cards. Linear, Attio and Cycle all go straight to a working table or list. That is probably because real teams navigate to records, not to vanity metrics — which is a genuinely useful counterpoint to show alongside the Enrolliq shot.
- Conversely, this means the Enrolliq stat-card row is the part of its layout least supported by shipping precedent, and the part most likely to look empty with real data. The Catalyst demo (next section) is the best evidence that the stat row *can* work when stripped of card chrome.

### Gaps

- SaaSUI's screenshots are hosted images on a third-party catalogue, not the vendors' own marketing pages. I did not find a first-party page (e.g. on attio.com or linear.app) that shows a full light admin dashboard at a stable, linkable URL. A search for an Attio light dashboard screenshot on its own site returned only integration documentation, not a confirmed dashboard image.
- I could not confirm capture dates for the SaaSUI screenshots; the pages did not display one in the rendered view. Treat "current" claims cautiously.
- Campsite shut down as a product; I did not verify its current status, so its entry may be historical. Flagging rather than asserting.

## Among these, which are the MOST minimal — fewest colours, least decoration, most whitespace?

### Takeaway

Ranked by restraint, the **Tailwind Catalyst demo** is the most minimal thing found that still matches the Enrolliq skeleton exactly, and it is more restrained than Enrolliq itself because it removes the card around each stat; **Linear** and **Cycle** are the most austere real products; **shadcn/ui dashboard-01**, **Nuxt UI** and **Tremor** are progressively more decorated.

### Ranked shortlist (most restrained first)

**1. Tailwind Catalyst demo** — https://catalyst-demo.tailwindui.com — *live demo, design-system concept with fake data, layouts shipped 24 May 2024* *(visually verified: light)*
Does well: strips the card entirely — four stats sit on the bare white page separated by hairline rules, so the only "decoration" in the top half of the screen is typography.
vs Enrolliq: structurally near-identical (grouped left sidebar, user card pinned bottom, stat row, table below) but **more restrained** — Enrolliq keeps white cards with borders on a lavender field; Catalyst keeps the field white and deletes the card.

**2. Linear (real product, light theme)** — https://www.saasui.design/pattern/dashboard/linear — *real shipping product* *(visually verified: light)*
Does well: proves a grouped sidebar can carry an entire product with no stat cards, no badges and no colour beyond tiny status marks.
vs Enrolliq: far more austere, but it drops the stat row the brief's reference is built around — show it as the "how far could we strip this" end of the range, not as a drop-in.

**3. Cycle** — https://www.saasui.design/pattern/dashboard/cycle — *real shipping product* *(visually verified: light)*
Does well: narrow grouped sidebar with a single restrained accent and generous gutters.
vs Enrolliq: similar sidebar discipline, less card chrome, no stat row.

**4. Attio** — https://www.saasui.design/pattern/dashboard/attio — *real shipping product* *(visually verified: light)*
Does well: shows the grouped-sidebar-plus-table half of the Enrolliq layout at real data density.
vs Enrolliq: same sidebar and table pattern; denser and flatter, with no soft-rounded card surfaces.

**5. Dub** — https://www.saasui.design/pattern/dashboard/dub — *real shipping product* *(visually verified: light)*
Does well: very sparse content area; a good example of an empty-ish state that still reads as finished.
vs Enrolliq: same light-sidebar family, much less content per screen.

**6. Untitled UI — analytics dashboard with sidebar navigation (dashboard-04)** — https://untitledui.com/react/components/dashboards/dashboard-04 — *live interactive preview, design system with fake data* *(visually verified: light)*
Does well: a whole family of consistent light dashboard layouts to compare side by side — siblings include [dashboard-01](https://untitledui.com/react/components/dashboards/dashboard-01), [dashboard-03](https://untitledui.com/react/components/dashboards/dashboard-03), [dashboard-05](https://www.untitledui.com/react/components/dashboards/dashboard-05), [dashboard-08](https://untitledui.com/react/components/dashboards/dashboard-08), [dashboard-10](https://www.untitledui.com/react/components/dashboards/dashboard-10), [dashboard-11](https://www.untitledui.com/react/components/dashboards/dashboard-11), [dashboard-17](https://www.untitledui.com/react/components/dashboards/dashboard-17), [dashboard-14 (cards)](https://untitledui.com/react/components/dashboards/dashboard-14). Built with React Aria and Tailwind CSS.
vs Enrolliq: the closest match in *tone* — same soft light palette and sparing accent — but more icons and avatars than Enrolliq, and some entries are PRO-gated behind sign-in.

**7. shadcn/ui dashboard-01** — https://ui.shadcn.com/view/new-york-v4/dashboard-01 — *live full-page demo, open source, free* *(visually verified: light)*
Does well: an honest, buildable version of the pattern — inset grouped sidebar with user at the bottom, four bordered stat cards, area chart, tabbed data table.
vs Enrolliq: same bones but noticeably busier — trend badges on every stat card, a chart with range toggles, and tabs above the table.

**8. Nuxt UI dashboard template** — https://dashboard-template.nuxt.dev — *live demo, open source* *(visually verified: light)*
Does well: a running, clickable example with a collapsible grouped sidebar, four stat cards and a table.
vs Enrolliq: similar skeleton, but a large saturated green area chart dominates the page, so it is less restrained on colour.

**9. Tremor dashboard** — https://dashboard.tremor.so/overview — *live demo, open source* *(visually verified: light)*
Does well: shows how to pack real operational metrics (billing cycle, usage bars) into a light layout without going dark.
vs Enrolliq: much higher data density, multiple blue/indigo progress bars, many small numbers — the least restrained entry here, included as the "what happens when real data arrives" counterexample.

**10. SaaS Interface — Dashboard category** — https://saasinterface.com/pages/dashboard/ — *index of real product screens, images dated 2022–2023*
Does well: a browsable set of real dashboards (Secfi, June, Compound, Visitors, Grafana, Ahrefs, Casual, Similarweb, Mixpanel) to scan quickly for light-sidebar examples.
vs Enrolliq: an index rather than a single reference; use it to find rebuttals to the concept's perfect content lengths.

**11. SaaSUI — dashboard pattern index** — https://www.saasui.design/pattern/dashboard — *index of 99 real products*
Does well: lets the user jump to any product's real screens, which is the fastest way to sanity-check a concept against shipping UI.
vs Enrolliq: same purpose as above — a library, not a single comparable.

**12. Mobbin — dashboard layout screens** — https://mobbin.com/explore/web/screens/dashboard-layout — *real product screens; 403 to automated clients, human-openable, free tier limited*
Does well: catalogues the same pattern across Linear, Notion, GitHub, Figma, ClickUp and Featurebase.
vs Enrolliq: real-data counterweight. **Caveat: could not be verified first-hand — it blocked automated access.**

### Cited Findings

- **Catalyst's demo content, confirmed in detail**: a sidebar with Home / Events / Orders / Settings, then an "Upcoming Events" group of four links, then Support and Changelog, with a user card at the bottom showing an avatar, the name Erica and erica@example.com; the main area holds four stat cards (Total revenue $2.6M +4.5%, Average order value $455 −0.5%, Tickets sold 5,888 +4.5%, Pageviews 823,067 +21.2%) above a Recent orders table with Order number / Purchase date / Customer / Event / Amount columns — [catalyst-demo.tailwindui.com](https://catalyst-demo.tailwindui.com)
- **Catalyst's sidebar layout shipped 24 May 2024** and is described as a "classic sidebar layout" that collapses into a mobile menu — [Tailwind CSS blog, Catalyst: Application layouts](https://tailwindcss.com/blog/2024-05-24-catalyst-application-layouts)
- **Catalyst is a paid kit**: $149 one-time for the standalone kit, or bundled at $299; current versions listed as Tailwind CSS v4.2, React v19, Headless UI v2.1, TypeScript v5.3. The *demo* is free to view — [Tailwind Plus, Catalyst](https://tailwindcss.com/plus/templates/catalyst)
- **shadcn/ui dashboard-01** is documented as "a dashboard with sidebar, charts and data table", using an inset sidebar variant, a `SectionCards` stat row, an interactive area chart and a data table; content areas use a muted background tint (`bg-muted/50`) with `rounded-xl` corners — [shadcn/ui blocks](https://ui.shadcn.com/blocks)
- **Untitled UI dashboards are built with React Aria and Tailwind CSS**, are installable via `npx untitledui@latest example dashboards-02/17 --yes`, and at least one (the analytics overview with sidebar navigation) is PRO-gated behind sign-in — [Untitled UI, dashboard-04](https://untitledui.com/react/components/dashboards/dashboard-04)
- **Tremor's demo dashboard** is published at `https://dashboard.tremor.so/overview`, with the repo at `https://github.com/tremorlabs/tremor`; the site footer reads "© 2025 Tremor Labs, Inc." and a banner announces "Tremor is joining Vercel" — [Tremor docs, demo dashboard](https://tremor.so/docs/getting-started/demo-dashboard)
- Sources conflict on Tremor's licence: the docs describe the dashboard template as free and open source in TypeScript and Tailwind CSS, while another result states the site template is a commercial product licensed under the Tremor License — [Tremor docs, demo dashboard](https://tremor.so/docs/getting-started/demo-dashboard). Worth checking before reuse; it does not affect using it as a visual reference.

### Inferences

- The restraint ranking tracks one variable more than any other: **how much chrome sits around a number**. Catalyst (no card), Linear/Cycle (no stat row at all), Enrolliq (bordered card on tinted field), shadcn (bordered card plus badge), Tremor (card plus badge plus progress bar) form a clean progression the user can show as a spectrum.
- If the user's real goal is "as minimalist as possible" while keeping the Enrolliq skeleton, Catalyst is the single most useful link in this document: it is the same layout with one layer of decoration removed, and it is a running page rather than a static image, so the person being shown it can resize and click it.
- Concepts versus products matters here in a concrete way. Catalyst, Untitled UI, shadcn, Nuxt UI and the Dribbble/Behance entries all use invented data with convenient string lengths; Linear, Attio, Cycle and Dub do not. Any claim that "this stays clean at scale" should be made from the second group.

### Gaps

- I could not rank the Dribbble and Behance entries by restraint, because I could not see them. They are listed in the first section with URLs but are deliberately excluded from this ranking rather than guessed at.
- Exact colour counts (e.g. "one accent only") were judged from screenshots rendered in a small pane, not from sampling CSS values. The relative ordering is sound; precise hex-level claims are not made.

## Are there any well-known open-source admin dashboards whose live demos are genuinely minimal and light?

### Takeaway

Yes — four live, light, publicly reachable demos were confirmed: **shadcn/ui dashboard-01**, **Nuxt UI dashboard template**, **Tremor's dashboard**, and (free to view though the kit is paid) the **Tailwind Catalyst demo**. Several obvious candidates had to be rejected because they redirect to a sign-in wall.

### Cited Findings

- **shadcn/ui dashboard-01 renders a full light dashboard at a public URL** with no sign-in: grouped left sidebar with a user row at the bottom, four bordered stat cards, a "Total Visitors" area chart with range toggles, and a tabbed data table *(visually verified)* — [ui.shadcn.com/view/new-york-v4/dashboard-01](https://ui.shadcn.com/view/new-york-v4/dashboard-01)
- **Nuxt UI's dashboard template demo is public and light** *(visually verified)*: collapsible grouped left sidebar with a user entry at the bottom, four stat cards across the top, a large green area chart, and a table below — [dashboard-template.nuxt.dev](https://dashboard-template.nuxt.dev)
- **Tremor's demo dashboard is public and light** *(visually verified)*: narrow grouped left sidebar, a "Current billing cycle" block of labelled progress bars, and an "Overview" grid of small stats below — [dashboard.tremor.so/overview](https://dashboard.tremor.so/overview)
- **The Catalyst demo is public and light** *(visually verified)* even though the kit itself is paid — [catalyst-demo.tailwindui.com](https://catalyst-demo.tailwindui.com)
- **Rejected — Twenty (open-source CRM)**: `https://demo.twenty.com` redirects to `app.twenty.com/welcome?action=choose-workspace`, a sign-in / choose-workspace screen, so there is no openable dashboard behind that link *(visually verified)*. Its real screens are, however, catalogued at [SaaSUI: Twenty](https://www.saasui.design/pattern/dashboard/twenty) (3 screens)
- **Rejected — Next.js Learn dashboard**: `https://next-learn-dashboard.vercel.sh/dashboard` redirects to a login page with a blue Acme sign-in form; the dashboard is not publicly viewable *(visually verified)*
- **Rejected — Tailwind Plus application shells**: `https://tailwindcss.com/plus/ui-blocks/application-ui/application-shells/sidebar` redirects to `tailwindcss.com/plus/login` *(visually verified)*, so the sidebar shell previews suggested in the brief cannot be linked as open references
- **Refine** publishes an `app-crm-minimal` example scaffolded with `npm create refine-app@latest -- --example app-crm-minimal`, and its Mantine integration defaults to a light colour scheme (stored under `mantine-color-scheme` with default `light`) — [Refine docs](https://refine.dev/docs/getting-started/overview); [Refine Mantine integration](https://www.mintlify.com/refinedev/refine/ui/mantine)
- **Third-party shadcn block collections exist** with dashboard demos, though several are paid and one states it is not affiliated with official shadcn/ui — [shadcnblocks.com dashboard blocks](https://www.shadcnblocks.com/blocks/dashboard); [shadcn.io disclaimer page](https://www.shadcn.io/blocks/dashboard-quick-actions); [Creative Tim application admin blocks](https://www.creative-tim.com/ui/blocks/application-admin)

### Inferences

- The sign-in walls are the main practical obstacle here, and they are worth flagging to whoever the user is showing this to: three of the most commonly recommended "just look at the demo" links (Tailwind Plus shells, Twenty, Next.js Learn) cannot actually be opened cold. The four confirmed demos above are the ones safe to put in a deck or a message.
- Among the open-source demos, shadcn/ui dashboard-01 is the most useful to the user's own project specifically, because it is free, MIT-style open code and the layout maps onto the Enrolliq skeleton one-to-one — but it is *less* minimal than Catalyst, so it is the pragmatic pick rather than the restraint pick.
- No confirmed open-source demo is as stripped-down as Catalyst. The open-source templates all reach for a chart early, which adds the biggest block of colour on the page.

### Gaps

- I did not open a Refine live demo. The search did not surface a confirmed public URL for `app-crm-minimal`, and I did not want to assert a demo URL I had not loaded.
- Payload CMS, Directus and Metabase admin demos were not checked — they were out of the time budget, and each would need visual verification for the light-theme constraint before being listed.
- Tremor's licence status is genuinely ambiguous between sources (see previous section). This affects reuse, not reference use.
- I did not verify whether the shadcn/ui demo page defaults to light for a first-time visitor with a dark OS preference; it rendered light in this environment, but the blocks page offers a theme toggle, so a viewer's system setting may change what they see.
