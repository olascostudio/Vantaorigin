// The creators, rather than the characters.
//
// Discover answers "what is on this site"; this answers "who is on it". The
// landing page could only ever show two, because those cards are written by
// hand and their artwork belongs to the people credited on them. This page is
// built from what creators have actually published, so it fills itself and
// nobody's work gets another name on it.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import { Art, Skeleton } from "../components/Loading.jsx";
import Reveal from "../components/Reveal";
import { loadPublicCreators } from "../data/creators";
import { usePageMeta } from "../data/pageMeta";
import characterCover from "../assets/creator/character-cover.svg";

function PersonIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z" />
    </svg>
  );
}

function CreatorCard({ creator }) {
  const { handle, username, name, bio, avatarUrl, published, characters } = creator;
  // The name is often the handle again, and saying it twice reads as a bug.
  const sameTwice = name.replace(/^@+/, "").toLowerCase() === handle.toLowerCase();

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1b2333] transition-colors hover:border-primary/60">
      {/* Their work first: three covers, or one that stretches. */}
      <div className="flex h-[150px] gap-px bg-[#141a2e]">
        {(characters.length ? characters : [{ id: "none" }]).map((character) => (
          <div key={character.id} className="min-w-0 flex-1 overflow-hidden">
            <Art
              src={character.coverUrl || characterCover}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <Art
              src={avatarUrl}
              alt=""
              loading="lazy"
              className="size-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#2a3346]">
              <PersonIcon className="size-6 text-neutral-400" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate font-ui text-lg font-bold text-white">{name}</h2>
            {/* A lighter accent than the token: #bd7132 measures 4.17:1 on
                this card, and 14px needs 4.5. This one is 4.8. */}
            {!sameTwice && <p className="truncate font-ui text-sm text-[#c87c38]">{username}</p>}
          </div>
        </div>

        {bio && (
          <p className="mt-4 line-clamp-3 whitespace-pre-line font-ui text-sm leading-relaxed text-neutral-300">
            {bio}
          </p>
        )}

        {/* mt-auto keeps this on the bottom edge however long the bio is, so
            the row of cards lines up instead of stepping. */}
        <p className="mt-auto pt-5 font-ui text-sm text-neutral-400">
          {published === 1 ? "1 character" : `${published} characters`}
        </p>
      </div>

      {/* One link covering the card, so the whole thing is the hit area and
          there is still something to read out and tab to. */}
      <Link
        to={`/creator/${handle}`}
        // The ring is drawn inside the link's own box. The card clips to
        // its rounded corners, so a ring offset outward is cut away
        // entirely and a keyboard user sees nothing at all.
        className="absolute inset-0 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary"
      >
        <span className="sr-only">{`Open ${name}'s page`}</span>
      </Link>
    </article>
  );
}

export default function Creators() {
  usePageMeta({
    title: "Creators",
    description:
      "The creators publishing on VantaOrigin: who they are, what they have made, and a page for each of them.",
    canonicalPath: "/creators",
  });

  const [creators, setCreators] = useState(null);
  const [problem, setProblem] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadPublicCreators()
      .then((rows) => {
        if (!cancelled) setCreators(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setCreators([]);
          setProblem("We could not load the creators just now. Try again in a moment.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || !creators) return creators;
    return creators.filter((creator) =>
      [creator.name, creator.username, creator.bio].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [creators, query]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <div className="mx-auto w-full max-w-[1200px] px-6 pb-24 pt-[90px]">
        <h1 className="font-ui text-[36px] font-bold leading-[1.15] text-white sm:text-[48px]">
          The people <span className="text-secondary">behind</span> the characters.
        </h1>
        <p className="mt-5 max-w-[680px] font-ui text-lg text-neutral-300">
          Every creator with a published character has a page here. Open one to see their
          characters, their posts, and a way to follow what they make next.
        </p>

        <label className="mt-9 block max-w-[420px]">
          <span className="sr-only">Search creators</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="Search creators..."
            className="h-14 w-full rounded-full border border-white/20 bg-black/30 px-6 font-ui text-base text-white outline-none transition-colors focus:border-primary placeholder:text-neutral-400 [&::-webkit-search-cancel-button]:hidden"
          />
        </label>

        {problem && (
          <p role="status" className="mt-8 font-ui text-base text-neutral-300">
            {problem}
          </p>
        )}

        {shown === null ? (
          <div
            role="status"
            aria-label="Loading"
            className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Skeleton key={index} className="h-[380px] rounded-2xl" />
            ))}
          </div>
        ) : shown.length === 0 && !problem ? (
          <p className="mt-10 font-ui text-lg text-neutral-300">
            {query.trim()
              ? `No creators match “${query.trim()}”.`
              : "No creators have published anything yet. Yours could be the first page here."}
          </p>
        ) : (
          <div
            className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="creators"
          >
            {shown.map((creator, index) => (
              <Reveal key={creator.username} delay={Math.min(index, 5) * 60} className="h-full">
                <CreatorCard creator={creator} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
