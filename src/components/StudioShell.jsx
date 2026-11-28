// The frame every Creator Studio screen sits in.
//
// Built from the mockup canvas rather than invented: a 272px white rail on
// warm paper, nav grouped Overview / Books / Selling / Money, Bricolage for
// display and Inter for everything else. The tokens are named in the
// Tailwind config so a screen never spells a hex out, which is how the
// first attempt at these screens drifted into a different palette.
//
// Studio is its own light world on a dark site, on purpose. A creator works
// in here for an hour at a time, and the marketing site's black is not a
// surface to work on.
import { Link, useLocation } from "react-router-dom";
import logoMark from "../assets/landing/hero/logo-mark.svg";

// The nav the mockup draws, in its order. `soon` marks a screen the design
// has and the build does not: shown, because leaving it out would hide how
// much of Studio is still to come, and not a link, because a nav item that
// goes nowhere is worse than one that says it goes nowhere yet.
const GROUPS = [
  {
    name: "Overview",
    items: [{ to: "/studio/dashboard", label: "Dashboard", icon: "grid" }],
  },
  {
    name: "Books",
    items: [
      { to: "/studio/books", label: "Your books", icon: "book" },
      { to: "/studio/books/new", label: "Add a book", icon: "plus", soon: true },
    ],
  },
  {
    name: "Selling",
    items: [
      { to: "/studio/pricing", label: "Regional pricing", icon: "coin" },
      { to: "/studio/embed", label: "Embed code", icon: "code", soon: true },
    ],
  },
  {
    name: "Money",
    items: [{ to: "/studio/orders", label: "Orders", icon: "bag" }],
  },
];

// Stroke icons at 18px, drawn rather than imported: an icon font for nine
// glyphs costs more than the glyphs.
function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  if (name === "grid")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    );
  if (name === "book")
    return (
      <svg {...common}>
        <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
        <path d="M8 3v18" />
      </svg>
    );
  if (name === "plus")
    return (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  if (name === "coin")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.5h4a1.8 1.8 0 0 1 0 3.6h-3a1.8 1.8 0 0 0 0 3.6h4" />
      </svg>
    );
  if (name === "code")
    return (
      <svg {...common}>
        <path d="M9 7 4 12l5 5" />
        <path d="m15 7 5 5-5 5" />
      </svg>
    );
  if (name === "bag")
    return (
      <svg {...common}>
        <path d="M4 7h16l-1.2 11a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8z" />
        <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
      </svg>
    );
  return null;
}

// Exported because the screens inside the shell need the same vocabulary,
// and a second spelling of a button is how two screens stop matching.
export const H1 = "font-studio text-[32px] font-bold tracking-[-0.02em] text-studio-ink";
export const LEAD = "mt-1.5 font-ui text-sm text-studio-muted";
export const CARD = "rounded-xl border border-studio-line bg-studio-card";
export const BTN =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-studio-brand px-[18px] font-ui text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
export const BTN_QUIET =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-studio-edge px-4 font-ui text-sm font-medium text-studio-body transition-colors hover:bg-studio-paper disabled:opacity-50";
export const FIELD =
  "w-full box-border min-h-[44px] rounded-[10px] border border-studio-edge bg-studio-card px-3.5 font-ui text-base text-studio-ink outline-none placeholder:text-studio-muted focus:border-studio-brand focus:outline focus:outline-2 focus:outline-studio-brand focus:outline-offset-[-1px]";
export const LABEL = "mb-1.5 block font-ui text-sm font-semibold text-studio-ink";

export default function StudioShell({ title, lead, action, children }) {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-wrap items-stretch bg-studio-paper font-ui text-studio-body">
      <aside className="box-border w-full shrink-0 border-studio-line bg-studio-card px-3.5 pb-7 pt-[22px] lg:w-[272px] lg:border-r">
        {/* The mockup drew a placeholder mark here. This is the real one:
            VantaOrigin's own, at its own colour, because a studio inside
            somebody's product should say whose product it is. */}
        <Link to="/studio/dashboard" className="flex items-center gap-2.5 px-2.5 pb-1">
          <img src={logoMark} alt="" className="h-[30px] w-auto" aria-hidden="true" />
          <span className="font-studio text-[17px] font-bold leading-tight tracking-[-0.01em] text-studio-ink">
            VantaOrigin
            <span className="block font-ui text-[11px] font-semibold uppercase tracking-[0.07em] text-studio-brand">
              Creator Studio
            </span>
          </span>
        </Link>

        <div className="lg:block">
          {GROUPS.map((group) => (
            <div key={group.name}>
              <p className="mb-1.5 mt-[22px] px-3 font-ui text-[11px] font-semibold uppercase tracking-[0.07em] text-studio-muted">
                {group.name}
              </p>
              <nav aria-label={group.name} className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const here = pathname === item.to;
                  if (item.soon) {
                    return (
                      <span
                        key={item.to}
                        className="flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 font-ui text-sm font-medium text-studio-muted"
                      >
                        <Icon name={item.icon} />
                        {item.label}
                        <span className="ml-auto rounded-full bg-studio-paper px-2 py-0.5 font-ui text-[11px] font-semibold text-studio-muted">
                          soon
                        </span>
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={here ? "page" : undefined}
                      className={`flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 font-ui text-sm font-medium transition-colors ${
                        here
                          ? "bg-studio-brand-soft text-studio-brand"
                          : "text-studio-body hover:bg-studio-paper hover:text-studio-ink"
                      }`}
                    >
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <Link
          to="/admin"
          className="mt-[34px] block rounded-xl border border-studio-line bg-studio-paper p-3.5 transition-colors hover:border-studio-edge"
        >
          <p className="font-ui text-[13px] font-semibold text-studio-ink">Back to the admin</p>
          <p className="mt-0.5 font-ui text-xs text-studio-muted">
            Studio is reachable from there only
          </p>
        </Link>
      </aside>

      <main className="box-border min-w-0 flex-[999_1_560px] px-5 pb-12 pt-[34px] sm:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className={H1}>{title}</h1>
            {lead && <p className={LEAD}>{lead}</p>}
          </div>
          {action}
        </header>
        {children}
      </main>
    </div>
  );
}
