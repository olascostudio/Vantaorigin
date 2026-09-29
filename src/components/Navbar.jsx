import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logoMark from "../assets/landing/hero/logo-mark.svg";
import logoWordmark from "../assets/landing/hero/logo-wordmark.svg";

// Where the landing page can take you. Exploring characters goes to the
// discovery page itself rather than scrolling to a section about it: somebody
// who wants to see characters wants the characters.
const NAV_LINKS = [
  { label: "Explore characters", to: "/discover" },
  { label: "Marketplace", to: "/marketplace" },
  { label: "Community", to: "/community" },
  { label: "My characters", to: "/creators-hub" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav
      className="relative mx-auto w-full max-w-[1368px] rounded-[10px] border border-white/10 bg-surface/20 px-4 py-[15px] backdrop-blur-[4px] sm:px-[34px]"
      data-testid="navbar"
    >
      <div className="flex items-center justify-between gap-3 sm:gap-6">
        <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="VantaOrigin home">
          <img src={logoMark} alt="" className="h-[30px] w-auto sm:h-[35px]" />
          <img src={logoWordmark} alt="" className="hidden h-[20.7px] w-[131.216px] sm:block" />
        </a>

        <ul className="hidden items-center gap-[30px] font-ui text-sm text-white lg:flex">
          {NAV_LINKS.map(({ label, to }) => (
            <li key={label}>
              <Link to={to} className="whitespace-nowrap transition-opacity hover:opacity-80">
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-2">
          {/* Smaller where the bar is narrow: at full size it crowded out
              everything else on a phone. */}
          <Link
            to="/auth"
            className="bg-primary px-3.5 py-2.5 font-ui text-xs font-semibold text-white shadow-block transition-transform hover:-translate-y-0.5 sm:mb-[5px] sm:ml-[5px] sm:px-6 sm:py-4 sm:text-sm"
          >
            Create your page
          </Link>

          {/* The links were simply absent below this width, with no way to
              reach them. */}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex size-10 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <ul
          id="landing-menu"
          className="mt-3 flex flex-col border-t border-white/10 pt-2 font-ui text-base text-white lg:hidden"
        >
          {NAV_LINKS.map(({ label, to }) => (
            <li key={label}>
              <Link
                to={to}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-2 py-3 hover:bg-white/5"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
