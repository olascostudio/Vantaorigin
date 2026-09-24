import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import HighlightModal from "../components/creator/HighlightModal";
import PostMenu from "../components/creator/PostMenu";
import bannerArt from "../assets/auth/banner.webp";
import characterCover from "../assets/creator/character-cover.svg";
import {
  addCategory,
  deleteCategory,
  deleteCharacter,
  loadLibrary,
} from "../data/character";
import { toSettings } from "../data/settings";
import {
  createHighlight,
  deleteHighlight,
  loadHighlights,
  updateHighlight,
  uploadHighlightImages,
} from "../data/highlights";
import { useAuth } from "../data/AuthContext.jsx";
import { Skeleton } from "../components/Loading.jsx";
import arrowUpRight from "../assets/landing/worlds/arrow-up-right.svg";
import profilePic from "../assets/creator/profile.webp";
import bolt1 from "../assets/creator/bolt-1.svg";
import bolt2 from "../assets/creator/bolt-2.svg";
import bolt3 from "../assets/creator/bolt-3.svg";
import bolt4 from "../assets/creator/bolt-4.svg";
import bolt5 from "../assets/creator/bolt-5.svg";
import streak1 from "../assets/creator/streak-1.svg";
import streak2 from "../assets/creator/streak-2.svg";
import streak3 from "../assets/creator/streak-3.svg";
import streak4 from "../assets/creator/streak-4.svg";
import streak5 from "../assets/creator/streak-5.svg";

const TABS = ["Character", "Highlights", "Create Clans"];

// Decorative lightning strokes under the tab row.
function LightningDivider() {
  const bolts = [
    { src: bolt1, left: "4%" },
    { src: bolt2, left: "22%" },
    { src: bolt3, left: "40%" },
    { src: bolt4, left: "65%" },
    { src: bolt5, left: "92%" },
  ];
  const streaks = [
    { src: streak1, left: "8%" },
    { src: streak2, left: "23%" },
    { src: streak3, left: "39%" },
    { src: streak4, left: "62%" },
    { src: streak5, left: "88%" },
  ];

  return (
    <div aria-hidden="true" className="relative h-[150px] overflow-hidden">
      {bolts.map(({ src, left }) => (
        <img key={left} src={src} alt="" className="absolute top-3 h-12 w-[54px] max-w-none" style={{ left }} />
      ))}
      {streaks.map(({ src, left }) => (
        <img
          key={left}
          src={src}
          alt=""
          className="absolute top-[88px] h-[30px] w-[120px] max-w-none"
          style={{ left }}
        />
      ))}
    </div>
  );
}

