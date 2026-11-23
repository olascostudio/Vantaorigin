import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import { loadPublicCharacters } from "../data/character";
import { loadPublicCreators } from "../data/creators";
import { Art, Skeleton } from "../components/Loading.jsx";
import characterCover from "../assets/creator/character-cover.svg";
import heroArt from "../assets/auth/banner.webp";
import arrowUpRight from "../assets/landing/worlds/arrow-up-right.svg";
import chevronLeft from "../assets/landing/worlds/chevron-left.svg";
import chevronRight from "../assets/landing/worlds/chevron-right.svg";
import { usePageMeta } from "../data/pageMeta";

// Published characters, shaped for the cards below.
async function publicCharacters() {
  const characters = await loadPublicCharacters(24).catch(() => []);
  return characters.map((character) => ({
      id: character.id,
      title: character.universe ? `${character.alias} · ${character.universe}` : character.alias,
      author: character.creator,
      colour: character.accent || "#fc187b",
      art: character.cover || characterCover,
      excerpt: {
        lead: character.tagline ? `${character.tagline}. ` : "",
        body: character.backstory,
      },
      to: `/character/${character.slug || character.id}`,
      searchText: [character.alias, character.universe, character.tagline, character.creator]
        .filter(Boolean)
        .join(" "),
  }));
}

// What the Hint button offers: real characters that are actually here, so
// pressing one finds something. Invented names found nothing at all.
const hintsFrom = (characters) =>
  [...new Set(characters.flatMap((c) => [c.title?.split(" · ")[0], c.author].filter(Boolean)))].slice(0, 6);

