import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../data/api";
import Loading from "../components/Loading.jsx";
import logoMark from "../assets/landing/hero/logo-mark.svg";
import logoWordmark from "../assets/landing/hero/logo-wordmark.svg";
import characterCover from "../assets/creator/character-cover.svg";

// The page behind a creator's shared link: their characters and posts in one
// place, readable without an account. Everything opens in place, so a visitor
// can look through several without losing the Realm.

function PersonIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z" />
    </svg>
  );
}

function CharacterPanel({ character, onClose }) {
  const details = character.details || {};
  const extras = (details.core?.extras || []).filter((extra) => extra.name);

  return (
    <div className="mt-6 rounded-3xl border border-[#465578] bg-[#222b3c] p-5 sm:p-7">
      <div className="flex flex-col gap-6 sm:flex-row">
        <img
          src={character.coverUrl || characterCover}
          alt={character.name}
          className="h-[260px] w-full shrink-0 rounded-2xl object-cover sm:w-[200px]"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-ui text-2xl font-bold text-white">{character.name}</h3>
              {character.realm && (
                <p className="mt-1 font-ui text-base text-neutral-300">{character.realm}</p>
              )}
              {character.tagline && (
                <p className="mt-2 font-ui text-base font-bold text-[#5fdc8a]">{character.tagline}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close character"
              className="shrink-0 rounded-full px-3 py-1 font-ui text-xl text-neutral-300 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>

          {character.backstory && (
            <p className="mt-4 line-clamp-6 whitespace-pre-line font-ui text-base leading-relaxed text-neutral-200">
              {character.backstory}
            </p>
          )}

          {details.core?.name && (
            <div className="mt-5">
              <p className="font-ui text-sm font-bold uppercase tracking-wide text-[#6b8ff5]">
                Core ability
              </p>
              <p className="mt-1 font-ui text-base font-bold text-white">{details.core.name}</p>
              {details.core.description && (
                <p className="mt-1 font-ui text-sm leading-relaxed text-neutral-300">
                  {details.core.description}
                </p>
              )}
            </div>
          )}

          {extras.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {extras.map((extra) => (
                <li
                  key={extra.name}
                  className="rounded-full bg-white/10 px-3 py-1.5 font-ui text-sm text-white"
                >
                  ✦ {extra.name}
                </li>
              ))}
            </ul>
          )}

          <Link
            to={`/character?id=${character.id}`}
            className="mt-6 inline-block rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-7 py-3 font-ui text-base font-bold text-white hover:opacity-90"
          >
            View full character
          </Link>
        </div>
      </div>

      {character.assets?.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {character.assets.slice(0, 8).map((asset) => (
            <img
              key={asset.id}
              src={asset.url}
              alt=""
              loading="lazy"
              className="aspect-square w-full rounded-xl object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HighlightPanel({ post, onClose }) {
  return (
    <div className="mt-6 rounded-3xl border border-[#465578] bg-[#222b3c] p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-ui text-2xl font-bold text-white">{post.title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close post"
          className="shrink-0 rounded-full px-3 py-1 font-ui text-xl text-neutral-300 hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>

      <p className="mt-4 whitespace-pre-line font-ui text-base leading-relaxed text-neutral-200">
        {post.content}
      </p>

      {post.images?.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {post.images.map((image) => (
            <img
              key={image}
              src={image}
              alt=""
              loading="lazy"
              className="aspect-[4/3] w-full rounded-xl object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Realm() {
  const { username } = useParams();
  const [realm, setRealm] = useState(null);
  const [problem, setProblem] = useState("");
  const [open, setOpen] = useState(null); // { kind: "character" | "highlight", id }

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/public/realms/${encodeURIComponent(username)}`)
      .then((data) => !cancelled && setRealm(data))
      .catch((error) => !cancelled && setProblem(error.message));
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (problem) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <img src={logoMark} alt="" className="h-12 w-auto" />
        <h1 className="font-ui text-3xl font-bold text-white">Realm not found</h1>
        <p className="max-w-[420px] font-ui text-lg text-neutral-300">
          Nobody is using <b>{username}</b> on VantaOrigin, or the link is wrong.
        </p>
        <Link
          to="/"
          className="rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-8 py-3 font-ui text-base font-bold text-white hover:opacity-90"
        >
          Go to VantaOrigin
        </Link>
      </div>
    );
  }

  if (!realm) {
    return (
      <div className="min-h-screen bg-background">
        <Loading label="Opening this Realm" className="min-h-screen" />
      </div>
    );
  }

  const { creator, characters, highlights } = realm;
  const openCharacter = open?.kind === "character" && characters.find((c) => c.id === open.id);
  const openHighlight = open?.kind === "highlight" && highlights.find((h) => h.id === open.id);
  const isEmpty = characters.length === 0 && highlights.length === 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Banner and creator */}
      <div className="relative h-[180px] overflow-hidden sm:h-[240px]">
        {creator.bannerUrl ? (
          <img src={creator.bannerUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-gradient-to-r from-[#2a3348] via-[#7a2352] to-[#c2185b]" />
        )}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <header className="mx-auto -mt-12 flex max-w-[860px] flex-col gap-4 px-5 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-end gap-4">
          {creator.avatarUrl ? (
            <img
              src={creator.avatarUrl}
              alt={creator.name}
              className="size-[92px] shrink-0 rounded-full object-cover ring-4 ring-background sm:size-[110px]"
            />
          ) : (
            <span className="flex size-[92px] shrink-0 items-center justify-center rounded-full bg-[#2f3a4f] ring-4 ring-background sm:size-[110px]">
              <PersonIcon className="size-12 text-[#55648a]" />
            </span>
          )}

          <div className="min-w-0 pb-1">
            <h1 className="truncate font-ui text-2xl font-bold text-white sm:text-3xl">
              {creator.name}
            </h1>
            <p className="font-ui text-base font-bold text-[#4ea1ff]">{creator.username}</p>
          </div>
        </div>

        <Link
          to={`/discover`}
          className="shrink-0 self-start rounded-full border-2 border-white px-6 py-2.5 font-ui text-base font-bold text-white transition-colors hover:bg-white/10 sm:self-auto"
        >
          Visit Profile ↗
        </Link>
      </header>

      {creator.bio && (
        <p className="mx-auto mt-4 max-w-[860px] px-5 font-ui text-base leading-relaxed text-neutral-300">
          {creator.bio}
        </p>
      )}

      <main className="mx-auto mt-10 max-w-[860px] px-5">
        <h2 className="font-ui text-xl font-bold text-white sm:text-2xl">Characters &amp; Highlights</h2>

        {isEmpty && (
          <p className="mt-6 rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center font-ui text-base text-neutral-400">
            This Realm is still being built. Check back soon.
          </p>
        )}

        {/* Whatever is open sits right under the heading, so it is seen */}
        {openCharacter && <CharacterPanel character={openCharacter} onClose={() => setOpen(null)} />}
        {openHighlight && <HighlightPanel post={openHighlight} onClose={() => setOpen(null)} />}

        {characters.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {characters.map((character) => (
              <button
                key={character.id}
                type="button"
                onClick={() => setOpen({ kind: "character", id: character.id })}
                aria-pressed={open?.id === character.id}
                className={`group overflow-hidden rounded-2xl border bg-[#222b3c] text-left transition-colors ${
                  open?.id === character.id ? "border-[#6b8ff5]" : "border-white/10 hover:border-white/30"
                }`}
              >
                <img
                  src={character.coverUrl || characterCover}
                  alt=""
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="p-3">
                  <p className="truncate font-ui text-sm font-bold text-white">{character.name}</p>
                  {character.realm && (
                    <p className="truncate font-ui text-xs text-neutral-400">{character.realm}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {highlights.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            {highlights.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => setOpen({ kind: "highlight", id: post.id })}
                className={`flex items-center gap-4 rounded-2xl border bg-[#222b3c] p-3 text-left transition-colors ${
                  open?.id === post.id ? "border-[#6b8ff5]" : "border-white/10 hover:border-white/30"
                }`}
              >
                {post.images?.[0] ? (
                  <img
                    src={post.images[0]}
                    alt=""
                    loading="lazy"
                    className="size-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-white/5 font-ui text-xs text-neutral-400">
                    Post
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-ui text-base font-bold text-white">
                    {post.title || "Untitled post"}
                  </span>
                  <span className="mt-0.5 line-clamp-1 block font-ui text-sm text-neutral-400">
                    {post.content}
                  </span>
                </span>

                <span className="shrink-0 font-ui text-sm text-[#6b8ff5] underline">Read More</span>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="mx-auto mt-14 flex max-w-[860px] flex-col items-center gap-3 px-5">
        <Link to="/" className="flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100">
          <img src={logoMark} alt="" className="h-7 w-auto" />
          <img src={logoWordmark} alt="VantaOrigin" className="h-4 w-auto" />
        </Link>
        <p className="text-center font-ui text-sm text-neutral-400">
          Make your own Realm — one link for all your characters.
        </p>
      </footer>
    </div>
  );
}
