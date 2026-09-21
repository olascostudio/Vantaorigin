import { Link } from "react-router-dom";
import logoMark from "../assets/landing/hero/logo-mark.svg";
import logoWordmark from "../assets/landing/hero/logo-wordmark.svg";

const NAV_LINKS = [
  { label: "Explore", href: "#explore" },
  { label: "Characters", href: "#characters" },
  { label: "Marketplace", to: "/marketplace" },
  { label: "My Realm", to: "/creators-hub" },
];

export default function Navbar() {
  return (
    <nav
      className="mx-auto w-full max-w-[1368px] rounded-[10px] border border-white/10 bg-surface/20 px-4 py-[15px] backdrop-blur-[4px] sm:px-[34px]"
      data-testid="navbar"
    >
      <div className="flex items-center justify-between gap-6">
        <a href="/" className="flex shrink-0 items-center gap-2.5" aria-label="VantaOrigin home">
          <img src={logoMark} alt="" className="h-[35px] w-[33.892px]" />
          <img
            src={logoWordmark}
            alt=""
            className="hidden h-[20.7px] w-[131.216px] sm:block"
          />
        </a>

        <ul className="hidden items-center gap-[30px] font-ui text-sm text-white lg:flex">
          {NAV_LINKS.map(({ label, href, to }) => (
            <li key={label}>
              {to ? (
                <Link to={to} className="whitespace-nowrap transition-opacity hover:opacity-80">
                  {label}
                </Link>
              ) : (
                <a href={href} className="whitespace-nowrap transition-opacity hover:opacity-80">
                  {label}
                </a>
              )}
            </li>
          ))}
        </ul>

        <Link
          to="/auth"
          className="mb-[5px] ml-[5px] shrink-0 bg-primary px-6 py-4 font-ui text-sm font-semibold text-white shadow-block transition-transform hover:-translate-y-0.5"
        >
          Create Your Realm
        </Link>
      </div>
    </nav>
  );
}
