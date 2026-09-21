import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Footer from "../components/Footer";
import { CATEGORIES, SELECTABLE, countFor, extraCategoriesFor, lastSyncedAt } from "../data/marketplace";
import PortfolioGrid from "../components/marketplace/PortfolioGrid";
import heroArt from "../assets/auth/banner.webp";
import stripePink from "../assets/marketplace/stripe-pink.svg";
import bandBlue1 from "../assets/marketplace/band-blue-1.svg";
import bandBlue2 from "../assets/marketplace/band-blue-2.svg";
import bandBlue3 from "../assets/marketplace/band-blue-3.svg";
import bandGold from "../assets/marketplace/band-gold.svg";
import streakGold from "../assets/marketplace/streak-gold.svg";
import boltLeft from "../assets/marketplace/bolt-left.svg";
import boltRight from "../assets/marketplace/bolt-right.svg";

function Hero() {
  return (
    <section className="relative h-[430px] overflow-hidden sm:h-[520px]">
      <img src={heroArt} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-[#1b2233]/25" />

      <div className="relative flex flex-col items-center px-6 pt-16 text-center sm:pt-24">
        <h1 className="font-ui text-[32px] font-bold text-white sm:text-[44px]">
          VantaOrigin Studio Marketplace
        </h1>
        <p className="mt-4 font-ui text-lg text-white sm:text-[26px]">
          Bring Your Creative Ideas to Life With Vetted Talent
        </p>
      </div>

      {/* Diagonal ribbon across the bottom of the hero */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[220px]">
        <img src={bandBlue1} alt="" className="absolute -left-10 bottom-[52px] w-[1218px] max-w-none opacity-90" />
        <img src={bandBlue2} alt="" className="absolute -left-24 bottom-0 w-[1213px] max-w-none opacity-80" />
        <img src={stripePink} alt="" className="absolute inset-x-0 bottom-[86px] w-full" />
        <img src={bandBlue3} alt="" className="absolute -right-32 bottom-[110px] w-[1213px] max-w-none opacity-70" />
        <img src={bandGold} alt="" className="absolute bottom-[46px] right-0 w-[266px] max-w-none" />
        <img src={streakGold} alt="" className="absolute bottom-[130px] right-10 w-[348px] max-w-none" />
      </div>
    </section>
  );
}

function Lockup() {
  return (
    <div className="flex flex-col items-center bg-[#1b2233] pb-10 pt-8">
      <p className="font-ui text-base text-neutral-300">VantaVerse</p>
      <div className="mt-1 flex items-center gap-4">
        <img src={boltLeft} alt="" aria-hidden="true" className="h-7 w-[119px]" />
        <h2 className="font-ui text-[34px] font-bold text-white">Marketplace</h2>
        <img src={boltRight} alt="" aria-hidden="true" className="h-6 w-[143px]" />
      </div>
    </div>
  );
}

function Sidebar({ activeId, onSelect }) {
  return (
    <nav aria-label="Marketplace categories" className="w-full shrink-0 lg:w-[280px]">
      <p className="px-4 font-ui text-base font-bold text-[#a855f7]">VantaOrigin</p>

      <ul className="mt-6 flex flex-col gap-1">
        {CATEGORIES.map((category) => {
          if (category.children) {
            return (
              <li key={category.id}>
                <p className="px-4 py-3 font-ui text-base font-bold text-white">{category.label}</p>
                <ul className="flex flex-col gap-1">
                  {category.children.map((child) => (
                    <li key={child.id}>
                      <CategoryButton
                        category={child}
                        active={child.id === activeId}
                        onSelect={onSelect}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            );
          }
          return (
            <li key={category.id}>
              <CategoryButton category={category} active={category.id === activeId} onSelect={onSelect} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CategoryButton({ category, active, onSelect }) {
  const count = countFor(category.label);
  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left font-ui text-base transition-colors ${
        active
          ? "bg-gradient-to-r from-[#c2185b] to-[#a855f7] font-bold text-white"
          : "text-neutral-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      {category.label}
      <span className={`font-ui text-sm ${active ? "text-white/80" : "text-neutral-500"}`}>
        {count}
      </span>
    </button>
  );
}

export default function Marketplace() {
  const [activeId, setActiveId] = useState("2d-art-design");
  const [filter, setFilter] = useState(0);
  const [query, setQuery] = useState("");

  const base = SELECTABLE.find((item) => item.id === activeId) ?? SELECTABLE[0];

  // Chips follow the synced data: anything the sync produced that isn't in the
  // taxonomy is appended, and empty ones drop to the end.
  const category = useMemo(() => {
    const chips = [...base.filters, ...extraCategoriesFor(base.label)].sort(
      (a, b) => countFor(base.label, b) - countFor(base.label, a)
    );
    return { ...base, filters: chips };
  }, [base]);

  const selectCategory = (id) => {
    setActiveId(id);
    setFilter(0);
  };

  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav active="Marketplace" />
      <Hero />
      <Lockup />

      <div className="flex flex-col gap-8 px-4 pb-16 lg:flex-row lg:gap-0 lg:px-0">
        <div className="lg:pl-8 xl:pl-12">
          <Sidebar activeId={activeId} onSelect={selectCategory} />
        </div>

        <section className="min-h-[620px] flex-1 rounded-2xl bg-[#222c40] lg:rounded-none">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:gap-8">
            <h3 className="font-ui text-lg font-bold text-white lg:w-[200px]">{category.label}</h3>

            <label className="sr-only" htmlFor="marketplace-search">
              Search the marketplace
            </label>
            <input
              id="marketplace-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-11 flex-1 rounded-lg bg-[#3d475e] px-4 text-center font-ui text-base text-white outline-none placeholder:text-white focus:ring-2 focus:ring-[#6b8ff5]"
            />

            <div className="flex items-center gap-4">
              <Link
                to="/marketplace/project-request"
                className="rounded-lg bg-primary px-6 py-2.5 font-ui text-base font-bold text-white underline hover:opacity-90"
              >
                Project Request
              </Link>
              <Link
                to="/marketplace/how-it-works"
                className="rounded-lg bg-white px-6 py-2.5 font-ui text-base font-bold text-black hover:opacity-90"
              >
                How it Works
              </Link>
            </div>
          </div>

          <div className="scrollbar-none flex gap-4 overflow-x-auto p-5">
            {category.filters.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setFilter(index)}
                aria-pressed={index === filter}
                className={`shrink-0 rounded-full px-6 py-3 font-ui text-base transition-colors ${
                  index === filter
                    ? "bg-gradient-to-r from-[#7b3fe4] to-[#c2185b] font-bold text-white"
                    : "bg-[#2b3547] text-white hover:bg-[#333f56]"
                }`}
              >
                {label}{" "}
                <span className={index === filter ? "text-white/80" : "text-neutral-400"}>
                  {countFor(category.label, label)}
                </span>
              </button>
            ))}
          </div>

          <PortfolioGrid
            section={category.label}
            filter={category.filters[filter]}
            query={query}
          />
        </section>
      </div>

      <Footer />
    </div>
  );
}
