import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import CharacterCard from "../components/creator/CharacterCard";
import { loadCharacter } from "../data/character";
import heroBanner from "../assets/creator/hero-banner.webp";
import flameBright from "../assets/creator/flame-bright.svg";
import flameSoft from "../assets/creator/flame-soft.svg";

function Panel({ title, entry, flame, highlight, children }) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl p-5 ${
        highlight
          ? "bg-gradient-to-b from-[#2a3348] via-[#7a2352] to-[#c2185b] ring-2 ring-[#6b8ff5]"
          : "bg-[#222b3c]"
      }`}
    >
      {flame && (
        <img
          src={flame}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 right-4 w-[180px] opacity-90"
        />
      )}
      <h2 className="relative font-ui text-lg font-bold text-[#6b8ff5]">{title}</h2>
      <p className="relative mt-5 font-ui text-base font-bold text-white">{entry.name}</p>
      <p className="relative mt-3 font-ui text-sm leading-relaxed text-neutral-200">
        {entry.description}
      </p>
      {children}
    </section>
  );
}

function AssetRail({ assets }) {
  const rail = useRef(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = rail.current;
    if (el) setCanScroll(el.scrollWidth > el.clientWidth + 8);
  }, [assets]);

  if (!assets.length) {
    return (
      <div className="flex h-[160px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#222b3c] font-ui text-base text-neutral-400">
        No assets yet
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={rail} className="scrollbar-none flex snap-x gap-5 overflow-x-auto pb-2">
        {assets.map((asset, index) => (
          <div
            key={`${asset}-${index}`}
            className="h-[260px] w-[270px] shrink-0 snap-start overflow-hidden rounded-2xl bg-[#222b3c] sm:h-[400px] sm:w-[320px]"
          >
            <img src={asset} alt={`Asset ${index + 1}`} className="size-full object-cover" />
          </div>
        ))}
      </div>

      {canScroll && (
        <button
          type="button"
          aria-label="Next assets"
          onClick={() => rail.current?.scrollBy?.({ left: 340, behavior: "smooth" })}
          className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#2b3547]/90 text-white ring-1 ring-white/20 backdrop-blur hover:bg-[#2b3547]"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function CharacterView({ owner = false }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get("id");
  const [character, setCharacter] = useState(() => loadCharacter(id));

  // Pick up edits made on the editable profile page.
  useEffect(() => {
    const refresh = () => setCharacter(loadCharacter(id));
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [id]);

  const assets = character.assets || [];

  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav active="Creators’ Hub" />

      <div className="px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
        <div className="mx-auto w-full max-w-[420px] rounded-[28px] border-2 border-[#eec340]/60 bg-[#1e2637] p-3 shadow-[0_0_40px_rgba(238,195,64,0.12)] sm:max-w-none sm:rounded-2xl sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              to={owner ? "/creators-hub" : "/discover"}
              className="flex items-center gap-3 font-ui text-xl text-white hover:opacity-80"
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </Link>

            <div className="flex items-center gap-4">
              {owner && (
                <button
                  type="button"
                  onClick={() => navigate(`/creators-hub/character/profile?id=${character.id}`)}
                  className="flex items-center gap-2 rounded-full bg-[#3ecf6a] px-6 py-2.5 font-ui text-base font-bold text-white hover:opacity-90"
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Edit
                </button>
              )}
              <button
                type="button"
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7b3fe4] to-[#a855f7] px-6 py-2.5 font-ui text-base font-bold text-white hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M12 16V3M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Share
              </button>
            </div>
          </div>

          {/* Hero */}
          <section className="relative mt-5 overflow-hidden rounded-2xl bg-[#222b3c]">
            <img
              src={character.banner || heroBanner}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 hidden h-full w-[62%] object-cover lg:block"
            />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-[#222b3c] via-[#222b3c]/95 to-[#222b3c]/10 lg:block" />

            <div className="relative flex flex-col gap-6 p-4 lg:flex-row lg:p-6">
              <CharacterCard
                alias={character.alias}
                power={character.power}
                cover={character.cover}
                showViewMore={owner}
                onViewMore={() => navigate(`/creators-hub/character/profile?id=${character.id}`)}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 xl:flex-row xl:items-start xl:gap-6">
                  <h1 className="max-w-[520px] font-ui text-lg font-bold text-white">
                    {character.alias}
                    {character.realm && <> — {character.realm}</>}
                  </h1>
                  {character.tagline && (
                    <p className="font-ui text-lg font-bold text-white">
                      Tagline — {character.tagline}
                    </p>
                  )}
                </div>

                <p className="mt-3 flex items-center gap-2 font-ui text-lg font-bold text-[#4ea1ff]">
                  Origin Story {owner && <span aria-hidden="true">🥇🎖️🛡️</span>}
                </p>

                <p className="mt-3 whitespace-pre-line font-ui text-sm leading-relaxed text-white">
                  {character.backstory}
                </p>
              </div>
            </div>
          </section>

          <section aria-label="Assets" className="mt-5">
            <AssetRail assets={assets} />
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr_1fr]">
            <Panel title="Core Ability" entry={character.core} highlight>
              <ul className="relative mt-6 flex flex-col gap-3">
                {character.core.extras
                  .filter((extra) => extra.name)
                  .map((extra, index) => (
                    <li key={index} className="flex items-center gap-3 font-ui text-base font-bold text-white">
                      <span aria-hidden="true" className="text-lg text-[#ff8fc7]">
                        ✦
                      </span>
                      {extra.name}
                    </li>
                  ))}
              </ul>
            </Panel>

            <Panel title="Signature Move" entry={character.signature} flame={flameBright} />
            <Panel title="Weakness" entry={character.weakness} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2.6fr]">
            <Panel title="Alignment" entry={character.alignment} flame={flameSoft} />

            <section className="overflow-hidden rounded-2xl bg-[#222b3c] p-5">
              <h2 className="font-ui text-lg font-bold text-[#6b8ff5]">Character Stats</h2>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-left">
                  <thead>
                    <tr className="font-ui text-sm font-bold text-[#5fdc8a]">
                      <th className="pb-3 pr-4">Attributes</th>
                      <th className="pb-3 pr-4">Level</th>
                      <th className="pb-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="font-ui text-sm font-bold text-white">
                    {character.stats.map((row) => (
                      <tr key={row.attribute} className="border-t border-white/10">
                        <td className="py-4 pr-4">{row.attribute}</td>
                        <td className="py-4 pr-4">{row.level}/10</td>
                        <td className="py-4">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
