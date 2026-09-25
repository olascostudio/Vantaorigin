import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import CharacterCard from "../components/creator/CharacterCard";
import { DEFAULT_CHARACTER, likeCharacter, loadCharacter, loadPublicCharacter } from "../data/character";
import { useAuth } from "../data/AuthContext.jsx";
import ReportCreator from "../components/ReportCreator.jsx";
import JoinPrompt, { useJoinPrompt } from "../components/JoinPrompt.jsx";
import Loading from "../components/Loading.jsx";
import heroBanner from "../assets/creator/hero-banner.webp";
import mobileBanner from "../assets/creator/profile-mobile-bg.webp";
import flameBright from "../assets/creator/flame-bright.svg";
import flameSoft from "../assets/creator/flame-soft.svg";

// Section label used on phones and tablets, where the page reads top to bottom.
function SectionPill({ children }) {
  return (
    <h2 className="mx-auto w-fit rounded-full bg-white px-5 py-2 font-ui text-sm font-bold text-black shadow-[0_0_24px_rgba(255,255,255,0.25)] lg:hidden">
      {children}
    </h2>
  );
}

// Two faded cards peeking out behind the content, as in the mobile design.
function Stacked({ children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <div aria-hidden="true" className="absolute inset-0 translate-x-2 translate-y-3 rotate-[3deg] rounded-[26px] border border-white/10 bg-[#222b3c]/50" />
      <div aria-hidden="true" className="absolute inset-0 -translate-x-2 translate-y-1.5 -rotate-[3deg] rounded-[26px] border border-white/10 bg-[#222b3c]/70" />
      <div className="relative">{children}</div>
    </div>
  );
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Panel({ title, entry, flame, highlight, hideDescription = false, children }) {
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
      {!hideDescription && (
        <p className="relative mt-3 font-ui text-sm leading-relaxed text-neutral-200">
          {entry.description}
        </p>
      )}
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
      <Stacked className="mx-auto w-full max-w-[420px] lg:max-w-none">
        <div className="flex min-h-[220px] items-center justify-center rounded-[26px] border border-white/10 bg-[#222b3c] px-6 py-10 text-center font-ui text-base text-[#6b8ff5]">
          Nothing to show here yet.
        </div>
      </Stacked>
    );
  }

  return (
    <div className="relative">
      <div ref={rail} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((asset, index) => (
          <div
            key={`${asset}-${index}`}
            className="aspect-[3/4] overflow-hidden rounded-2xl bg-[#222b3c]"
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
  const { user } = useAuth();
  const [params] = useSearchParams();
  const id = params.get("id");
  // Owners read their own character; visitors read the published one. With no
  // id (the links on the marketing pages) the sample is shown.
  const [character, setCharacter] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // No id: the sample character, used by the links on the marketing pages.
      if (!id) return DEFAULT_CHARACTER;
      try {
        const character = owner ? await loadCharacter(id) : await loadPublicCharacter(id);
        // A character that is private, deleted or never existed is "missing"
        // to a visitor. Showing the sample instead would be a lie.
        return character || "missing";
      } catch {
        return "missing";
      }
    };

    load().then((next) => {
      if (!cancelled) setCharacter(next);
    });

    // Coming back from the editable page should show the new version.
    const refresh = () => load().then((next) => !cancelled && setCharacter(next));
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
    };
  }, [id, owner]);

  const assets = (character?.assets || []).map((asset) => asset.url ?? asset);
  // Phones show the origin story folded until it's opened.
  const [storyOpen, setStoryOpen] = useState(false);
  // Which extra core ability is expanded; null shows the main description.
  const [openExtra, setOpenExtra] = useState(null);

  // The sword under the name is the like. A tap answers straight away and the
  // count the API sends back replaces the guess; the ref stops a double tap
  // from sending two requests.
  // Sharing: the phone's own share sheet where there is one, the clipboard
  // everywhere else. The link is always the public one, even when an owner
  // shares from their own view of the character.
  const [shareNote, setShareNote] = useState("");
  const share = async () => {
    const link = character?.id
      ? `${window.location.origin}/character?id=${character.id}`
      : window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${character.alias} on VantaOrigin`, url: link });
        return;
      } catch (problem) {
        // Changed their mind: leave it there rather than copying behind them.
        if (problem?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      setShareNote(
        owner && character.visibility === "private"
          ? "Copied — publish it so fans can open it"
          : "Link copied"
      );
      setTimeout(() => setShareNote(""), 2600);
    } catch {
      window.prompt("Copy this link", link);
    }
  };

  // A visitor who is not signed in gets asked in: after a little while, or
  // the moment they reach for something that needs an account.
  const joinPrompt = useJoinPrompt({
    enabled: !user && !owner && Boolean(character?.id),
  });

  const liking = useRef(false);
  const toggleLike = async () => {
    if (!character?.id || liking.current) return;
    // Not signed in: ask them in where they are, rather than sending them
    // away from the character they came to look at.
    if (!user) {
      joinPrompt.invite();
      return;
    }

    liking.current = true;
    const was = character.liked;
    setCharacter((current) => ({
      ...current,
      liked: !was,
      likes: Math.max(0, current.likes + (was ? -1 : 1)),
    }));

    try {
      const state = await likeCharacter(character.id, was);
      setCharacter((current) => ({ ...current, ...state }));
    } catch {
      setCharacter((current) => ({
        ...current,
        liked: was,
        likes: Math.max(0, current.likes + (was ? 1 : -1)),
      }));
    } finally {
      liking.current = false;
    }
  };

  if (!character) {
    return (
      <div className="min-h-screen bg-[#1b2233]">
        <DashboardNav active="Creators’ Hub" />
        <Loading label="Opening character" />
      </div>
    );
  }

  if (character === "missing") {
    return (
      <div className="min-h-screen bg-[#1b2233]">
        <DashboardNav active="Creators’ Hub" />
        <div className="mx-auto max-w-[560px] px-6 py-24 text-center">
          <h1 className="font-ui text-3xl font-bold text-white">Character not found</h1>
          <p className="mt-4 font-ui text-lg leading-relaxed text-neutral-300">
            This character is private, has been removed, or the link is wrong.
          </p>
          <Link
            to="/discover"
            className="mt-8 inline-block rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-8 py-3 font-ui text-base font-bold text-white hover:opacity-90"
          >
            Explore Discovery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav active="Creators’ Hub" />

      {shareNote && (
        <p
          aria-live="polite"
          className="fixed inset-x-0 top-4 z-50 mx-auto w-fit rounded-full bg-[#2b3547] px-5 py-2.5 font-ui text-sm font-bold text-white shadow-lg ring-1 ring-white/20"
        >
          {shareNote}
        </p>
      )}

      <JoinPrompt
        open={joinPrompt.open}
        onClose={joinPrompt.close}
        creator={character.creator}
      />

      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-10">
        <div className="mx-auto w-full max-w-[640px] lg:max-w-none">
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

            <div className="flex items-center gap-2 sm:gap-4">
              {owner && (
                <button
                  type="button"
                  onClick={() => navigate(`/creators-hub/character/profile?id=${character.id}`)}
                  className="flex items-center gap-2 rounded-full bg-[#3ecf6a] px-4 py-2 font-ui text-sm font-bold text-white hover:opacity-90 sm:px-6 sm:py-2.5 sm:text-base"
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={share}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7b3fe4] to-[#a855f7] px-4 py-2 font-ui text-sm font-bold text-white hover:opacity-90 sm:px-6 sm:py-2.5 sm:text-base"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M12 16V3M7 8l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Share
              </button>

              {/* Beside Share, and only on someone else's character. */}
              {!owner && character.id && (
                <ReportCreator
                  target={{ characterId: character.id }}
                  signedIn={Boolean(user)}
                  onNeedsAccount={joinPrompt.invite}
                />
              )}
            </div>
          </div>

          {/* ---- Phones & tablets: card, then the story card ---- */}
          <div className="mt-8 flex flex-col gap-10 lg:hidden">
            <SectionPill>Characters</SectionPill>
            <Stacked className="mx-auto">
              <CharacterCard
                alias={character.alias}
                likes={character.likes}
                liked={character.liked}
                onLike={owner || !character.id ? undefined : toggleLike}
                cover={character.cover}
                showViewMore={owner}
                onViewMore={() => navigate(`/creators-hub/character/profile?id=${character.id}`)}
              />
            </Stacked>

            <section
              aria-label="Origin story"
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#222b3c]"
            >
              <img
                src={character.banner || mobileBanner}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-full object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-[#1b2233]/70" />

              <div className="relative flex flex-col items-center px-5 pb-12 pt-14 text-center">
                <img src={flameBright} alt="" aria-hidden="true" className="h-12 w-auto" />

                <h1 className="mt-4 font-ui text-2xl text-white">
                  {character.alias}
                  {character.realm && <> — {character.realm}</>}
                </h1>

                {character.tagline && (
                  <p className="mt-2 font-ui text-base font-bold text-white">
                    Tagline — {character.tagline}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setStoryOpen((open) => !open)}
                  aria-expanded={storyOpen}
                  className="mt-5 font-ui text-base font-bold text-[#6b8ff5] hover:underline"
                >
                  Origin Backstory
                </button>

                {storyOpen && (
                  <p className="mt-3 whitespace-pre-line rounded-lg bg-black/25 px-4 py-3 text-left font-ui text-sm leading-relaxed text-white">
                    {character.backstory}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStoryOpen((open) => !open)}
                aria-label={storyOpen ? "Collapse origin story" : "Expand origin story"}
                className="absolute bottom-3 right-3 flex size-9 items-center justify-center rounded-full text-white hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  {storyOpen ? (
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
              </button>
            </section>
          </div>

          {/* ---- Desktop: card and story side by side ---- */}
          <section className="relative mt-5 hidden overflow-hidden rounded-2xl bg-[#222b3c] lg:block">
            <img
              src={character.banner || heroBanner}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-[62%] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#222b3c] via-[#222b3c]/95 to-[#222b3c]/10" />

            <div className="relative flex flex-row gap-6 p-6">
              <CharacterCard
                alias={character.alias}
                likes={character.likes}
                liked={character.liked}
                onLike={owner || !character.id ? undefined : toggleLike}
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

          <section aria-label="Assets" className="mt-12 flex flex-col gap-8 lg:mt-5 lg:block">
            <SectionPill>Assets</SectionPill>
            <AssetRail assets={assets} />
          </section>

          <div className="mt-12 lg:hidden">
            <SectionPill>Strength &amp; Weakness</SectionPill>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5 lg:mt-5 lg:grid-cols-[1.1fr_1fr_1fr]">
            <Panel title="Core Ability" entry={character.core} highlight hideDescription={openExtra !== null}>
              <ul className="relative mt-6 flex flex-col gap-3">
                {character.core.extras
                  .filter((extra) => extra.name)
                  .map((extra, index) => {
                    const open = openExtra === index;
                    const hasDescription = Boolean(extra.description);
                    return (
                      <li key={index} className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenExtra(open ? null : index)}
                          aria-expanded={hasDescription ? open : undefined}
                          disabled={!hasDescription}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-ui text-base font-bold text-white transition-colors ${
                            hasDescription ? (open ? "bg-white/20" : "hover:bg-white/10") : "cursor-default"
                          }`}
                        >
                          <span aria-hidden="true" className="text-lg text-[#ff8fc7]">
                            ✦
                          </span>
                          <span className="min-w-0 flex-1">{extra.name}</span>
                          {hasDescription && <Chevron open={open} />}
                        </button>

                        {open && (
                          <p className="pl-9 font-ui text-sm leading-relaxed text-neutral-200">
                            {extra.description}
                          </p>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </Panel>

            <Panel title="Signature Move" entry={character.signature} flame={flameBright} />
            <Panel title="Weakness" entry={character.weakness} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2.6fr]">
            <Panel title="Alignment" entry={character.alignment} flame={flameSoft} />

            <div className="mt-7 lg:hidden">
              <SectionPill>Character Stats</SectionPill>
            </div>

            <section className="overflow-hidden rounded-2xl bg-[#222b3c] p-5">
              <h2 className="hidden font-ui text-lg font-bold text-[#6b8ff5] lg:block">Character Stats</h2>

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
