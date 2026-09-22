import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import logoMark from "../assets/landing/hero/logo-mark.svg";
import logoWordmark from "../assets/landing/hero/logo-wordmark.svg";
import { loadSettings } from "../data/settings";
import { useAuth } from "../data/AuthContext.jsx";

const LINKS = [
  { label: "Discover", to: "/discover" },
  { label: "Creators’ Hub", to: "/creators-hub" },
  { label: "Marketplace", to: "/marketplace" },
  { label: "Community", to: "/community" },
];

export default function DashboardNav({ active = "Discover" }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const settings = loadSettings();
  const name = user?.firstName || user?.username || settings.firstName || settings.username || "A";
  const initial = name.replace("@", "").charAt(0).toUpperCase();
  const avatar = user?.avatarUrl || settings.avatar;

  // Close the menu after navigating, and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="relative z-30 bg-black">
      <div className="flex h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-12">
        <Link to="/discover" className="flex shrink-0 items-center gap-2.5" aria-label="VantaOrigin home">
          <img src={logoMark} alt="" className="h-[35px] w-[33.892px]" />
          <img src={logoWordmark} alt="" className="hidden h-[20.7px] w-[131.216px] sm:block" />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-[50px] font-ui text-base">
            {LINKS.map(({ label, to }) => (
              <li key={label}>
                <NavLink
                  to={to}
                  className={label === active ? "font-medium text-primary" : "text-white hover:opacity-80"}
                  aria-current={label === active ? "page" : undefined}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            to="/settings"
            aria-label="Your profile and settings"
            className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-secondary to-primary ring-2 ring-white"
          >
            {avatar ? (
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              <span className="font-ui text-base font-bold text-white">{initial}</span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="dashboard-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex size-11 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Phones and tablets: the same links, folded away until asked for */}
      {open && (
        <nav
          id="dashboard-menu"
          aria-label="Main"
          className="absolute inset-x-0 top-[76px] border-t border-white/10 bg-black px-4 pb-4 shadow-xl lg:hidden"
        >
          <ul className="flex flex-col font-ui text-lg">
            {LINKS.map(({ label, to }) => (
              <li key={label}>
                <NavLink
                  to={to}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-4 ${
                    label === active ? "font-bold text-primary" : "text-white hover:bg-white/5"
                  }`}
                  aria-current={label === active ? "page" : undefined}
                >
                  {label}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-4 text-white hover:bg-white/5"
              >
                Settings
              </Link>
            </li>
            {user && (
              <li>
                <button
                  type="button"
                  onClick={async () => {
                    setOpen(false);
                    await signOut();
                    navigate("/signin");
                  }}
                  className="block w-full rounded-lg px-3 py-4 text-left text-[#f2415f] hover:bg-white/5"
                >
                  Log out
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
