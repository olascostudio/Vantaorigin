import { Link, NavLink } from "react-router-dom";
import logoMark from "../assets/landing/hero/logo-mark.svg";
import logoWordmark from "../assets/landing/hero/logo-wordmark.svg";

const LINKS = [
  { label: "Discover", to: "/discover" },
  { label: "Creators’ Hub", to: "/creators-hub" },
  { label: "Marketplace", to: "/marketplace" },
  { label: "Community", to: "/community" },
];

export default function DashboardNav({ active = "Discover" }) {
  return (
    <header className="relative z-30 flex h-[76px] items-center justify-between gap-6 bg-black px-6 lg:px-12">
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

      <Link
        to="/settings"
        aria-label="Your profile and settings"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary ring-2 ring-white"
      >
        {/* Placeholder until a real avatar image is wired up. */}
        <span className="font-ui text-base font-bold text-white">A</span>
      </Link>
    </header>
  );
}
