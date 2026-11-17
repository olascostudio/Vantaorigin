# Tailwind CSS implementation patterns for a minimal light-theme admin shell (React 18 + Tailwind 3.4, no component library)

> **Scope note for the report writer:** Tailwind Plus (formerly Tailwind UI) application-shell markup and the Catalyst kit's component source are both behind a paid licence. I verified this directly — `tailwindcss.com/plus/ui-blocks/application-ui/application-shells/sidebar` served a login page, and the Catalyst docs pages that are public describe the API but publish none of the internal class strings. Every class string in these notes therefore comes from a source I could actually read: the shadcn/ui registry source on GitHub, the Tremor docs and blocks site, Headless UI docs, and the Tailwind v3 docs. Where a widely-repeated "Tailwind UI" class string could not be verified against a primary source, it is in **Gaps**, not in Cited Findings.
>
> **Second scope note:** shadcn/ui's *current* registry (`apps/v4/registry/new-york-v4`) is Tailwind v4. Several class strings quoted below are v4-only syntax. Each one is flagged and given its Tailwind 3.4 translation.

---

## Q1. Current accepted structure for a Tailwind sidebar application shell (sticky desktop, drawer on mobile)

### Takeaway

The prevailing structure is **not** `sticky` — the respected implementations use a `fixed inset-y-0` full-height sidebar with its own internal `overflow-auto` scroll container, and a separate mobile instance rendered inside a modal dialog. shadcn/ui is the only one of the three whose source is publicly readable, and it renders the sidebar **twice**: a `fixed` desktop column gated behind `md:flex`, and a `Sheet` (Radix Dialog) for mobile at an 18rem width.

### Cited Findings