function ProfileHeader() {
  // Whatever is saved on the account, falling back to the sample art.
  const { user } = useAuth();
  const settings = toSettings(user);
  const fullName = [settings.firstName, settings.lastName].filter(Boolean).join(" ");

  return (
    <>
      <div className="relative h-[290px] overflow-hidden">
        <img src={settings.banner || bannerArt} alt="" className="size-full object-cover" />
        <div className="absolute inset-0 flex flex-col items-center justify-start gap-2 bg-black/25 pt-10 text-center">
          <p className="font-ui text-2xl font-bold text-white">Change banner image</p>
          <p className="font-ui text-base font-medium text-white">
            Recommended Dimension 1728 X 290pixels
          </p>
          <div className="mt-3 flex items-center gap-6">
            <Link
              to="/settings/profile"
              className="rounded-full bg-secondary px-7 py-2.5 font-ui text-base font-bold text-white transition-opacity hover:opacity-90"
            >
              Replace
            </Link>
            <Link to="/settings/profile" className="font-ui text-base font-bold text-white hover:underline">
              Remove
            </Link>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col items-center px-6 pt-12 sm:pt-6 lg:pt-0">
        {settings.avatar ? (
          <img
            src={settings.avatar}
            alt={fullName || "Your avatar"}
            className="-mt-[46px] size-[92px] rounded-full object-cover ring-4 ring-[#1b2233]"
          />
        ) : (
          <span className="-mt-[46px] flex size-[92px] items-center justify-center rounded-full bg-[#2f3a4f] ring-4 ring-[#1b2233]">
            <svg viewBox="0 0 24 24" className="size-12 text-[#55648a]" fill="currentColor" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z" />
            </svg>
          </span>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          <div className="text-center">
            <h1 className="font-ui text-2xl font-bold text-white">
              {fullName || "Add your name"}
            </h1>
            <p className="font-ui text-lg font-bold text-[#4ea1ff]">{settings.username}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/settings/personal"
              className="rounded-full bg-[#2f86e8] px-5 py-1.5 font-ui text-sm font-bold text-white hover:opacity-90"
            >
              Edit
            </Link>
            <button
              type="button"
              className="rounded-full bg-[#a855f7] px-5 py-1.5 font-ui text-sm font-bold text-white hover:opacity-90"
            >
              Share
            </button>
          </div>
        </div>

        {settings.bio ? (
          <p className="mt-2 max-w-[640px] text-center font-ui text-base text-neutral-300">
            {settings.bio}
          </p>
        ) : (
          <Link to="/settings/personal" className="mt-2 font-ui text-base text-neutral-300 hover:text-white">
            Add a bio
          </Link>
        )}

        {/* Floats in the corner so the avatar never lands on top of it */}
        <div className="absolute left-3 top-2 z-10 pt-2 lg:left-12 lg:top-4">
          <span className="absolute -top-0.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 font-ui text-[10px] font-bold text-white shadow-md lg:px-3 lg:text-xs">
            Coming soon
          </span>
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 rounded-full bg-[#28303f] px-3 py-1.5 font-ui text-xs font-bold text-white opacity-90 lg:gap-2 lg:px-5 lg:py-2.5 lg:text-lg"
          >
            Creator Studio
            <span aria-hidden="true" className="text-[10px] lg:text-xs">▾</span>
          </button>
        </div>
      </div>
    </>
  );
}

function CharacterCard({ character, onEdit, onView, onDelete }) {
  // Own characters carry no creator name; they are always this account's.
  const { user } = useAuth();
  const creator = character.creator || user?.username || "";

  return (
    <article className="flex w-[180px] shrink-0 snap-start flex-col rounded-2xl border border-white/10 p-2.5 sm:w-[250px] sm:p-3">
      <div className="-mt-1 mb-1 flex justify-end">
        <PostMenu
          label="Character options"
          items={[
            { label: "Edit Character", onSelect: onEdit },
            { label: "Share Link", onSelect: () => {} },
            { label: "Delete Character", onSelect: onDelete, danger: true },
          ]}
        />
      </div>

      <div className="flex flex-1 flex-col rounded-xl border-[1.5px] border-[#f5af32] p-2 sm:p-3">
        <div className="relative h-[140px] w-full overflow-hidden rounded-lg bg-[#888787] sm:h-[190px]">
          <img
            src={character.cover || characterCover}
            alt={character.alias}
            className="size-full object-cover"
          />
        </div>

        <h3 className="mt-2 line-clamp-2 break-words font-ui text-base font-black leading-tight text-white sm:mt-3 sm:text-lg">
          {character.alias}
        </h3>
        {character.realm && (
          <p className="mt-0.5 truncate font-ui text-xs font-bold text-neutral-300">{character.realm}</p>
        )}
        <p className="mt-1 truncate font-ui text-xs font-medium text-accent">By: {creator}</p>
        <p className="mt-2 line-clamp-2 font-ui text-xs text-neutral-300">
          {character.tagline && <span className="font-bold">{character.tagline} — </span>}
          {character.backstory}
        </p>
        <button
          type="button"
          onClick={onView}
          className="ml-auto mt-auto flex items-center gap-1 pt-2 font-ui text-xs text-white underline"
        >
          Read More
          <img src={arrowUpRight} alt="" className="size-3.5" />
        </button>
      </div>
    </article>
  );
}

// Same footprint as a character card, left blank, as the way into the create flow.
function AddCharacterSlot({ categoryId }) {
  return (
    <Link
      to={`/creators-hub/character/new?category=${categoryId}`}
      className="group flex min-h-[280px] w-[180px] shrink-0 snap-start flex-col rounded-2xl border border-dashed border-white/20 p-2.5 transition-colors hover:border-[#a855f7] sm:min-h-[340px] sm:w-[250px] sm:p-3"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed border-[#f5af32]/60 bg-white/[0.04] transition-colors group-hover:bg-white/[0.07]">
        <span className="flex size-12 items-center justify-center rounded-full border-2 border-white/40 font-ui text-3xl font-light text-white/80">
          +
        </span>
        <span className="font-ui text-base font-bold text-white">Add Character</span>
      </div>
    </Link>
  );
}

function CategoryModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  // A ref, not the state above: three fast clicks all land in the same tick,
  // before React has re-rendered the disabled button.
  const sending = useRef(false);
  const trimmed = name.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-md"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label="New category"
        className="w-full max-w-[460px] rounded-2xl bg-[#2b3547] p-6 sm:p-8"
        onSubmit={async (event) => {
          event.preventDefault();
          // One category per press: the button locks until the server answers,
          // so an impatient second click cannot create a second category.
          if (!trimmed || sending.current) return;
          sending.current = true;
          setBusy(true);
          try {
            await onCreate(trimmed);
          } finally {
            sending.current = false;
            setBusy(false);
          }
        }}
      >
        <h2 className="font-ui text-2xl font-bold text-white">New category</h2>
        <p className="mt-2 font-ui text-sm text-neutral-300">
          Keep each comic, book or project in its own space.
        </p>
        <label htmlFor="category-name" className="mt-6 block font-ui text-base font-bold text-white">
          Category name
        </label>
        <input
          id="category-name"
          autoFocus
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === "Escape" && onClose()}
          placeholder="e.g. Iron Inferno Comic"
          className="mt-2 h-[54px] w-full rounded-xl border border-[#6b8ff5] bg-[#1f2738] px-5 font-ui text-base text-white outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6b8ff5]"
        />
        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-white px-6 py-2.5 font-ui text-base font-bold text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trimmed || busy}
            className="rounded-full bg-gradient-to-r from-[#7b3fe4] to-[#a855f7] px-6 py-2.5 font-ui text-base font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Full-screen viewer so cropped grid tiles can be seen whole.
function Lightbox({ images, start, onClose }) {
  const [index, setIndex] = useState(start);
  const step = (delta) => setIndex((i) => (i + delta + images.length) % images.length);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const arrow =
    "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-2xl text-white hover:bg-black/80";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <img
        src={images[index]}
        alt={`Image ${index + 1} of ${images.length}`}
        className="max-h-full max-w-full rounded-lg object-contain"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close viewer"
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-black/60 text-2xl text-white hover:bg-black/80"
      >
        ×
      </button>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => step(-1)} aria-label="Previous image" className={`${arrow} left-4`}>
            ‹
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next image" className={`${arrow} right-4`}>
            ›
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-2 py-1 font-ui text-sm text-white">
            {index + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

// X/Facebook-style media grid: 1 image keeps its shape, 2 sit side by side,
// 3 are one tall + two stacked, 4+ are a 2x2 with "+N" on the last tile.
function PostGallery({ images }) {
  const [viewing, setViewing] = useState(null);
  if (!images?.length) return null;

  const shown = images.slice(0, 4);
  const extra = images.length - shown.length;
  const count = shown.length;

  const layout =
    count === 1
      ? ""
      : count === 2
        ? "grid aspect-[16/9] grid-cols-2 gap-1"
        : "grid aspect-[16/9] grid-cols-2 grid-rows-2 gap-1";

  return (
    <>
      <div className={`mt-6 w-full max-w-[680px] overflow-hidden rounded-2xl border border-white/10 ${layout}`}>
        {shown.map((image, i) => (
          <button
            key={`${image}-${i}`}
            type="button"
            onClick={() => setViewing(i)}
            aria-label={`Open image ${i + 1} of ${images.length}`}
            className={`relative block overflow-hidden bg-black/30 ${count === 3 && i === 0 ? "row-span-2" : ""}`}
          >
            <img
              src={image}
              alt=""
              className={
                count === 1
                  ? "block max-h-[520px] w-full object-cover"
                  : "size-full object-cover transition-transform duration-300 hover:scale-[1.03]"
              }
            />
            {extra > 0 && i === shown.length - 1 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 font-ui text-3xl font-bold text-white">
                +{extra}
              </span>
            )}
          </button>
        ))}
      </div>

      {viewing !== null && (
        <Lightbox images={images} start={viewing} onClose={() => setViewing(null)} />
      )}
    </>
  );
}

function HighlightPost({ post, onEdit, onDelete }) {
  return (
    <article className="rounded-2xl bg-[#232c3d] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {post.author?.avatarUrl ? (
            <img src={post.author.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full bg-[#2f3a4f]">
              <svg viewBox="0 0 24 24" className="size-6 text-[#55648a]" fill="currentColor" aria-hidden="true">
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z" />
              </svg>
            </span>
          )}
          <div>
            <p className="flex items-center gap-1.5 font-ui text-base font-bold text-white">
              {post.author?.name}
              {post.verified && (
                <svg viewBox="0 0 24 24" className="size-4 text-[#22c55e]" fill="currentColor" aria-label="Verified">
                  <path d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1.3 2.9 1.3 2.9-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1L2.7 15.5 4 12.6 2.7 9.7l2.8-1.6.9-3.1 3.2.3z" />
                  <path d="M10.6 15.4l-2.9-2.9 1.1-1.1 1.8 1.8 4-4 1.1 1.1z" fill="#fff" />
                </svg>
              )}
            </p>
            {/* Only when it adds something: without a display name the
                API falls back to the username, and one line is enough. */}
            {post.author?.name !== post.author?.username && (
              <p className="font-ui text-sm text-neutral-400">{post.author?.username}</p>
            )}
          </div>
        </div>

        <PostMenu
          label="Post options"
          items={[
            { label: "Edit Post", onSelect: onEdit },
            { label: "Share Link", onSelect: () => {} },
            { label: "Delete Post", onSelect: onDelete, danger: true },
          ]}
        />
      </div>

      <h3 className="mt-6 font-ui text-2xl font-bold text-white">{post.title}</h3>
      <p className="mt-4 whitespace-pre-line font-ui text-base leading-relaxed text-neutral-200">
        {post.content}
      </p>

      <PostGallery images={post.images} />

      {post.footer && (
        <p className="mt-6 whitespace-pre-line font-ui text-base font-medium leading-relaxed text-neutral-200">
          {post.footer}
        </p>
      )}
    </article>
  );
}

export default function CreatorHub() {
  const navigate = useNavigate();
  // The creator's categories and the characters filed under them.
  const [library, setLibrary] = useState({ categories: [], characters: [] });
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [addingCategory, setAddingCategory] = useState(false);
  const [problem, setProblem] = useState("");

  const refreshLibrary = () =>
    loadLibrary()
      .then(setLibrary)
      .catch((error) => setProblem(error.message))
      .finally(() => setLibraryLoading(false));

  // One fetch per visit: development renders effects twice, and this page
  // would otherwise ask for the same three things on every load.
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    refreshLibrary();
    refreshPosts();
  }, []);
  const location = useLocation();
  // Coming back from creating a character lands on the Character tab.
  const [tab, setTab] = useState(location.state?.tab || "Character");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsProblem, setPostsProblem] = useState("");

  const refreshPosts = () =>
    loadHighlights()
      .then(setPosts)
      .catch((error) => setPostsProblem(error.message))
      .finally(() => setPostsLoading(false));


  const [modal, setModal] = useState(null); // { mode, post }

  const savePost = async ({ title, content, images }) => {
    // Any picture picked in the form is uploaded first.
    const urls = await uploadHighlightImages(images);
    const post = { title, content, images: urls };

    if (modal?.mode === "edit") await updateHighlight(modal.post.id, post);
    else await createHighlight(post);

    await refreshPosts();
    setModal(null);
  };

  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav active="Creators’ Hub" />
      <ProfileHeader />

      <div className="mt-10 border-t border-white/10" />

      <div className="mx-auto max-w-[1620px] px-6 lg:px-12">
        <div className="flex justify-center py-6">
          <button
            type="button"
            className="rounded-full bg-[#2f86e8] px-7 py-2.5 font-ui text-lg font-bold text-white hover:opacity-90"
          >
            My Dashboard
          </button>
        </div>

        <div
          className="scrollbar-none flex gap-6 overflow-x-auto border-b border-white/10 sm:gap-8"
          role="tablist"
          aria-label="Creator sections"
        >
          {TABS.map((name) => {
            const disabled = name === "Create Clans";
            const active = tab === name;
            return (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                title={disabled ? "Not available in v1" : undefined}
                onClick={() => !disabled && setTab(name)}
                className={`-mb-px shrink-0 border-b-[3px] pb-3 font-ui text-lg transition-colors sm:text-2xl ${
                  active ? "border-primary text-primary" : "border-transparent text-white"
                } ${disabled ? "cursor-not-allowed opacity-50" : "hover:text-primary"}`}
              >
                {name}
              </button>
            );
          })}
        </div>

        <LightningDivider />

        {tab === "Character" && (
          <section aria-label="My Characters" className="pb-24">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-ui text-3xl font-bold text-white sm:text-[42px]">My Characters</h2>
              <button
                type="button"
                onClick={() => setAddingCategory(true)}
                className="ml-auto shrink-0 rounded-lg bg-primary px-4 py-2 font-ui text-sm font-bold text-white transition-opacity hover:opacity-90 sm:px-5 sm:py-2.5 sm:text-base"
              >
                + Add Category
              </button>
            </div>

            {problem && (
              <p role="alert" className="mt-6 rounded-xl bg-[#3a2030] px-5 py-4 font-ui text-base text-[#ffb4c4]">
                {problem}
              </p>
            )}

            {libraryLoading ? (
              <div className="mt-8 flex flex-col gap-4">
                <Skeleton className="h-7 w-48" />
                <div className="flex gap-4 rounded-2xl border-2 border-[#a855f7]/40 p-4">
                  <Skeleton className="h-[342px] w-[180px] sm:h-[411px] sm:w-[250px]" />
                  <Skeleton className="hidden h-[411px] w-[250px] sm:block" />
                </div>
              </div>
            ) : library.categories.length === 0 ? (
              <p className="mt-10 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center font-ui text-lg text-neutral-400">
                Start with a category for each comic, book or project, then add its characters.
              </p>
            ) : (
              <div className="mt-8 flex flex-col gap-8">
                {library.categories.map((category) => {
                  const characters = library.characters.filter(
                    (character) => character.categoryId === category.id
                  );
                  return (
                    <section key={category.id} aria-label={category.name}>
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <h3 className="break-words font-ui text-xl font-bold text-white sm:text-2xl">
                          {category.name}
                        </h3>
                        <PostMenu
                          label={`${category.name} options`}
                          items={[
                            {
                              label: "Delete Category",
                              danger: true,
                              onSelect: async () => {
                                const note = characters.length
                                  ? ` and its ${characters.length} character${characters.length === 1 ? "" : "s"}`
                                  : "";
                                if (!window.confirm(`Delete “${category.name}”${note}? This can’t be undone.`)) return;

                                // Remove it from view at once; the page does not
                                // wait on the network to stop showing it.
                                setLibrary((current) => ({
                                  categories: current.categories.filter((c) => c.id !== category.id),
                                  characters: current.characters.filter(
                                    (c) => c.categoryId !== category.id
                                  ),
                                }));

                                try {
                                  await deleteCategory(category.id);
                                } catch (error) {
                                  setProblem(error.message);
                                }
                                await refreshLibrary();
                              },
                            },
                          ]}
                        />
                      </div>

                      <div className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-2xl border-2 border-[#a855f7] p-3 sm:gap-4 sm:p-4 lg:snap-none lg:flex-wrap lg:overflow-visible">
                        {characters.map((character) => (
                          <CharacterCard
                            key={character.id}
                            character={character}
                            onView={() => navigate(`/creators-hub/character?id=${character.id}`)}
                            onEdit={() => navigate(`/creators-hub/character/profile?id=${character.id}`)}
                            onDelete={async () => {
                              if (!window.confirm(`Delete ${character.alias}? This can’t be undone.`)) return;

                              setLibrary((current) => ({
                                ...current,
                                characters: current.characters.filter((c) => c.id !== character.id),
                              }));

                              try {
                                await deleteCharacter(character.id);
                              } catch (error) {
                                setProblem(error.message);
                              }
                              await refreshLibrary();
                            }}
                          />
                        ))}
                        <AddCharacterSlot categoryId={category.id} />
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {addingCategory && (
              <CategoryModal
                onClose={() => setAddingCategory(false)}
                onCreate={async (name) => {
                  const category = await addCategory(name);
                  // Show it immediately, then reconcile with the server.
                  setLibrary((current) => ({
                    ...current,
                    categories: [...current.categories, category],
                  }));
                  setAddingCategory(false);
                  refreshLibrary();
                }}
              />
            )}
          </section>
        )}

        {tab === "Highlights" && (
          <section aria-label="My Highlights" className="pb-24">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <h2 className="font-ui text-[42px] font-bold text-white">My Highlights</h2>
              <button
                type="button"
                onClick={() => setModal({ mode: "create", post: null })}
                className="rounded-xl bg-primary px-10 py-5 font-ui text-2xl font-bold text-white transition-opacity hover:opacity-90"
              >
                + Add Highlights
              </button>
            </div>

            {postsProblem && (
              <p role="alert" className="mt-6 rounded-xl bg-[#3a2030] px-5 py-4 font-ui text-base text-[#ffb4c4]">
                {postsProblem}
              </p>
            )}

            {postsLoading && (
              <div className="mt-10 flex flex-col gap-8">
                {[0, 1].map((row) => (
                  <div key={row} className="rounded-2xl bg-[#232c3d] p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 rounded-full" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="mt-6 h-7 w-3/4" />
                    <Skeleton className="mt-4 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-5/6" />
                    <Skeleton className="mt-6 aspect-[16/9] w-full max-w-[680px]" />
                  </div>
                ))}
              </div>
            )}

            {!postsLoading && posts.length === 0 && !postsProblem && (
              <p className="mt-10 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center font-ui text-lg text-neutral-400">
                No highlights yet. Share what your characters are up to.
              </p>
            )}

            <div className="mt-10 flex flex-col gap-8">
              {posts.map((post) => (
                <HighlightPost
                  key={post.id}
                  post={post}
                  onEdit={() => setModal({ mode: "edit", post })}
                  onDelete={async () => {
                    if (!window.confirm("Delete this highlight?")) return;
                    await deleteHighlight(post.id).catch(() => {});
                    await refreshPosts();
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <HighlightModal
        open={Boolean(modal)}
        mode={modal?.mode}
        post={modal?.post}
        onClose={() => setModal(null)}
        onSubmit={savePost}
      />
    </div>
  );
}
