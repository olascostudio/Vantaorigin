import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import { loadPublicCharacters } from "../data/character";
import characterCover from "../assets/creator/character-cover.svg";
import heroArt from "../assets/auth/banner.webp";
import artOrange from "../assets/landing/worlds/world-1.webp";
import artObaalu from "../assets/landing/worlds/world-2-base.jpg";
import artObaaluOverlay from "../assets/landing/worlds/world-2-overlay.webp";
import artIyanu from "../assets/landing/hero/card-urukojin.webp";
import artUrukojin from "../assets/landing/worlds/world-4.webp";
import arrowUpRight from "../assets/landing/worlds/arrow-up-right.svg";
import chevronLeft from "../assets/landing/worlds/chevron-left.svg";
import chevronRight from "../assets/landing/worlds/chevron-right.svg";

const EXCERPT_LEAD = "From the heart of molten mountains, Obaalu rises — ";
const EXCERPT_BODY =
  "the forge-born sovereign of flame and will. His dominion burns with purpose, shaping worlds and warriors alike in the heat of creation...";

const SAMPLE_EXCERPT = { lead: EXCERPT_LEAD, body: EXCERPT_BODY };

// Sample cards shown alongside creators' own public characters.
const SAMPLES = [
  { id: "ember", title: "Obaalu’s Dominion: The Iron Inferno", author: "Arinola", colour: "#fc590b", art: artOrange },
  { id: "obaalu", title: "Obaalu’s Dominion: The Iron Inferno", author: "Arinola", colour: "#f5af32", art: artObaalu, overlay: artObaaluOverlay },
  { id: "iyanu", title: "Iyanu-Etere: The Song Beneath the Waves", author: "Arinola", colour: "#6687cd", art: artIyanu },
  { id: "urukojin", title: "Obaalu’s Dominion: The Iron Inferno", author: "Arinola", colour: "#96307e", art: artUrukojin },
  { id: "switch-1", title: "Switch Face Part 1", author: "Arinola", colour: "#fc590b", art: artIyanu },
  { id: "switch-2", title: "Switch Face Part 2", author: "Arinola", colour: "#96307e", art: artObaalu, overlay: artObaaluOverlay },
];

// Published characters, shaped for the cards below.
async function publicCharacters() {
  const characters = await loadPublicCharacters(24).catch(() => []);
  return characters.map((character) => ({
      id: character.id,
      title: character.realm ? `${character.alias} — ${character.realm}` : character.alias,
      author: character.creator,
      colour: "#f5af32",
      art: character.cover || characterCover,
      excerpt: {
        lead: character.tagline ? `${character.tagline} — ` : "",
        body: character.backstory,
      },
      to: `/character?id=${character.id}`,
      searchText: [character.alias, character.realm, character.tagline, character.creator]
        .filter(Boolean)
        .join(" "),
  }));
}

const SUGGESTIONS = ["Asomyyy", "voidsmith", "Emberfyre — Pyrokinetic", "Asomy — Ploserin"];

function CharacterCard({ title, author, colour, art, overlay, excerpt = SAMPLE_EXCERPT, to = "/character" }) {
  return (
    <article
      className="flex w-[360px] shrink-0 flex-col gap-[18px] overflow-hidden rounded-[25px] border-[1.667px] bg-black/40 p-4 sm:w-[500px] sm:p-[25px]"
      style={{ borderColor: colour }}
      data-testid="character-card"
    >
      <div className="relative h-[280px] w-full overflow-hidden rounded-xl bg-[#888787] sm:h-[360px]">
        <img src={art} alt="" className="size-full object-cover" loading="lazy" />
        {overlay && (
          <img src={overlay} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        )}
      </div>

      <div className="flex w-full flex-col gap-[16.667px]">
        <div className="flex w-full items-start justify-between gap-3">
          <h3 className="w-[300px] max-w-full font-ui text-[22px] font-black tracking-[-0.125px] text-white sm:text-[25px]">
            {title}
          </h3>
          <p className="whitespace-nowrap font-ui text-lg font-medium text-accent">By: {author}</p>
        </div>
        <p className="line-clamp-3 min-h-[76px] font-ui text-base text-neutral-300">
          <span className="font-bold">{excerpt.lead}</span>
          {excerpt.body}
        </p>
      </div>

      <Link to={to} className="flex items-center gap-[5px] self-end font-ui text-base font-medium text-white underline">
        Read More
        <img src={arrowUpRight} alt="" className="size-5" />
      </Link>
    </article>
  );
}

