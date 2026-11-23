import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../data/api";
import { Art, CreatorSkeleton } from "../components/Loading.jsx";
import ReportCreator from "../components/ReportCreator.jsx";
import JoinPrompt, { useJoinPrompt } from "../components/JoinPrompt.jsx";
import SubscribeButton from "../components/SubscribeButton.jsx";
import { useAuth } from "../data/AuthContext.jsx";
import { usePageMeta } from "../data/pageMeta";
import LightningDivider from "../components/LightningDivider";
import logoMark from "../assets/landing/hero/logo-mark.svg";
import logoWordmark from "../assets/landing/hero/logo-wordmark.svg";
import characterCover from "../assets/creator/character-cover.svg";

// What someone sees when they follow a creator's shared link from a bio or a
// post: banner, face, name, and a look at the work. Nothing else.

function PersonIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z" />
    </svg>
  );
}

// Opened only for posts: characters have a page of their own to go to.
function PostView({ post, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <article
        role="dialog"
        aria-modal="true"
        aria-label={post.title || "Post"}
        className="my-8 w-full max-w-[640px] rounded-2xl bg-[#222b3c] p-5 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-ui text-xl font-bold text-white sm:text-2xl">{post.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full px-3 py-1 font-ui text-xl text-neutral-300 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        <p className="mt-4 whitespace-pre-line font-ui text-base leading-relaxed text-neutral-200">
          {post.content}
        </p>

        {post.images?.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {post.images.map((image) => (
              <img key={image} src={image} alt="" loading="lazy" className="w-full rounded-xl" />
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

function CharacterTile({ character }) {
  return (
    // The hub's card: an outer shell and a gold frame around the artwork
    // inside it. The flat tile this used to be was recognisably a different
    // product from the page the creator had just been editing, and the gold
    // line is the single thing that makes the two read as one place.
    <Link
      to={`/character/${character.slug || character.id}`}
      className="group flex flex-col rounded-2xl border border-white/10 p-2.5 transition-colors hover:border-white/30 sm:p-3"
    >
      <div className="flex flex-1 flex-col rounded-xl border-[1.5px] border-[#f5af32] p-2 sm:p-3">
        <div className="overflow-hidden rounded-lg">
          <Art
            src={character.coverUrl || characterCover}
            alt={character.name}
            loading="lazy"
            className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <p className="mt-2 truncate font-ui text-sm font-bold text-white sm:mt-3 sm:text-base">
          {character.name}
        </p>
        {character.tagline && (
          <p className="truncate font-ui text-xs text-neutral-400">{character.tagline}</p>
        )}
      </div>
    </Link>
  );
}

// One category: the name the creator gave it, then its characters.
//
// This used to put the characters inside a 2px purple box, copied across
// from the hub. In the hub that box is an editing surface, with an "add
// character" slot at the end of the row, so the frame means something. On a
// page a visitor is reading it means nothing, and a bright outline around a
// group of cards reads like a selection state or a stray debug border. The
// heading and the space between sections separate them perfectly well.
function CategoryGroup({ name, characters }) {
  // Five across once the page widens. At three in a 680px column the tiles
  // were 210px wide on a 1440px screen, which is a phone's idea of a card
  // shown to somebody who has room for a shelf of them.
  const tiles = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {characters.map((character) => (
        <CharacterTile key={character.id} character={character} />
      ))}
    </div>
  );

  if (!name) return tiles;

  return (
    <section aria-label={name}>
      <h2 className="mb-4 font-ui text-lg font-bold text-white sm:text-xl">{name}</h2>
      {tiles}
    </section>
  );
}

export default function CreatorPage() {
  const { username } = useParams();
  const { user } = useAuth();
  const [page, setPage] = useState(null);
  const [problem, setProblem] = useState("");
  const [tab, setTab] = useState("Characters");
  const [openPost, setOpenPost] = useState(null);
  const location = useLocation();
  // Arriving back from signing up, with the subscription already done.
  const [said, setSaid] = useState(
    location.state?.subscribed ? `You’re subscribed to ${location.state.subscribed}.` : ""
  );

  // This is the page a creator's link lands on, so it is where someone who
  // likes what they see is asked to make a page of their own.
  const joinPrompt = useJoinPrompt({ enabled: !user && Boolean(page) });

  const sameHandle = (a, b) =>
    String(a || "").replace(/^@+/, "").toLowerCase() ===
    String(b || "").replace(/^@+/, "").toLowerCase();
  const mine = Boolean(user && page?.creator && sameHandle(user.username, page.creator.username));

  // Somebody who has not filled in their name is known by their handle, since the
  // API hands back the handle as the name in that case, and saying it twice
  // reads as a mistake.
  const handle = page?.creator?.username || "";
  const given = page?.creator?.name?.trim() || "";
  const creatorName = given && given !== handle ? given : "";
  const shownAs = creatorName ? `${creatorName} (${handle})` : handle;

  usePageMeta({
    title: shownAs,
    description: page?.creator
      ? page.creator.bio ||
        `${creatorName || page.creator.username} shares ${page.characters.length} character${
          page.characters.length === 1 ? "" : "s"
        } on VantaOrigin.`
      : "",
    canonicalPath: page?.creator ? `/creator/${page.creator.username.replace(/^@/, "")}` : "",
  });

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/public/creators/${encodeURIComponent(username)}`)
      .then((data) => !cancelled && setPage(data))
      .catch((error) => !cancelled && setProblem(error.message));
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (problem) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center">
        <img src={logoMark} alt="" className="h-12 w-auto" />
        <h1 className="font-ui text-3xl font-bold text-white">Page not found</h1>
        <p className="max-w-[420px] font-ui text-lg text-neutral-300">
          Nobody is using <b className="break-all">{username}</b> on VantaOrigin, or the link is
          wrong.
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

  if (!page) {
    return (
      <div className="min-h-screen bg-background">
        <CreatorSkeleton />
      </div>
    );
  }

  const { creator, characters, highlights } = page;
  const showing = tab === "Characters" ? characters : highlights;

  // The same shape the hub uses: a creator files characters under categories
  // they named themselves, and this is that page as a visitor sees it. A
  // category the API did not send, or none at all, leaves its characters in a
  // group of their own rather than dropping them off the page.
  const groups = page.categories || [];
  const grouped = groups
    .map((category) => ({
      ...category,
      characters: characters.filter((character) => character.categoryId === category.id),
    }))
    .filter((category) => category.characters.length > 0);
  const named = new Set(grouped.map((category) => category.id));
  const unfiled = characters.filter((character) => !named.has(character.categoryId));

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Built to the hub's proportions on purpose.

          This page and the hub are the same place seen from two sides, and
          this one was a 680px column with 380px of nothing either side of it
          on a 1440px screen, which read as a plainer cousin rather than as
          the thing the creator had just been looking at. The banner now runs
          the full width the way the hub's does, and what follows sits in the
          hub's own container. The text blocks keep their own caps, because a
          line of prose 1000px wide is harder to read, not easier. */}
      <div>
        {/* Banner, with the profile picture sitting over its lower edge */}
        <div className="relative">
          {/* The hub's heights. Held at 180px this became a letterbox slit
              across a wide screen, and since people upload ordinary pictures
              rather than 1728x290 banners, object-cover was throwing most of
              the image away. */}
          <div className="h-[140px] overflow-hidden sm:h-[190px] lg:h-[290px]">
            {creator.bannerUrl ? (
              <Art src={creator.bannerUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="size-full bg-gradient-to-r from-[#2a3348] via-[#7a2352] to-[#c2185b]" />
            )}
          </div>

          {/* This page is the one a creator shares: it is their page as
              anybody else sees it. The way back to the hub is useful to the
              person whose page it is and to nobody else, so only they are
              shown it. It pointed at /discover before, which sent everybody
              who pressed it to the site's character list and made the page
              look like a preview of some fuller profile elsewhere.

              Bordered, so it reads against a light or a dark banner. */}
          {mine && (
            <Link
              to="/creators-hub"
              className="absolute right-3 top-3 rounded-full border border-white/80 bg-black/40 px-4 py-2 font-ui text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:right-4 sm:top-4 sm:text-sm"
            >
              Visit Profile ↗
            </Link>
          )}

          <div className="absolute inset-x-0 -bottom-10 flex justify-center sm:-bottom-12">
            {creator.avatarUrl ? (
              <Art
                src={creator.avatarUrl}
                alt={creator.name}
                className="size-20 rounded-full object-cover ring-4 ring-background sm:size-24"
              />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full bg-[#2f3a4f] ring-4 ring-background sm:size-24">
                <PersonIcon className="size-10 text-[#55648a] sm:size-12" />
              </span>
            )}
          </div>
        </div>

        <header className="mt-14 px-5 text-center sm:mt-16">
          <h1 className="font-ui text-2xl font-bold text-white sm:text-3xl">{creator.name}</h1>
          {/* The hub shows the handle under the name and this page did not,
              so the page somebody shares did not say who it belonged to in
              the form anybody would search for. Left out only when the
              creator has no name of their own and the handle is already the
              heading.

              In the hub's colour, not the accent. The accent is #bd7132,
              whose job in this codebase is author labels on world cards; an
              amber handle here was a third brand colour in 200 pixels and
              it fought the purple below it. This page is meant to be the
              hub as a visitor sees it, so it should look like the hub. */}
          {creatorName && (
            <p className="mt-1 font-ui text-base font-bold text-[#4ea1ff] sm:text-lg">{handle}</p>
          )}
          {creator.bio && (
            <p className="mx-auto mt-2 max-w-[520px] font-ui text-sm leading-relaxed text-neutral-300 sm:text-base">
              {creator.bio}
            </p>
          )}

          <div className="mt-5">
            <SubscribeButton username={handle} creatorName={creator.name} onDone={setSaid} />
          </div>

          {said && (
            <p
              role="status"
              className="mt-3 font-ui text-sm font-bold text-emerald-400"
            >
              {said}
            </p>
          )}
        </header>

        {/* The small divide between the two kinds of thing. The hub
            container from here down, so the shelf of characters is the width
            it is in the hub rather than a column in the middle. */}
        <div className="mx-auto mt-7 max-w-[1620px] px-6 lg:px-12">
          <div className="mx-auto flex w-fit gap-1 rounded-full bg-white/5 p-1">
            {["Characters", "Highlights"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                aria-pressed={tab === name}
                className={`rounded-full px-5 py-2 font-ui text-sm font-bold transition-colors sm:text-base ${
                  tab === name ? "bg-white text-black" : "text-neutral-300 hover:text-white"
                }`}
              >
                {name}
                <span className="ml-1.5 font-normal opacity-60">
                  {name === "Characters" ? characters.length : highlights.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* The hub puts this between the tabs and the work. It is the one
            piece of decoration the place has, and leaving it off here was
            most of why the two did not look related. */}
        <LightningDivider />

        <main className="mx-auto max-w-[1620px] px-6 lg:px-12">
          {showing.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center font-ui text-base text-neutral-400">
              {tab === "Characters"
                ? "No characters shared yet."
                : "No highlights posted yet."}
            </p>
          )}

          {tab === "Characters" && characters.length > 0 && (
            <div className="flex flex-col gap-8">
              {grouped.map((category) => (
                <CategoryGroup key={category.id} name={category.name} characters={category.characters} />
              ))}
              {unfiled.length > 0 && (
                <CategoryGroup
                  name={grouped.length > 0 ? "More characters" : ""}
                  characters={unfiled}
                />
              )}
            </div>
          )}

          {tab === "Highlights" && highlights.length > 0 && (
            <div className="flex flex-col gap-3">
              {highlights.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setOpenPost(post)}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#222b3c] p-3 text-left transition-colors hover:border-white/30 sm:gap-4"
                >
                  {post.images?.[0] ? (
                    <Art
                      src={post.images[0]}
                      alt=""
                      loading="lazy"
                      className="size-14 shrink-0 rounded-xl object-cover sm:size-16"
                    />
                  ) : (
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/5 font-ui text-xs text-neutral-400 sm:size-16">
                      Post
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-ui text-sm font-bold text-white sm:text-base">
                      {post.title || "Untitled post"}
                    </span>
                    <span className="mt-0.5 line-clamp-1 block font-ui text-xs text-neutral-400 sm:text-sm">
                      {post.content}
                    </span>
                  </span>

                  <span className="shrink-0 font-ui text-xs text-[#6b8ff5] underline sm:text-sm">
                    Read More
                  </span>
                </button>
              ))}
            </div>
          )}
        </main>

        <div className="mt-10 flex justify-center px-5">
          <ReportCreator
            target={{ username }}
            signedIn={Boolean(user)}
            onNeedsAccount={joinPrompt.invite}
            className="border-white/20 text-neutral-400 hover:text-white"
          />
        </div>

        <footer className="mt-8 flex flex-col items-center gap-2 px-5">
          <Link to="/" className="flex items-center gap-2 opacity-70 transition-opacity hover:opacity-100">
            <img src={logoMark} alt="" className="h-6 w-auto" />
            <img src={logoWordmark} alt="VantaOrigin" className="h-3.5 w-auto" />
          </Link>
          <p className="text-center font-ui text-xs text-neutral-500">
            One link for all your characters.
          </p>
        </footer>
      </div>

      {openPost && <PostView post={openPost} onClose={() => setOpenPost(null)} />}

      <JoinPrompt open={joinPrompt.open} onClose={joinPrompt.close} creator={creator.name} />
    </div>
  );
}