- shadcn/ui's desktop sidebar container is `fixed`, not sticky: `"fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex"`, with `data-[side=left]:left-0` / `data-[side=right]:right-0` for side placement — [shadcn/ui sidebar.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx); the same `fixed inset-y-0 z-10 hidden h-svh` string is quoted in the [shadcn/ui sidebar docs changelog](https://ui.shadcn.com/docs/components/sidebar)
- The inner wrapper is `"flex h-full w-full flex-col bg-sidebar"` — [shadcn/ui sidebar.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx)
- **The scroll container is the middle region only.** `SidebarContent` is `"flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden"`. `SidebarHeader` and `SidebarFooter` are both `"flex flex-col gap-2 p-2"` and do not scroll — the docs describe the header as "Sticky at the top", the footer as "Sticky at the bottom", and the content as the scrollable region between them — [shadcn/ui sidebar.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx); [shadcn/ui sidebar docs](https://ui.shadcn.com/docs/components/sidebar)
- The mobile drawer is a Radix `Sheet` (a Dialog), not a CSS-only off-canvas: `<Sheet open={openMobile} onOpenChange={setOpenMobile}>` wrapping a `SheetContent` with `data-mobile="true"` and classes `"w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"`; its inline `style` sets `--sidebar-width` to the mobile width — [shadcn/ui sidebar docs](https://ui.shadcn.com/docs/components/sidebar)
- Width constants: `SIDEBAR_WIDTH = "16rem"`, `SIDEBAR_WIDTH_MOBILE = "18rem"`, `SIDEBAR_WIDTH_ICON = "3rem"`; `--sidebar-width` and `--sidebar-width-mobile` are overridable via the `style` prop on `SidebarProvider` — [shadcn/ui sidebar.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx); [shadcn/ui sidebar docs](https://ui.shadcn.com/docs/components/sidebar)
- Composition is `SidebarProvider` → `Sidebar` (props `side`, `variant`, `collapsible`) → `SidebarHeader` / `SidebarContent` / `SidebarFooter`; `SidebarContent` holds `SidebarGroup`s, each with `SidebarGroupLabel` / `SidebarGroupAction` / `SidebarGroupContent`; links live in `SidebarMenu` → `SidebarMenuItem` → `SidebarMenuButton` (plus `SidebarMenuAction`, `SidebarMenuSub`, `SidebarMenuBadge`). `SidebarRail` is a resize/toggle handle, `SidebarInset` wraps main content for `variant="inset"`, `SidebarTrigger` toggles, and `useSidebar()` exposes `toggleSidebar` and state — [shadcn/ui sidebar docs](https://ui.shadcn.com/docs/components/sidebar)
- Catalyst's `SidebarLayout` takes three props — `sidebar` (used at all screen sizes), `navbar` (mobile only), `children` — and on smaller screens the sidebar "moves into a collapsible mobile menu" — [Tailwind CSS blog: Catalyst application layouts](https://tailwindcss.com/blog/2024-05-24-catalyst-application-layouts)
- Catalyst's sidebar composition is `SidebarHeader` / `SidebarBody` / `SidebarFooter`, with `SidebarSection`, `SidebarItem`, `SidebarLabel`, `SidebarHeading`, `SidebarSpacer`. Responsive visibility is done with `"max-lg:hidden"` on sections that should only appear at `lg` and up, so Catalyst's breakpoint for "desktop sidebar" is `lg`, not `md` — [Catalyst sidebar-layout docs](https://catalyst.tailwindui.com/docs/sidebar-layout)
- Catalyst instructs adding `"bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950"` to the `html` element so overscroll matches the layout — i.e. **the page shell behind a sidebar layout is `zinc-100` (#f4f4f5) at `lg`+ and white below it** — [Catalyst sidebar-layout docs](https://catalyst.tailwindui.com/docs/sidebar-layout)
- Headless UI's `Dialog` is the primitive for a licence-free mobile drawer: root gets `className="relative z-50"`, `DialogBackdrop` should be a **sibling** of the panel container rather than a child of the panel, the panel's `onClose` fires on outside click, focus is trapped and outside elements are marked `inert`, Escape closes, and the `open` prop manages scroll locking — [Headless UI Dialog docs](https://headlessui.com/react/dialog)
- Headless UI's documented transition example strings: whole-dialog `"fixed inset-0 flex w-screen items-center justify-center bg-black/30 p-4 transition duration-300 ease-out data-closed:opacity-0"`; panel `"max-w-lg space-y-4 bg-white p-12 duration-300 ease-out data-closed:scale-95 data-closed:opacity-0"`; scroll container `"fixed inset-0 w-screen overflow-y-auto p-4"` — [Headless UI Dialog docs](https://headlessui.com/react/dialog)
- Tailwind 3.4 does support `h-svh` / `h-lvh` / `h-dvh` (and the `min-h-*` / `max-h-*` equivalents), so the `h-svh` in shadcn's sidebar is usable as-is on 3.4 — [Tailwind CSS v3.4 release notes](https://tailwindcss.com/blog/tailwindcss-v3-4)
- A secondary reference catalogues the same shapes independently: sticky header `sticky top-0 z-40 bg-white/95 backdrop-blur`, fixed sidebar `fixed inset-y-0 left-0 z-50 w-72`, "sidebar becomes an off-canvas dialog on mobile" — [Tailwind layouts reference, via search](https://skills.sh/peixotorms/odinlayer-skills/tailwind-layouts)
- A `sticky top-0 h-screen` sidebar inside a flex parent is the alternative approach, but it only works when the flex parent is taller than the viewport — [Themesberg application shell tutorial](https://dev.to/themesberg/how-to-build-an-application-shell-layout-for-tailwind-css-247k)

### Inferences

- **Tailwind 3.4 translation of shadcn's sidebar strings.** `w-(--sidebar-width)` is Tailwind v4 parenthesised-variable syntax; on 3.4 write `w-[--sidebar-width]` (the bracketed CSS-variable shorthand, available since 3.3). Everything else in the desktop container string (`fixed inset-y-0 z-10 hidden h-svh transition-[left,right,width] duration-200 ease-linear md:flex`) is valid 3.4.
- **`fixed` beats `sticky` here for a concrete reason.** With `fixed inset-y-0 w-64` + `md:pl-64` on the content wrapper, the sidebar's scrollbar is independent of the page scrollbar and no flex-parent height condition has to hold. `sticky top-0 h-screen` only pins while the flex parent is taller than the viewport, so a short page un-pins it — which is why the tutorial above has to state that constraint explicitly.
- **Minimum viable 3.4 shell**, assembled from the verified pieces above:
  - Root: `<div class="min-h-screen bg-gray-50">`
  - Desktop sidebar: `<div class="hidden md:fixed md:inset-y-0 md:z-10 md:flex md:w-64 md:flex-col">` → inner `<div class="flex h-full w-full flex-col border-r border-gray-200 bg-white">`
  - Header/footer: `flex flex-col gap-2 p-2` (non-scrolling)
  - Nav region: `flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2`
  - Content: `<div class="md:pl-64">` → `<main class="px-4 py-6 sm:px-6 lg:px-8">`
  - Mobile top bar: `sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 md:hidden`
  - Mobile drawer: Headless UI `Dialog` with `DialogBackdrop` as a sibling (`fixed inset-0 bg-gray-900/80`) and `DialogPanel` `fixed inset-y-0 left-0 w-[18rem] bg-white` + `data-[closed]:-translate-x-full`
- **`data-closed:` is v4 bare-variant syntax.** On Tailwind 3.4 the same thing is `data-[closed]:opacity-0`, `data-[closed]:-translate-x-full`. Headless UI's own React v2 `transition` prop emits the `data-closed` / `data-enter` / `data-leave` attributes either way, so only the variant spelling changes.
- Re-rendering the sidebar twice (desktop column + mobile dialog) means nav items must be factored into a shared array/component, or the active state has to be duplicated. This is the single biggest structural decision in the shell and it is implicit in shadcn's source rather than documented.

### Gaps

- **I could not read Tailwind Plus's own application-shell markup.** The page is paywalled; the fetch returned the Tailwind Plus login form. So the exact class strings for the canonical "Sidebar with header" / "Brand sidebar" shells are unverified here.
- **Catalyst's internals are likewise unreadable.** Neither the announcement post nor the public `sidebar-layout` docs page states whether the desktop sidebar is `fixed` or `sticky`, gives its width, or shows a single class string for it. The docs page explicitly documents no toggle mechanism for the mobile menu.
- Whether shadcn's sidebar was *originally* authored for Tailwind v3 (it shipped in late 2024, during shadcn's v3 era) could not be confirmed — I read only the current `new-york-v4` registry file. A v3-era copy of `sidebar.tsx` would be a better direct reference if the writer can locate one in the repo history.

---

## Q2. Stat / metric cards: markup, spacing, type sizes

### Takeaway

Two credible reference implementations, and they agree on structure (label above value, semibold value, no icon required) but differ on the value's type size: **Tremor uses `text-3xl` (1.875rem/2.25rem) semibold; shadcn's dashboard block uses `text-2xl font-semibold tabular-nums`** scaling up to `text-3xl`. Both lay a row out as a `grid grid-cols-1` that widens at `sm`/`lg`. Tremor's card chrome is `rounded-lg border border-gray-200 bg-white p-6` with the smallest shadow.

### Cited Findings

- **Tremor's `Card` base classes:** `relative w-full text-left`, padding `p-6`, rounding `rounded-lg`, `border` + `border-gray-200` (light), `shadow-xs`, `bg-white`. No ring — [Tremor Card docs](https://tremor.so/docs/ui/card)
- **Tremor KPI card type scale (from the blocks site):** label `"text-tremor-default font-medium text-tremor-content dark:text-dark-tremor-content"`; value `"text-tremor-metric font-semibold text-tremor-content-strong dark:text-dark-tremor-content-strong"`. Some variants drop the label weight (e.g. KPI 3 uses no `font-medium`), and KPI 16 uses `font-medium` rather than `font-semibold` on the value — [Tremor KPI card blocks](https://blocks.tremor.so/blocks/kpi-cards)
- **Tremor's row layout:** `"grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"` (KPI 1), and `"mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"` where it sits below a section header (KPI 16). Most KPI cards pass **no** `className` to `<Card>` at all; only the ones with edge-to-edge content use `className="p-0"` — [Tremor KPI card blocks](https://blocks.tremor.so/blocks/kpi-cards)
- **Tremor's font-size tokens resolve to:** `tremor-label` 0.75rem/1rem, `tremor-default` 0.875rem/1.25rem, `tremor-title` 1.125rem/1.75rem, `tremor-metric` 1.875rem/2.25rem — [Tremor installation / tailwind config](https://npm.tremor.so/docs/getting-started/installation)
- **Tremor's light colour tokens resolve to:** `background` = white, `background-muted` = gray-50, `background-subtle` = gray-100, `background-emphasis` = gray-700, `border` = gray-200, `ring` = gray-200, `content-subtle` = gray-400, `content` = gray-500, `content-emphasis` = gray-700, `content-strong` = gray-900, `content-inverted` = white; brand faint/muted/subtle/DEFAULT/emphasis = blue 50/200/400/500/700 — [Tremor installation / tailwind config](https://npm.tremor.so/docs/getting-started/installation)
- **Tremor's radii and shadows:** `tremor-small` 0.375rem, `tremor-default` 0.5rem, `tremor-full` 9999px; `shadow-tremor-input` = `0 1px 2px 0 rgb(0 0 0 / 0.05)`; `shadow-tremor-card` is a three-layer shadow at `rgb(0 0 0 / 0.1)` — [Tremor installation / tailwind config](https://npm.tremor.so/docs/getting-started/installation)
- **shadcn dashboard-01 stat row:** grid wrapper `"grid grid-cols-1 gap-4 px-4 lg:px-6"` plus `"*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4"` and a gradient treatment `"*:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card"` — [shadcn/ui dashboard-01 section-cards.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/blocks/dashboard-01/components/section-cards.tsx)
- **shadcn metric value:** `CardTitle` = `"text-2xl font-semibold tabular-nums @[250px]/card:text-3xl"`; the label is plain text inside `CardDescription` with no `className`; the delta is a `Badge variant="outline"` with a trend icon at `size-4`; `CardFooter` = `"flex-col items-start gap-1.5 text-sm"`, with a primary line `"line-clamp-1 flex gap-2 font-medium"` and a secondary line `"text-muted-foreground"` — [shadcn/ui dashboard-01 section-cards.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/blocks/dashboard-01/components/section-cards.tsx)

### Inferences

- **Tremor's tokens de-reference cleanly to stock Tailwind 3.4 classes**, which is exactly what is wanted here (no config, no package). Combining the two sources above, Tremor's KPI card *is*:
  ```html
  <div class="relative w-full rounded-lg border border-gray-200 bg-white p-6 text-left shadow-sm">
    <p class="text-sm font-medium text-gray-500">Total creators</p>
    <p class="mt-2 text-3xl font-semibold text-gray-900">1,284</p>
  </div>
  ```
  with the row as `grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3`. (`text-tremor-default` = 0.875rem/1.25rem = `text-sm`; `text-tremor-metric` = 1.875rem/2.25rem = `text-3xl`; `tremor-default` radius 0.5rem = `rounded-lg`.)
- **`shadow-xs` is Tailwind v4 only.** Tailwind 3.4's smallest outer shadow is `shadow-sm` = `0 1px 2px 0 rgb(0 0 0 / 0.05)`, and no `shadow-xs` / `shadow-2xs` class exists in v3 ([v3 box-shadow docs](https://v3.tailwindcss.com/docs/box-shadow)). That value is byte-identical to Tremor's own `shadow-tremor-input`, so **`shadow-sm` on 3.4 is the exact equivalent of `shadow-xs` on v4** for this purpose.
- **`mt-2` between label and value is my own value, not sourced.** Tremor's blocks pass spacing per-block and the fetch did not surface a consistent gap utility; the writer should treat the label→value gap as an open choice (0.5rem is the conventional reading of the examples).
- **shadcn's row uses container queries** (`@container/card`, `@xl/main:`, `@5xl/main:`, `@[250px]/card:`). Container queries are not in Tailwind 3.4 core — they were a first-party plugin (`@tailwindcss/container-queries`) before v4. Since the brief rules out installing things, the 3.4 translation is viewport breakpoints: `grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4`, and a fixed `text-2xl` or `text-3xl` value rather than the `@[250px]` step-up.
- **`*:data-[slot=card]:…` compiles on 3.4 but to the wrong selector — the variant order has to be reversed.** The `*` direct-children variant did ship in 3.4 ([v3.4 release notes](https://tailwindcss.com/blog/tailwindcss-v3-4)), but compiling `*:data-[slot=card]:shadow-sm` with this repo's installed Tailwind 3.4.19 yields `[data-slot="card"] > *` — the attribute lands on the *wrapper*, which does not carry it, so the class matches nothing in shadcn's markup. The intent is `& > *[data-slot="card"]`, and the 3.4 ordering that produces it is `data-[slot=card]:*:shadow-sm`. This matches the ordering in Tailwind's own release-note example, `data-[slot=description]:*:mt-4`. Either way it is styling-at-a-distance; for a readable hand-rolled shell, put the classes on the card itself.
- **`tabular-nums` is the one detail worth lifting from shadcn.** Proportional digits make a row of metric cards visibly ragged and make a number jump width as it updates; shadcn applies `tabular-nums` directly on the value. Tremor's KPI blocks do not.
- The gradient (`from-primary/5 to-card`) and the delta badge are shadcn-template decoration, not structural. A minimal card is label + `tabular-nums` value + optional single-line footnote.

### Gaps

- **`tremor.so/docs/ui/card` no longer carries a KPI/metric example** — the current page's examples are a hero card, a content card and an `asChild` card. The metric label/value class strings above come from the separate blocks site, so the two are not from one page.
- Tremor's `Metric` and `Text` components (referenced in its first-component guide) were not read, so their internal classes are unverified; the blocks site shows the classes applied inline instead.
- No source I read states a canonical **card internal padding for a *dense* admin**. Tremor says `p-6` (1.5rem) for its default card; shadcn's `CardHeader`/`CardContent` padding lives in `card.tsx`, which I did not fetch.

---

## Q3. Data tables on a light background: row separation, padding, headers, horizontal overflow

### Takeaway

The current convention is **`border-b` on each `<tr>` with the last body row's border removed**, not `divide-y`; header cells get a fixed height rather than vertical padding; and overflow is handled by a single `relative w-full overflow-x-auto` wrapper in shadcn, versus an older three-div nested pattern (`-m-1.5 overflow-x-auto` → `inline-block min-w-full p-1.5 align-middle` → `overflow-hidden`) that is still common elsewhere.

### Cited Findings

- **shadcn/ui table class strings**, all from [shadcn/ui table.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/table.tsx):
  - wrapper `div` (`data-slot="table-container"`): `"relative w-full overflow-x-auto"`
  - `table`: `"w-full caption-bottom text-sm"`
  - `thead`: `"[&_tr]:border-b"`
  - `tbody`: `"[&_tr:last-child]:border-0"`
  - `tfoot`: `"border-t bg-muted/50 font-medium [&>tr]:last:border-b-0"`
  - `tr`: `"border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted"`
  - `th`: `"h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]"`
  - `td`: `"p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]"`
  - `caption`: `"mt-4 text-sm text-muted-foreground"`
- **Row separation is `border-b` per row, not `divide-y`.** The header adds the border via `[&_tr]:border-b`; the body strips the final one via `[&_tr:last-child]:border-0`; the footer uses `border-t` and drops its last bottom border — [shadcn/ui table.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/table.tsx)
- **Header styling is weight + height, not case or colour.** `th` is `font-medium` at the same `text-sm` as the body, with `h-10` (2.5rem) instead of `py-*`, `text-left`, `align-middle`, and `text-foreground` — i.e. the *same* colour as body text, differentiated only by weight — [shadcn/ui table.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/table.tsx)
- **Padding is uniform and tight:** `px-2` on `th` (0.5rem), `p-2` on `td` (0.5rem all round) — [shadcn/ui table.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/table.tsx)
- **The nested overflow pattern** — outer `-m-1.5 overflow-x-auto`, then `p-1.5 min-w-full inline-block align-middle`, then an `overflow-hidden` div around the `<table>` — is documented in the HS2 Design System's table examples — [HS2 Design System tables](https://designsystem.hs2.org.uk/design-system/application-toolkit/docs/tables) **⚠ citation caveat:** this host fails TLS certificate verification (`SEC_E_WRONG_PRINCIPAL`, reproduced 6/6 times; the domain CNAMEs to `hs2-azp-wa-designsystem.azurewebsites.net`, so the served cert likely does not match the custom hostname). A reader following the link gets a browser security warning. The same three-div pattern is independently attested by the two sources below, which should be preferred as the citation.
- The roles of those classes: the outer `overflow-x-auto` is what lets the table scroll when wider than its container; `inline-block` + `min-w-full` size the inner container; `align-middle` sets vertical alignment — [Lexington Themes responsive table tutorial](https://lexingtonthemes-com.pages.dev/tutorials/how-to-create-a-responsive-table-with-tailwind-css)
- The same nesting with `sm:px-6 lg:px-8` on the inner div appears in TW Elements' React table examples — [TW Elements tables](https://tw-elements.com/docs/react/data/tables/)
- A single-wrapper version (`overflow-x-auto` around a `min-w-full` table) is also published as sufficient — [Tailkits responsive tables](https://tailkits.com/blog/tailwind-responsive-tables/)
- `align-middle` maps to `vertical-align: middle`, which only affects inline-level boxes — which is why it is paired with `inline-block`; the simpler single-wrapper pattern generally works without it — [Lexington Themes, noted as the author's own observation rather than sourced](https://lexingtonthemes-com.pages.dev/tutorials/how-to-create-a-responsive-table-with-tailwind-css)

### Inferences

- **Tailwind 3.4 translations needed for shadcn's table strings:**
  - `has-aria-expanded:bg-muted/50` → `has-[[aria-expanded]]:bg-muted/50` (bare `has-*` ARIA variants are v4; 3.4 has `has-[...]` with an explicit selector, confirmed shipped in 3.4)
  - `text-foreground`, `bg-muted`, `text-muted-foreground` are shadcn theme tokens, not stock Tailwind. Light-theme substitutions: `text-foreground` → `text-gray-900`, `text-muted-foreground` → `text-gray-500`, `bg-muted/50` → `bg-gray-50`, `border-b` → `border-b border-gray-200`.
  - Everything else (`[&_tr]:border-b`, `[&_tr:last-child]:border-0`, `whitespace-nowrap`, `caption-bottom`) is valid 3.4.
- **A 3.4 light-theme table, assembled:**
  ```html
  <div class="relative w-full overflow-x-auto">
    <table class="w-full caption-bottom text-sm">
      <thead class="[&_tr]:border-b [&_tr]:border-gray-200">
        <tr><th class="h-10 px-3 text-left align-middle font-medium whitespace-nowrap text-gray-900">Name</th></tr>
      </thead>
      <tbody class="[&_tr:last-child]:border-0">
        <tr class="border-b border-gray-200 transition-colors hover:bg-gray-50">
          <td class="px-3 py-2.5 align-middle text-gray-700">…</td>
        </tr>
      </tbody>
    </table>
  </div>
  ```
  (`px-3 py-2.5` rather than shadcn's `p-2` is my loosening for a non-dense admin, not a sourced value.)
- **`divide-y divide-gray-200` on `tbody` is the simpler equivalent** of shadcn's `border-b` + last-child reset, and produces n−1 lines with no reset needed. shadcn's choice of per-row `border-b` is likely driven by needing a border on the header's row and by `data-[state=selected]` rows compositing predictably; for a hand-rolled table `divide-y` is less machinery. No source I read argues for one over the other.
- **`whitespace-nowrap` on every cell is what makes the horizontal scroll meaningful** — without it, narrow viewports wrap cell text instead of overflowing, and the `overflow-x-auto` never engages. This coupling is implicit in shadcn's source (both `th` and `td` carry it) and is the detail most often dropped when adapting.
- The nested three-div pattern's purpose is to let a card's `overflow-hidden` rounded corners coexist with a scrolling table while the negative margin cancels the inner padding that keeps focus rings from being clipped. If the table is not inside a rounded card, the single `overflow-x-auto` wrapper is enough.
- A `sticky top-0 z-10 bg-white` on `thead th` is the usual addition for a tall table; I found no primary source specifying it for an admin table, so it should be flagged as unsourced if the writer includes it.

### Gaps

- **No primary source read here gives a light-theme table *border colour*.** shadcn's `border-b` resolves to its `--border` token; the hex depends on the theme config, which I did not fetch. Tremor's `border` token is gray-200 (#e5e7eb) — that is the nearest sourced value, but it comes from Tremor's config, not from a table.
- Sticky table headers, column alignment conventions for numeric columns, and zebra striping are all unaddressed by the sources I read.
- shadcn's `card.tsx` (which would give the "table inside a card" padding) was not fetched.

---

## Q4. Colour tokens for a light admin: which neutral scale, and specific values

### Takeaway

The two systems I could verify split: **Tremor standardises on `gray`** (white page/card, gray-200 borders, gray-500 secondary text, gray-900 primary text) and **Catalyst standardises on `zinc`** (`zinc-100` page shell, white cards). Tailwind's own docs decline to characterise the scales at all and only note that teams typically alias one gray scale project-wide. The five neutral scales are near-identical in luminance at every step — the difference is hue, not value.

### Cited Findings

- **Tailwind v3 neutral palette, exact hex values** — [Tailwind v3 customizing colors](https://v3.tailwindcss.com/docs/customizing-colors):

  | Step | slate | gray | zinc | neutral | stone |
  |---|---|---|---|---|---|
  | 50 | `#f8fafc` | `#f9fafb` | `#fafafa` | `#fafafa` | `#fafaf9` |
  | 100 | `#f1f5f9` | `#f3f4f6` | `#f4f4f5` | `#f5f5f5` | `#f5f5f4` |
  | 200 | `#e2e8f0` | `#e5e7eb` | `#e4e4e7` | `#e5e5e5` | `#e7e5e4` |
  | 300 | `#cbd5e1` | `#d1d5db` | `#d4d4d8` | `#d4d4d4` | `#d6d3d1` |
  | 400 | `#94a3b8` | `#9ca3af` | `#a1a1aa` | `#a3a3a3` | `#a8a29e` |
  | 500 | `#64748b` | `#6b7280` | `#71717a` | `#737373` | `#78716c` |
  | 600 | `#475569` | `#4b5563` | `#52525b` | `#525252` | `#57534e` |
  | 700 | `#334155` | `#374151` | `#3f3f46` | `#404040` | `#44403c` |
  | 800 | `#1e293b` | `#1f2937` | `#27272a` | `#262626` | `#292524` |
  | 900 | `#0f172a` | `#111827` | `#18181b` | `#171717` | `#1c1917` |
  | 950 | `#020617` | `#030712` | `#09090b` | `#0a0a0a` | `#0c0a09` |

- **Tailwind's docs do not describe the character or intent of any individual neutral scale.** They say only that the default palette is hand-picked, and that grays are commonly used as a single set, which is why teams alias one — e.g. `gray: colors.slate` — [Tailwind v3 customizing colors](https://v3.tailwindcss.com/docs/customizing-colors)
- **Tremor's full light token set, de-referenced:** background DEFAULT = `white`, background-muted = gray-50 `#f9fafb`, background-subtle = gray-100 `#f3f4f6`, background-emphasis = gray-700 `#374151`; border = gray-200 `#e5e7eb`; ring = gray-200 `#e5e7eb`; content-subtle = gray-400 `#9ca3af`, content = gray-500 `#6b7280`, content-emphasis = gray-700 `#374151`, content-strong = gray-900 `#111827`, content-inverted = `white`; brand faint/muted/subtle/DEFAULT/emphasis = blue 50/200/400/500/700 — [Tremor installation / tailwind config](https://npm.tremor.so/docs/getting-started/installation) (hex values from the Tailwind v3 table above)
- **Catalyst uses zinc for the shell:** `"bg-white lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950"` on `html` — so the light page background behind a sidebar layout is zinc-100 `#f4f4f5` — [Catalyst sidebar-layout docs](https://catalyst.tailwindui.com/docs/sidebar-layout)
- **Tremor's Card uses `border-gray-200` with `bg-white`** — [Tremor Card docs](https://tremor.so/docs/ui/card); its DonutChart source likewise uses `border-gray-200`, `bg-white`, `text-gray-700` — [Tremor theming docs](https://tremor.so/docs/getting-started/theming)
- **shadcn's sidebar has its own colour namespace, separate from the page:** `--sidebar`, `--sidebar-foreground`, `--sidebar-primary` / `-foreground`, `--sidebar-accent` / `-foreground`, `--sidebar-border`, `--sidebar-ring` — i.e. the system treats the sidebar as a distinct surface rather than reusing card/background tokens — [shadcn/ui sidebar docs](https://ui.shadcn.com/docs/components/sidebar)
### Inferences

- **Measured luminance spread across the five scales is negligible**, so the choice between them has no contrast consequences. Computed from the hex values above (method and full tables in Q5): contrast vs white at step 500 spans 4.74–4.83, step 700 spans 10.27–10.44, step 900 spans 17.49–17.93. This is own arithmetic, not a citation.
- **A concrete, sourced light token set for a minimal admin** (taking Tremor's structure, since it is the only one of the three whose complete light token set is published, and keeping stock Tailwind 3.4 class names):

  | Role | Class | Hex |
  |---|---|---|
  | Page background | `bg-gray-50` | `#f9fafb` |
  | Card / sidebar surface | `bg-white` | `#ffffff` |
  | Subtle fill (hover, table header, active nav) | `bg-gray-100` | `#f3f4f6` |
  | Border / divider / ring | `border-gray-200` | `#e5e7eb` |
  | Primary text | `text-gray-900` | `#111827` |
  | Secondary text | `text-gray-700` | `#374151` |
  | Muted text (labels, captions) | `text-gray-500` | `#6b7280` |
  | Disabled / placeholder only | `text-gray-400` | `#9ca3af` |
  | Accent | `text-blue-600` / `bg-blue-600` | `#2563eb` |

  Tremor maps "muted" to gray-500 and "subtle" to gray-400; the fourth row is labelled disabled/placeholder deliberately because gray-400 fails body-text contrast (Q5).
- **Catalyst inverts the surface relationship** relative to Tremor: Catalyst puts a tinted `zinc-100` *behind* white panels at `lg`+ and plain white on mobile; Tremor's tokens imply white cards on a gray-50 page. Both are "restrained"; the Catalyst variant is specifically the inset/floating-panel look. If the shell uses a flush full-height sidebar, gray-50 page + white sidebar + gray-200 divider is the simpler read.
- **The "character" of each scale is hue bias, and the docs say nothing about it** — so any claim that slate is "cool/corporate" or neutral is "truly neutral" is folklore, not published guidance. What *is* checkable from the hex values: `neutral` is the only scale whose steps are pure grays (R=G=B at every step, e.g. `#737373`, `#404040`); `slate` carries the strongest blue bias (`#64748b` — 39 points of blue over red); `gray` carries a mild blue bias (`#6b7280`); `zinc` a very slight one (`#71717a`); `stone` is warm (`#78716c` — red above blue).
- **Practical recommendation the sources support:** pick `gray` if the aim is to match Tremor's published dashboard tokens exactly, `zinc` to match Catalyst, `neutral` if the design brief wants no hue cast at all. All three behave identically for contrast, so the choice is aesthetic and should be made once and aliased, as Tailwind's docs suggest.
- Tailwind v4 re-authored the palette in OKLCH, so these hex values are **v3 values**. Since the brief pins Tailwind 3.4, the table above is the right one — but the writer should not cross-reference it against `tailwindcss.com/docs/colors` (the v4 docs), which will show different values.

### Gaps

- **No source states *why* a given scale suits restrained interfaces.** Tailwind's docs explicitly do not characterise the scales. The hue analysis above is my own arithmetic on the published hex values, not published guidance.
- **shadcn's actual light hex values were not retrieved.** The sidebar docs name the CSS variables but the fetch did not return their light-mode values, so I cannot report shadcn's light `--sidebar` or `--border` as hex.
- Tremor's `background-emphasis` = gray-700 and `content-subtle` = gray-400 are reported without any stated intended use, so their roles are inferred from the names.

---

## Q5. Accessibility pitfalls specific to these patterns

### Takeaway

Measured against white, **no neutral step at 400 or below reaches even 3:1** — gray-400 is 2.54:1 — so gray-400 cannot carry body text *or* serve as the sole identifying boundary of a control. **Step 500 is the first that passes 4.5:1** (gray 4.83:1), but its margin shrinks to 4.63:1 on a gray-50 page. Separately, WCAG 1.4.11 does **not** require 3:1 on decorative borders, which is why `border-gray-200` table dividers at 1.24:1 are defensible while a focus ring at that contrast is not.

### Cited Findings

- **WCAG 2.1 SC 1.4.11 Non-text Contrast requires 3:1** against adjacent colours for "Visual information required to identify user interface components and states" and "Parts of graphics required to understand the content". It is a hard threshold — a computed 2.999:1 does not pass. Inactive components are excluded. Decorative or aesthetic graphics are exempt, as are cases where visible text conveys the same information — [W3C: Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)
- **Borders are not automatically in scope.** The W3C explicitly states the criterion "does not require that controls have a visual boundary indicating the hit area"; a control with visible text or a sufficiently contrasting icon needs no border. A boundary becomes necessary only when nothing else visually identifies the control — and then it must meet 3:1. **Focus indicators must meet 3:1 regardless** — [W3C: Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)
- A state indicator's contrast (e.g. a checkbox's check mark) is measured against *its* adjacent colours, not against the page — [W3C: Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)
- **`aria-current` is required alongside visual styling**, not optional decoration: MDN states that when an element is styled to show it is current, `aria-current` "should be used to inform the assistive technology user what has been indicated via styling", because assistive-technology users "may not be able to 'see' the visual difference". Allowed values are `page`, `step`, `location`, `date`, `time`, `true`, `false`; only one element in a set should be marked current; any other non-null string is treated as `true`; a missing/empty/valueless attribute or `false` is not exposed. Use `aria-selected` instead for `tab`, `option`, `row`, `gridcell` — [MDN: aria-current](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current)
- Headless UI's `Dialog` handles the drawer's a11y obligations: focus moves into the dialog on open, Tab is trapped inside it, outside elements are marked `inert`, Escape closes, and the `open` prop manages scroll locking — [Headless UI Dialog docs](https://headlessui.com/react/dialog)
- Third-party figures circulating for Tailwind grays are unreliable: one source puts gray-500 on white at 4.63:1, another puts gray-600 at "about 5.9:1" and gray-500 on gray-50 at 4.17:1 (described as failing AA) — [search-surfaced third-party contrast figures](https://okmiku.com/blog/wcag-color-contrast-explained). **My own computation contradicts all three of those figures** (see below).

### Inferences

#### Measured contrast ratios (computed in this session)

Computed with Node from the Tailwind v3 hex values in Q4, using the WCAG 2.1 relative-luminance definition (`c/255`, linearised as `c<=0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`, weighted `0.2126R + 0.7152G + 0.0722B`, ratio `(L_hi+0.05)/(L_lo+0.05)`). These are arithmetic, not a citation — but they are reproducible from the sourced hex table.

**Against `#ffffff`:**

| Step | slate | gray | zinc | neutral | stone | 4.5:1? | 3:1? |
|---|---|---|---|---|---|---|---|
| 50 | 1.05 | 1.05 | 1.04 | 1.04 | 1.04 | no | no |
| 100 | 1.10 | 1.10 | 1.10 | 1.09 | 1.09 | no | no |
| 200 | 1.23 | 1.24 | 1.27 | 1.26 | 1.26 | no | no |
| 300 | 1.48 | 1.47 | 1.48 | 1.48 | 1.49 | no | no |
| 400 | 2.56 | 2.54 | 2.56 | 2.52 | 2.52 | **no** | **no** |
| 500 | 4.76 | 4.83 | 4.83 | 4.74 | 4.80 | yes | yes |
| 600 | 7.58 | 7.56 | 7.73 | 7.81 | 7.63 | yes | yes |
| 700 | 10.35 | 10.31 | 10.44 | 10.37 | 10.27 | yes | yes |
| 800 | 14.63 | 14.68 | 14.89 | 15.13 | 15.17 | yes | yes |
| 900 | 17.85 | 17.74 | 17.72 | 17.93 | 17.49 | yes | yes |

**Against each scale's own `-50` tint (the realistic admin page background):**

| Step | slate | gray | zinc | neutral | stone |
|---|---|---|---|---|---|
| 400 | 2.45 | 2.43 | 2.46 | 2.42 | 2.41 |
| 500 | 4.55 | 4.63 | 4.63 | 4.54 | 4.59 |
| 600 | 7.24 | 7.23 | 7.41 | 7.49 | 7.30 |
| 700 | 9.90 | 9.86 | 10.01 | 9.93 | 9.84 |
| 900 | 17.06 | 16.98 | 16.97 | 17.18 | 16.74 |

#### Reading of the measurements

- **The single most consequential finding: there is no neutral step between 2.56:1 and 4.74:1.** The jump from 400 to 500 skips the entire 3:1–4.5:1 band. So "a gray that passes 3:1 for UI but is lighter than body text" does not exist in Tailwind's neutral scales — step 500 is simultaneously the lightest that passes 3:1 *and* the lightest that passes 4.5:1. Any UI element needing 3:1 must use 500 or darker.
- **gray-400 (`#9ca3af`) is the trap.** At 2.54:1 on white it fails body text, fails large text (3:1), and fails as a control boundary. It is legitimate only for genuinely decorative marks, disabled text (exempt from 1.4.3), and placeholder-adjacent uses. Tremor maps it to `content-subtle`, which invites misuse as a caption colour — that would fail.
- **Secondary/muted text should be 500 at minimum, and 600 if the surface is tinted.** gray-500 on gray-50 is 4.63:1 — a 0.13 margin. Any antialiasing, opacity modifier (`text-gray-500/80`), or a slightly darker card tint pushes it under. gray-600 (7.23:1 on gray-50) is the safe muted colour for an admin whose page background is not pure white.
- **All three third-party figures are wrong, not merely unverified**, and one of them is diagnosably wrong. gray-600 on white computes to 7.56:1, not the ~5.9:1 claimed. gray-500 on gray-50 computes to 4.63:1 and *passes*, not the 4.17:1 "fails AA" claimed. And the figure given as "gray-500 on white, 4.63:1" is wrong too — gray-500 on white is 4.83:1; **4.6262:1 is precisely gray-500 on gray-50**, so that source almost certainly measured against a gray-50 background and mislabelled it as white. The writer should use the computed tables above and not repeat any of the blog figures.
- **`border-gray-200` (1.24:1) is fine for table row dividers and card edges** under the W3C's own carve-out — the data is in the cells, the divider is decorative, and the table does not depend on the line to be understood. It is **not** fine as the only visible boundary of an input, as a checkbox outline, or as a focus ring. For a focus ring on white at 3:1+, the neutral options start at step 500; in practice use the accent (`focus-visible:ring-2 focus-visible:ring-blue-600` with `focus-visible:ring-offset-2`). blue-600 `#2563eb` computes to **5.17:1 on white and 4.95:1 on gray-50** — so it clears 1.4.11's 3:1 comfortably and also clears 4.5:1, meaning the same colour is safe for link text, not just for the ring.
- **Pattern-specific pitfalls beyond colour:**
  - Rendering the sidebar twice (desktop + mobile dialog) duplicates the nav landmark. Give each `<nav>` a distinct `aria-label`, or render only one at a time.
  - `whitespace-nowrap` on every table cell plus `overflow-x-auto` creates a horizontally scrollable region. A scroll container must be keyboard-reachable; a `div` with `overflow-x-auto` is not focusable by default in all browsers, so consider `tabindex="0"` plus an accessible name on the wrapper.
  - `hover:bg-gray-50` as the only row-hover affordance gives no keyboard equivalent — pair it with `focus-within:bg-gray-50`.
  - shadcn's `data-[state=selected]:bg-muted` conveys selection by background tint alone; selection state needs a non-colour cue or an ARIA state per 1.4.11's "states" clause.
  - The `h-10` header cell with `text-sm` leaves the header visually identical to body text apart from `font-medium`. That is a deliberate restraint choice but weight alone is a weak distinction at 14px; the sources show no uppercase/tracking treatment.

### Gaps

- **I did not retrieve SC 1.4.3's numeric requirement from a primary source.** The W3C 1.4.11 page notes that 1.4.11 "aims to match the minimum required for larger text" but gives no number for 1.4.3. The 4.5:1 / 3:1-for-large-text figures are used throughout these notes as the threshold; the writer should cite `w3.org/WAI/WCAG21/Understanding/contrast-minimum.html` directly if the report states them.
- **No official Tailwind contrast data exists** that I could find — Tailwind publishes hex values but no accessibility annotations on the palette.
- WCAG 2.2's SC 2.4.11 Focus Not Obscured and 2.4.13 Focus Appearance were not researched; a sticky header or a fixed sidebar can obscure a focused element, which is directly relevant to this shell.

---

## Q6. Published guidance on the sidebar active state: filled, tinted, bordered, or bold?

### Takeaway

The only implementation whose active-state classes I could actually read — shadcn/ui — uses **tinted fill plus a weight bump plus a text-colour change**, three cues at once, keyed off a `data-active` attribute: `data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground`. No *design* guidance document (as opposed to implementation) turned up in any source I read; the only normative requirement I found is accessibility-side, that whatever the visual treatment, it must be paired with `aria-current`.

### Cited Findings

- **shadcn/ui's active state is tint + weight + colour, not a border or bar:**
  - base `"peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm"`
  - active `"data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"`
  - sizes: default `"h-8 text-sm"`, sm `"h-7 text-xs"`, lg `"h-12 text-sm"`
  — [shadcn/ui sidebar.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx)
- **The active tint is a dedicated token, not a reused page colour:** `--sidebar-accent` / `--sidebar-accent-foreground` exist specifically for this — [shadcn/ui sidebar docs](https://ui.shadcn.com/docs/components/sidebar)
- **Group labels are deliberately de-emphasised** with an opacity-modified foreground rather than a separate colour: `SidebarGroupLabel` = `"flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70"` — [shadcn/ui sidebar.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/sidebar.tsx)
- **`aria-current="page"` is the semantic counterpart** and is required when an element is styled as current; only one element per set should carry it — [MDN: aria-current](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current)
- Marking the active link with `aria-current="page"` is described as a useful styling hook as well as a semantic one — [Inspo AI, sidebar navigation design](https://www.inspoai.io/blogs/sidebar-navigation-design)
- Tailwind UI's own documentation convention is to list per-state classes in a comment above the element — which is how its sidebar components express current-vs-default nav states — [Tailwind UI documentation](https://www.tailwindui.com/documentation)
- Flowbite-style sidebars use a lighter hover background (`hover:bg-gray-100`) rather than a tinted active fill — [Themesberg Flowbite sidebar tutorial](https://dev.to/themesberg/how-to-build-a-sidebar-component-with-tailwind-css-and-flowbite-m4i)

### Inferences

- **Three simultaneous cues is the pattern, and that is good practice rather than redundancy.** Tint alone fails anyone who cannot distinguish a ~1.1:1 background shift; weight alone is weak at 14px; colour alone is a colour-only distinction. shadcn stacking all three satisfies 1.4.11's "states" clause without needing a measured 3:1 on the tint itself.
- **Tailwind 3.4 translation** of shadcn's active state, in stock classes on a white sidebar:
  ```jsx
  <a
    href={item.href}
    aria-current={isActive ? 'page' : undefined}
    className={[
      'flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm',
      isActive
        ? 'bg-gray-100 font-medium text-gray-900'
        : 'font-normal text-gray-700 hover:bg-gray-50 hover:text-gray-900',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
    ].join(' ')}
  >
  ```
  Or drive it entirely off the attribute instead of a ternary, which keeps the markup identical in both sidebar instances: `aria-current:bg-gray-100` is not a 3.4 variant, but `aria-[current=page]:bg-gray-100 aria-[current=page]:font-medium aria-[current=page]:text-gray-900` is (`aria-[…]` arbitrary ARIA variants exist in 3.4).
- **`size-8!` and the parenthesised-variable forms in shadcn's source are v4 only.** `size-8!` (trailing-bang important) is v4; 3.4 writes `!size-8`. `size-*` itself shipped in 3.4 and is fine. `group-data-[collapsible=icon]:…` is valid 3.4.
- **A left accent bar** (`border-l-2 border-blue-600` or an absolutely positioned `before:` element) is the fourth common treatment and appears in none of the sources I read. If the design wants it, it is an addition on top of the tint, not a replacement — a 2px bar is easy to miss and should not be the sole cue.
- The `font-medium` bump on the active item causes a sub-pixel width shift. With a fixed sidebar width and `overflow-hidden` on the button this is harmless; it would cause layout jitter in an auto-width nav.

### Gaps

- **No design-guidance document on sidebar active states was found in any source I read.** The question "is filled, tinted, bordered or bold the published recommendation?" has no published answer from Tailwind, shadcn or Tremor — only shadcn's implementation choice, which is tinted + bold + recoloured.
- **Catalyst's active state is undocumented on its public pages.** The `sidebar-layout` docs show no active-state prop and no styling for it; `SidebarDivider` is not mentioned either. The Catalyst announcement post contains no class strings at all.
- **The widely-circulated Tailwind UI sidebar nav strings could not be verified.** A targeted search for `"hover:bg-gray-50"` + `"text-indigo-600"` in a Tailwind UI sidebar context returned only third-party examples, none of them Tailwind's own markup. So the commonly repeated `bg-gray-50 text-indigo-600` current-item treatment (and the `group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6` base) is **unverified** and should not be attributed to Tailwind UI in the report.
- Tremor publishes no sidebar or navigation component, so it contributes nothing to this question.

---

## Cross-cutting: Tailwind 3.4 vs Tailwind 4 syntax ledger

### Takeaway

Several class strings quoted above are Tailwind v4 syntax because shadcn's current registry is v4. All of them have direct 3.4 equivalents except container queries, which were a separate plugin before v4.

### Cited Findings

- **Confirmed present in Tailwind 3.4:** dynamic viewport units `h-svh` / `h-lvh` / `h-dvh` (plus `min-h-*` / `max-h-*`, and arbitrary values like `min-h-[75dvh]`); the `:has()` variant (`has-[:checked]:bg-indigo-50`, `has-[:disabled]:opacity-50`); the `*` direct-children variant (`*:rounded-full *:border *:px-2 *:py-0.5`, and `data-[slot=description]:*:mt-4`, composable as `hover:*:underline`); `size-*` utilities (`size-10` replacing `h-10 w-10`); `text-balance` and `text-pretty`; `grid-cols-subgrid` (`col-span-3 grid grid-cols-subgrid gap-4`); the `forced-colors` variant — [Tailwind CSS v3.4 release notes](https://tailwindcss.com/blog/tailwindcss-v3-4)
- **Tailwind 3.4's complete box-shadow scale** is `shadow-sm` `0 1px 2px 0 rgb(0 0 0 / 0.05)`, `shadow` `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` `0 25px 50px -12px rgb(0 0 0 / 0.25)`, `shadow-inner`, `shadow-none`. **There is no `shadow-xs` or `shadow-2xs` in v3** — the smallest outer shadow is `shadow-sm` — [Tailwind v3 box-shadow docs](https://v3.tailwindcss.com/docs/box-shadow)

### Inferences

- **The whole ledger below was corroborated by compiling CSS against this repo's own installed Tailwind (3.4.19 at `node_modules/tailwindcss`) rather than from memory.** Confirmed to *generate* rules on 3.4: `h-svh`/`h-lvh`/`h-dvh`/`min-h-svh`/`min-h-[75dvh]`, `size-8`/`size-10`/`!size-8`, `w-[--sidebar-width]` → `width: var(--sidebar-width)`, `text-balance`/`text-pretty`, `grid-cols-subgrid`, `forced-colors:`, `has-[:checked]:`, `has-[[aria-expanded]]:`, `aria-[current=page]:`, `data-[closed]:`, `group-data-[collapsible=icon]:`, `bg-gradient-to-t`, the `*:` child variant and `hover:*:underline`. Confirmed to generate **nothing** on 3.4 (i.e. genuinely v4-only): `shadow-xs`, `shadow-2xs`, `size-8!`, `w-(--sidebar-width)`, `has-aria-expanded:`, bare `aria-current:`, `data-closed:`, `bg-linear-to-t`, and every container-query form (`@container/card`, `@xl/main:`, `@5xl/main:`, `@[250px]/card:` produced zero rules and zero at-rules). The v3 box-shadow scale matched 3.4.19 byte for byte.

| v4 syntax seen in sources | Tailwind 3.4 equivalent |
|---|---|
| `w-(--sidebar-width)` | `w-[--sidebar-width]` |
| `shadow-xs` | `shadow-sm` (identical CSS value) |
| `shadow-sm` (v4) | `shadow` (v3) |
| `size-8!` | `!size-8` |
| `data-closed:opacity-0` | `data-[closed]:opacity-0` |
| `has-aria-expanded:bg-muted/50` | `has-[[aria-expanded]]:bg-muted/50` |
| `@container/card`, `@xl/main:`, `@[250px]/card:` | **no core equivalent** — use viewport breakpoints (`sm:`, `lg:`, `xl:`) or install `@tailwindcss/container-queries` |
| `text-foreground`, `bg-muted`, `bg-sidebar` | not stock Tailwind at all — shadcn theme tokens; substitute `text-gray-900`, `bg-gray-50`, `bg-white` |
| `bg-linear-to-t` (v4 gradient naming) | `bg-gradient-to-t` (the sources quoted still use the v3 spelling) |

- The shadow rename is the one that will silently do nothing rather than error: `shadow-xs` on 3.4 produces no shadow at all, and `shadow-sm` means different values in v3 and v4 (v3 `shadow-sm` = v4 `shadow-xs`; v3 `shadow` = v4 `shadow-sm`). Any card copied from a current shadcn or Tremor page needs this translated.
- Container queries are the only genuinely v4-gated capability among the patterns above, and only shadcn's dashboard block depends on them.

### Gaps

- I did not fetch the official v3→v4 upgrade guide, so the *direction* of each rename (what the v4 name for a v3 utility is) is assembled from the v3 docs plus the v4 strings I observed, not from a single authoritative rename list. What **is** directly verified is the v3 side: compiling against 3.4.19 proves which spellings work and which produce nothing. So "X does not exist in 3.4" is tested; "X is called Y in v4" is inferred from observed v4 source.
- **Container queries being absent from 3.4 core is now positively verified**, not inferred from the release notes' silence: `@container/card`, `@xl/main:`, `@5xl/main:` and `@[250px]/card:` all compile to zero rules and zero at-rules against 3.4.19. What remains uncited is whether `@tailwindcss/container-queries` was the *official* 3.x route — I did not fetch a page saying so.
- **The class strings quoted throughout these notes were not re-fetched a second time to confirm they still appear verbatim on the live pages.** Each is attributed to the specific page I read, but 24 of the 26 cited URLs resolve only via redirects or have since reorganised (notably `ui.shadcn.com/docs/components/sidebar` → `/docs/components/base/sidebar` and MDN's `ARIA/Attributes` → `ARIA/Reference/Attributes`). If the report quotes a class string as authoritative, it is worth one confirming fetch.