// Continuously scrolling row; the list is duplicated so the loop is seamless.
// It scrolls the rail itself, so the arrows, a swipe and the wheel all work.
function CharacterMarquee({ characters }) {
  const rail = useRef(null);
  const paused = useRef(false);
  // Where an arrow press is taking the row; null while it just drifts.
  const target = useRef(null);

  useEffect(() => {
    const el = rail.current;
    if (!el) return undefined;
    // Respect reduced motion: no drifting, but the arrows still work.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let frame;
    let last = performance.now();
    const tick = (now) => {
      const elapsed = now - last;
      last = now;
      const half = el.scrollWidth / 2;
      if (target.current !== null) {
        // ease towards the card an arrow asked for
        const remaining = target.current - el.scrollLeft;
        if (Math.abs(remaining) < 2) {
          el.scrollLeft = target.current;
          target.current = null;
        } else {
          el.scrollLeft += remaining * 0.18;
        }
      } else if (!reduceMotion && !paused.current && half > 0) {
        el.scrollLeft += elapsed * 0.05; // ~50px a second
        if (el.scrollLeft >= half) el.scrollLeft -= half; // loop seamlessly
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [characters]);

  // Arrows move the row one card at a time.
  const step = (direction) => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    target.current = Math.max(0, Math.min(max, el.scrollLeft + direction * 530));
  };

  return (
    <div className="relative">
      <div
        ref={rail}
        className="scrollbar-none flex snap-x gap-[30px] overflow-x-auto px-6 py-2"
        onMouseEnter={() => {
          paused.current = true;
        }}
        onMouseLeave={() => {
          paused.current = false;
        }}
        onPointerDown={() => {
          paused.current = true;
        }}
        onPointerUp={() => {
          paused.current = false;
        }}
        data-testid="marquee"
      >
        <div className="flex w-max gap-[30px]">
          {[...characters, ...characters].map((character, i) => (
            <CharacterCard key={`${character.id}-${i}`} {...character} />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous characters"
        className="absolute left-4 top-1/2 flex size-[70px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur transition-colors hover:bg-white/20 lg:left-10"
      >
        <img src={chevronLeft} alt="" className="h-8 w-4" />
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        aria-label="Next characters"
        className="absolute right-4 top-1/2 flex size-[70px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur transition-colors hover:bg-white/20 lg:right-10"
      >
        <img src={chevronRight} alt="" className="h-8 w-4" />
      </button>
    </div>
  );
}

export default function Discover() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [showHints, setShowHints] = useState(false);
  const inputRef = useRef(null);
  // Published characters lead, then the samples.
  const [characters, setCharacters] = useState(SAMPLES);

  useEffect(() => {
    let cancelled = false;
    publicCharacters().then((published) => {
      if (!cancelled) setCharacters([...published, ...SAMPLES]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    const term = submitted.trim().toLowerCase();
    if (!term) return null;
    return characters.filter((c) =>
      [c.title, c.author, c.searchText].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [submitted, characters]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="relative overflow-hidden">
        <img src={heroArt} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-background/55" />

        <div className="relative px-6 pb-20 pt-[100px]">
          <h1 className="mx-auto max-w-[1000px] text-center font-ui text-[40px] font-bold leading-[1.15] text-white sm:text-[56px] lg:text-[64px]">
            Every World <span className="text-secondary">Begins With</span> A Character.
          </h1>
          <p className="mx-auto mt-8 max-w-[1080px] text-center font-ui text-lg text-neutral-300 sm:text-xl">
            Browse creations forged by artists, dreamers, and storytellers across their universe. Step
            into the battleground - every legend starts with a single soul.
          </p>

          <form
            className="relative mx-auto mt-12 w-full max-w-[762px]"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(query);
              setShowHints(false);
            }}
          >
            <div className="flex h-[86px] items-center gap-4 rounded-full border border-white/25 bg-black/30 pl-8 pr-4 backdrop-blur">
              <svg viewBox="0 0 24 24" className="size-7 shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShowHints(event.target.value.length > 0);
                  if (!event.target.value) setSubmitted("");
                }}
                type="search"
                aria-label="Search characters"
                placeholder="Search names, abilities, creators..."
                className="min-w-0 flex-1 bg-transparent font-ui text-xl text-white outline-none placeholder:text-neutral-400 [&::-webkit-search-cancel-button]:hidden"
              />
              <button
                type="button"
                onClick={() => setShowHints((v) => !v)}
                aria-expanded={showHints}
                className="h-[54px] shrink-0 rounded-full bg-primary px-8 font-ui text-xl font-medium text-white transition-opacity hover:opacity-90"
              >
                Hint
              </button>
            </div>

            {showHints && (
              <ul className="absolute inset-x-0 top-[100px] z-20 overflow-hidden rounded-[10px] border border-white/10 bg-[#141a2e]/95 py-4 backdrop-blur">
                {SUGGESTIONS.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(suggestion);
                        setSubmitted(suggestion);
                        setShowHints(false);
                      }}
                      className="block w-full px-14 py-3 text-left font-ui text-xl text-neutral-300 hover:bg-white/5 hover:text-white"
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
        </div>

        <div className="relative pb-20">
          {results ? (
            <div className="flex flex-wrap justify-center gap-[30px] px-6" data-testid="results">
              {results.length > 0 ? (
                results.map((character) => <CharacterCard key={character.id} {...character} />)
              ) : (
                <p className="font-ui text-lg text-neutral-300">
                  No characters match “{submitted}”.
                </p>
              )}
            </div>
          ) : (
            <CharacterMarquee characters={characters} />
          )}
        </div>
      </div>
    </div>
  );
}
