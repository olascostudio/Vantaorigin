import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SectionHeading from "./SectionHeading";
import { Skeleton } from "./Loading.jsx";
import { loadPublicCharacters } from "../data/character";
import arrowUpRight from "../assets/landing/worlds/arrow-up-right.svg";
import chevronLeft from "../assets/landing/worlds/chevron-left.svg";
import chevronRight from "../assets/landing/worlds/chevron-right.svg";

// The creator pages people can actually open.
//
// These were four invented creators with invented character counts, all
// leading to the same placeholder. Everything here is now read from the site
// itself: the creators are the ones who have published, the counts are what
// they have published, and the artwork is theirs. Nobody appears here who has
// not put something up, and nothing is claimed that cannot be clicked.
const CARD_STEP = 530; // card width + gap

// Borders only, cycled so the row keeps the colour of the design.
const COLORS = ["#fc590b", "#f5af32", "#6687cd", "#96307e"];

// One card per creator, newest work first.
//
// Takes what loadPublicCharacters gives: a flattened character, whose creator
// is a handle rather than an object, and whose artwork is `cover`.
export function byCreator(characters) {
  const pages = new Map();

  for (const character of characters) {
    const username = character.creator;
    if (!username) continue;

    if (!pages.has(username)) {
      pages.set(username, { username, characters: [], universes: new Map() });
    }
    const page = pages.get(username);
    page.characters.push(character);

    // "The Vantaverse" and "The vantaverse" are one universe typed twice.
    // Keyed by the lowercase form, kept in the spelling seen first.
    const universe = String(character.universe || "").trim();
    if (universe && !page.universes.has(universe.toLowerCase())) {
      page.universes.set(universe.toLowerCase(), universe);
    }
  }

  return [...pages.values()].map((page, index) => ({
    ...page,
    color: page.characters.find((c) => c.accent)?.accent || COLORS[index % COLORS.length],
    cover: page.characters.find((character) => character.cover)?.cover || null,
    // The page takes the colour of the work it is showing.
    accent: page.characters.find((character) => character.accent)?.accent || null,
    // What they write about, in their own words, rather than invented genres.
    tags: [...page.universes.values()].slice(0, 3).join(" • "),
  }));
}

function CreatorCard({ color, username, characters, cover, tags }) {
  const handle = username.replace(/^@/, "");
  const count = characters.length;

  return (
    <article
      className="flex w-[calc(100vw-48px)] max-w-[500px] shrink-0 snap-center flex-col items-center gap-[18px] overflow-hidden rounded-[25px] border-[1.667px] p-4 sm:w-[500px] sm:p-[25px]"
      style={{ borderColor: color, backgroundColor: `${color}0d` }}
      data-testid="creator-card"
    >
      <div className="relative h-[360px] w-full overflow-hidden rounded-xl bg-[#1a2030]">
        {cover && (
          <img
            src={cover}
            alt={`Artwork by ${username}`}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        )}
      </div>

      <div className="flex w-full max-w-[433.333px] flex-col items-end gap-[25px]">
        <div className="flex w-full flex-col gap-[16.667px]">
          <div className="flex w-full items-center justify-between gap-3">
            <h3 className="max-w-full font-ui text-[22px] font-black tracking-[-0.125px] text-white sm:text-[25px]">
              {username}
            </h3>
          </div>
          <p className="font-ui text-base font-bold text-white">
            {count} {count === 1 ? "character" : "characters"}
          </p>
          <p className="min-h-[46px] font-ui text-base text-neutral-300">{tags}</p>
        </div>

        <Link
          to={`/creator/${handle}`}
          className="flex items-center gap-[5px] font-ui text-base font-medium text-white underline"
        >
          View page
          <img src={arrowUpRight} alt="" className="size-5" loading="lazy" />
        </Link>
      </div>
    </article>
  );
}

function ArrowButton({ label, icon, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-[273px] flex items-center rounded-full bg-white/10 px-7 py-[17px] backdrop-blur-sm transition-colors hover:bg-white/20 ${className}`}
    >
      <img src={icon} alt="" className="h-[44.8px] w-[22.4px]" loading="lazy" />
    </button>
  );
}

export default function CommunityWorlds() {
  const trackRef = useRef(null);
  const [characters, setCharacters] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadPublicCharacters(48)
      .then((rows) => !cancelled && setCharacters(rows))
      .catch(() => !cancelled && setCharacters([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const pages = useMemo(() => byCreator(characters || []), [characters]);

  // Start centred, like the design (two cards in view, one peeking each side).
  useEffect(() => {
    const track = trackRef.current;
    if (track && pages.length > 2) {
      track.scrollLeft = (track.scrollWidth - track.clientWidth) / 2;
    }
  }, [pages.length]);

  const scroll = (direction) => {
    trackRef.current?.scrollBy?.({ left: direction * CARD_STEP, behavior: "smooth" });
  };

  // Nothing published yet, or the site could not be reached: say nothing
  // rather than show a row of empty promises.
  if (characters && pages.length === 0) return null;

  return (
    <section id="explore" className="flex flex-col items-center gap-[50px] overflow-hidden py-[61px]">
      <div className="px-4">
        <SectionHeading
          title="Explore creator pages"
          subtitle="Discover characters, creative work, and pages built by creators across VantaOrigin."
        />
      </div>

      <div className="relative w-full">
        <div
          ref={trackRef}
          className="scrollbar-none flex snap-x snap-mandatory justify-center gap-[30px] overflow-x-auto px-6"
        >
          {!characters &&
            [0, 1].map((index) => (
              <Skeleton key={index} className="h-[560px] w-[calc(100vw-48px)] max-w-[500px] shrink-0 rounded-[25px] sm:w-[500px]" />
            ))}

          {pages.map((page) => (
            <CreatorCard key={page.username} {...page} />
          ))}
        </div>

        {/* Only worth having when there is more than the screen can hold. */}
        {pages.length > 2 && (
          <>
            <ArrowButton
              label="Previous pages"
              icon={chevronLeft}
              onClick={() => scroll(-1)}
              className="left-3 lg:left-[42px]"
            />
            <ArrowButton
              label="Next pages"
              icon={chevronRight}
              onClick={() => scroll(1)}
              className="right-3 lg:right-[41.2px]"
            />
          </>
        )}
      </div>
    </section>
  );
}