// A creator, in the shape of a result.
//
// Searching a creator's name used to return their characters and no sign of
// the person, which answered a question nobody asked: somebody typing a name
// is usually looking for whoever made the work, not one thing they made. The
// same footprint as a character card, so a mixed set of results still lines
// up, and plainly a person rather than a character: a face, a handle, and
// how much there is to look at.
function CreatorCard({ creator }) {
  const initial = (creator.name || creator.handle || "?").replace("@", "").charAt(0).toUpperCase();

  return (
    <article
      className="relative flex w-[360px] shrink-0 flex-col gap-[18px] overflow-hidden rounded-[25px] border-[1.667px] border-[#4ea1ff]/60 bg-black/40 p-4 transition-colors hover:bg-black/60 sm:w-[500px] sm:p-[25px]"
      data-testid="creator-card"
    >
      <div className="flex items-center gap-4">
        {creator.avatarUrl ? (
          <Art
            src={creator.avatarUrl}
            alt=""
            loading="lazy"
            className="size-[72px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-[#2f3a4f] font-ui text-2xl font-bold text-[#8aa0c8]">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-ui text-xl font-bold text-white sm:text-2xl">
            {creator.name || creator.username}
          </p>
          <p className="truncate font-ui text-base font-bold text-[#4ea1ff]">{creator.username}</p>
        </div>
      </div>

      {creator.bio && (
        <p className="line-clamp-3 font-ui text-base leading-relaxed text-neutral-300">
          {creator.bio}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-4">
        <span className="font-ui text-sm text-neutral-400">
          {creator.published} {creator.published === 1 ? "character" : "characters"}
        </span>
        <Link
          to={`/creator/${creator.handle}`}
          className="rounded-full bg-[#2f86e8] px-5 py-2 font-ui text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          See their page
        </Link>
      </div>
    </article>
  );
}

function CharacterCard({ title, author, colour, art, overlay, excerpt, to = "/character" }) {
  return (
    <article
      className="relative flex w-[360px] shrink-0 flex-col gap-[18px] overflow-hidden rounded-[25px] border-[1.667px] bg-black/40 p-4 transition-colors hover:bg-black/60 sm:w-[500px] sm:p-[25px]"
      style={{ borderColor: colour }}
      data-testid="character-card"
    >
      <div className="relative h-[280px] w-full overflow-hidden rounded-xl bg-[#1e2637] sm:h-[360px]">
        <Art src={art} alt={typeof title === "string" ? title : ""} className="size-full object-cover" loading="lazy" />
        {overlay && (
          <img src={overlay} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        )}
      </div>

      <div className="flex w-full flex-col gap-[16.667px]">
        <div className="flex w-full items-start justify-between gap-3">
          <h3 className="w-[300px] max-w-full font-ui text-[22px] font-black tracking-[-0.125px] text-white sm:text-[25px]">
            {title}
          </h3>
          {/* Above the card's own link rather than inside it. An anchor
              cannot contain another anchor, so the card is covered by a
              stretched pseudo element and this sits over the top of it. */}
          {author ? (
            <Link
              to={`/creator/${String(author).replace(/^@+/, "")}`}
              className="relative z-10 whitespace-nowrap font-ui text-lg font-medium text-accent underline-offset-4 hover:underline"
            >
              By: {author}
            </Link>
          ) : (
            <p className="whitespace-nowrap font-ui text-lg font-medium text-accent">By: {author}</p>
          )}
        </div>
        <p className="line-clamp-3 min-h-[76px] font-ui text-base text-neutral-300">
          <span className="font-bold">{excerpt?.lead}</span>
          {excerpt?.body}
        </p>
      </div>

      {/* after:inset-0 is what makes the whole card the hit area. The
          words stay, because a card that is clickable without saying so
          leaves people hunting for the part that works. */}
      <Link
        to={to}
        className="flex items-center gap-[5px] self-end font-ui text-base font-medium text-white underline after:absolute after:inset-0 after:content-['']"
      >
        Read More
        <img src={arrowUpRight} alt="" className="size-5" />
      </Link>
    </article>
  );
}

// Two rails, one above the other, the lower one pushed along so the cards
// sit between the ones above rather than under them. They drift at slightly
// different speeds, which is what makes the whole thing look like it floats.
// The list in each rail is duplicated so its loop is seamless.
// Where a rail should be after one frame.
//
//   at      where this loop believes the rail is, as a fraction
//   wrote   what it last wrote out, after the browser rounded it
//   actual  where the rail actually is now
//
// scrollLeft is rounded to whole pixels, so `at` is kept apart from it: at
// these speeds a frame moves less than a pixel, and writing that into
// scrollLeft and reading it back loses the remainder every time.
//
// `actual` differing from `wrote` means something other than this loop moved
// the rail, which is a finger swiping it or the browser bringing a focused
// card into view. That movement is the reader's, so it wins.
export function nextPosition({ at, wrote, actual, elapsed, speed, half }) {
  let position = Math.abs(actual - wrote) > 1 ? actual : at;
  position += elapsed * speed;
  if (half > 0 && position >= half) position -= half; // loop seamlessly
  return position;
}

function CharacterMarquee({ characters }) {
  const topRail = useRef(null);
  const lowerRail = useRef(null);
  const paused = useRef(false);
  // Where an arrow press is taking each row; null while they just drift.
  const target = useRef([null, null]);
  // Where each row actually is, as a fraction.
  //
  // scrollLeft is rounded to whole pixels by the browser, so writing
  // 0.8px of movement into it and reading it back next frame loses the 0.8
  // every time. At these speeds that is most of the movement: frames
  // alternate between shifting a pixel and shifting nothing, which is the
  // stutter. Keeping the real position here and writing the rounded value
  // out means the fraction carries over.
  const at = useRef([0, 0]);
  // What this loop last wrote, after the browser rounded it. Anything that
  // does not match means something else moved the rail.
  const wrote = useRef([0, 0]);

  // Half each, so twice as many characters are in view as a single row showed.
  const half = Math.ceil(characters.length / 2);
  const rows = [characters.slice(0, half), characters.slice(half)];
  const hasLowerRow = rows[1].length > 0;

  useEffect(() => {
    const els = [topRail.current, lowerRail.current].filter(Boolean);
    if (!els.length) return undefined;
    // Respect reduced motion: no drifting, but the arrows still work.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // The lower row runs a shade slower, so the two never march in step.
    const speeds = [0.05, 0.038];

    // Measured when the cards change and on resize, not per frame. Reading
    // scrollWidth forces the browser to lay the row out, and doing that for
    // every rail sixty times a second is most of the work this loop does.
    let halves = els.map((el) => el.scrollWidth / 2);
    const remeasure = () => {
      halves = els.map((el) => el.scrollWidth / 2);
    };
    window.addEventListener("resize", remeasure);

    els.forEach((el, index) => {
      at.current[index] = el.scrollLeft;
      wrote.current[index] = el.scrollLeft;
    });

    let frame;
    let last = performance.now();
    const tick = (now) => {
      const elapsed = now - last;
      last = now;

      els.forEach((el, index) => {
        const half = halves[index];
        const goingTo = target.current[index];
        if (goingTo !== null) {
          // ease towards the card an arrow asked for
          const remaining = goingTo - el.scrollLeft;
          if (Math.abs(remaining) < 2) {
            el.scrollLeft = goingTo;
            target.current[index] = null;
          } else {
            el.scrollLeft += remaining * 0.18;
          }
          // An arrow moved it, so the drift carries on from where it landed.
          at.current[index] = el.scrollLeft;
          wrote.current[index] = el.scrollLeft;
        } else if (!reduceMotion && !paused.current && half > 0) {
          at.current[index] = nextPosition({
            at: at.current[index],
            wrote: wrote.current[index],
            actual: el.scrollLeft,
            elapsed,
            speed: speeds[index],
            half,
          });
          el.scrollLeft = at.current[index];
          // Read back rather than storing what we asked for: scrollLeft is
          // rounded to whole pixels, and that difference is what tells us
          // next frame whether anybody else touched it.
          wrote.current[index] = el.scrollLeft;
        }
      });

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", remeasure);
    };
  }, [characters]);

  // Arrows move both rows one card at a time.
  const step = (direction) => {
    [topRail.current, lowerRail.current].forEach((el, index) => {
      if (!el) return;
      const max = el.scrollWidth - el.clientWidth;
      target.current[index] = Math.max(0, Math.min(max, el.scrollLeft + direction * 530));
    });
  };

  const hold = {
    onMouseEnter: () => {
      paused.current = true;
    },
    onMouseLeave: () => {
      paused.current = false;
    },
    onPointerDown: () => {
      paused.current = true;
    },
    onPointerUp: () => {
      paused.current = false;
    },
    // Tabbing into the rail stops it. Nothing else here pauses for a
    // keyboard: without this the browser scrolls the focused card into view
    // and the drift carries it straight back out again.
    onFocusCapture: () => {
      paused.current = true;
    },
    onBlurCapture: () => {
      paused.current = false;
    },
  };

  return (
    <div className="relative">
      <div className="flex flex-col gap-4 sm:gap-6" data-testid="marquee">
        <div
          ref={topRail}
          className="scrollbar-none flex snap-x gap-[30px] overflow-x-auto px-6 py-2"
          {...hold}
        >
          <div className="flex w-max gap-[30px]">
            {[...rows[0], ...rows[0]].map((character, i) => (
              <CharacterCard key={`top-${character.id}-${i}`} {...character} />
            ))}
          </div>
        </div>

        {hasLowerRow && (
          <div
            ref={lowerRail}
            className="scrollbar-none flex snap-x gap-[30px] overflow-x-auto px-6 py-2"
            data-testid="marquee-lower"
            {...hold}
          >
            {/* The push that offsets this row against the one above it. */}
            <div className="flex w-max gap-[30px] pl-[90px] sm:pl-[180px] lg:pl-[265px]">
              {[...rows[1], ...rows[1]].map((character, i) => (
                <CharacterCard key={`lower-${character.id}-${i}`} {...character} />
              ))}
            </div>
          </div>
        )}
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
  usePageMeta({
    title: "Discover characters",
    description:
      "Browse every character published on VantaOrigin: their universe, their story, and the creator behind each one.",
    canonicalPath: "/discover",
  });

  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [showHints, setShowHints] = useState(false);
  const inputRef = useRef(null);
  // Published characters lead, then the samples.
  const [characters, setCharacters] = useState(null);
  useEffect(() => {
    let cancelled = false;
    publicCharacters().then((rows) => {
      if (!cancelled) setCharacters(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The people, for the search. Loaded alongside the characters rather than
  // behind a link, because "find me this creator" and "find me this
  // character" are the same question asked of the same box.
  const [creators, setCreators] = useState([]);
  useEffect(() => {
    let cancelled = false;
    loadPublicCreators()
      .then((rows) => !cancelled && setCreators(rows))
      // A search that cannot list the people still searches the characters.
      .catch(() => !cancelled && setCreators([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    const term = submitted.trim().toLowerCase();
    if (!term) return null;

    const matched = (characters || []).filter((c) =>
      [c.title, c.author, c.searchText].filter(Boolean).join(" ").toLowerCase().includes(term)
    );

    // Matched on who they are, not on what they have made: a character whose
    // name happens to contain the term is already in the list above, and
    // putting their creator there too for the same word would be answering
    // twice.
    const people = creators.filter((creator) =>
      [creator.name, creator.username, creator.handle].filter(Boolean).join(" ").toLowerCase().includes(term)
    );

    return { characters: matched, creators: people };
  }, [submitted, characters, creators]);

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
            Characters published by creators on VantaOrigin: their art, their stories, and the
            people who made them. Every one has a page of its own.
          </p>
          {/* A line here used to point at /creators for anybody looking for
              the people rather than the characters. The search below already
              reads creator names, so the answer to that question is to type
              it: creators now come back as results of their own, above the
              characters. The browse page is still there and still in the
              sitemap, it just does not need a signpost on top of a search
              box that does the same job. */}

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
                {hintsFrom(characters || []).map((suggestion) => (
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
              {/* People first. Somebody who typed a name is usually after
                  whoever made the work rather than one thing they made, and
                  there are far fewer of them, so they do not bury anything. */}
              {results.creators.map((creator) => (
                <CreatorCard key={creator.username} creator={creator} />
              ))}
              {results.characters.map((character) => (
                <CharacterCard key={character.id} {...character} />
              ))}
              {results.creators.length === 0 && results.characters.length === 0 && (
                <p className="font-ui text-lg text-neutral-300">
                  Nothing matches “{submitted}”.
                </p>
              )}
            </div>
          ) : characters === null ? (
            // Waiting, in the shape of the row that is coming.
            <div role="status" aria-label="Loading" className="flex justify-center gap-[30px] overflow-hidden px-6">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-[440px] w-[360px] shrink-0 rounded-[25px]" />
              ))}
            </div>
          ) : characters.length === 0 ? (
            <p className="px-6 text-center font-ui text-lg text-neutral-300">
              No characters have been published yet. Yours could be the first.
            </p>
          ) : (
            <CharacterMarquee characters={characters} />
          )}
        </div>

      </div>
    </div>
  );
}
