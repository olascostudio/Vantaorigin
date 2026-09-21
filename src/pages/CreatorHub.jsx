import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import HighlightModal from "../components/creator/HighlightModal";
import PostMenu from "../components/creator/PostMenu";
import bannerArt from "../assets/auth/banner.webp";
import characterArt from "../assets/landing/worlds/world-2-base.jpg";
import characterOverlay from "../assets/landing/worlds/world-2-overlay.webp";
import postImage from "../assets/creator/post-hero.webp";
import postImage2 from "../assets/creator/upload-sample-1.png";
import postImage3 from "../assets/creator/upload-sample-2.webp";
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

const INITIAL_POSTS = [
  {
    id: "challenger",
    author: "Abraham Lincoln",
    handle: "@kinloxx",
    verified: true,
    title: "🔥 A New Challenger Approaches the Battlegrounds! 🔥",
    content: `SwitchFace has officially entered the Vanta Arena — and the realm trembles.
Their mask has shifted, their stance has solidified, and now they await a worthy opponent brave enough to step forward.

Do you dare challenge them?
Prove your strength. Test your legend. Face the ever-changing terror that is SwitchFace — if you think your character has the will to endure`,
    images: [postImage, postImage2, postImage3],
    footer: `Victory brings:

🪙 +250 VP Coins
⚡ +120 XP Battle Cards
🏆 Eternal bragging rights across the realms.
Step forward... or step aside.
 Only one will walk away from this clash of legends.`,
  },
];

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
  return (
    <>
      <div className="relative h-[290px] overflow-hidden">
        <img src={bannerArt} alt="" className="size-full object-cover" />
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

      <div className="relative flex flex-col items-center px-6 pt-6 lg:pt-0">
        <img
          src={profilePic}
          alt="Anthony Joseph"
          className="-mt-[46px] size-[92px] rounded-full ring-4 ring-[#1b2233]"
        />

        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          <div className="text-center">
            <h1 className="font-ui text-2xl font-bold text-white">Anthony Joseph</h1>
            <p className="font-ui text-lg font-bold text-[#4ea1ff]">@Josephmaroon021</p>
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

        <button type="button" className="mt-2 font-ui text-base text-neutral-300 hover:text-white">
          Add a bio
        </button>

        <div className="order-first mb-6 flex flex-col items-start gap-1 self-start lg:absolute lg:left-12 lg:top-4 lg:order-none lg:mb-0">
          <span className="rounded-full bg-primary px-3 py-0.5 font-ui text-xs font-bold text-white">
            Coming soon
          </span>
          <button
            type="button"
            disabled
            className="flex items-center gap-2 rounded-full bg-[#28303f] px-5 py-2.5 font-ui text-lg font-bold text-white opacity-90"
          >
            Creator Studio
            <span aria-hidden="true" className="text-xs">▾</span>
          </button>
        </div>
      </div>
    </>
  );
}

function CharacterCard({ onEdit, onDelete }) {
  return (
    <article className="w-full max-w-[545px] rounded-2xl border border-white/10 p-6">
      <div className="flex justify-end">
        <PostMenu
          label="Character options"
          items={[
            { label: "Edit Character", onSelect: onEdit },
            { label: "Share Link", onSelect: () => {} },
            { label: "Delete Character", onSelect: onDelete, danger: true },
          ]}
        />
      </div>

      <div className="rounded-2xl border-[1.667px] border-[#f5af32] p-4">
        <div className="relative h-[330px] w-full overflow-hidden rounded-xl bg-[#888787]">
          <img src={characterArt} alt="" className="size-full object-cover" />
          <img src={characterOverlay} alt="" className="absolute inset-0 size-full object-cover" />
        </div>

        <div className="mt-5 flex items-start justify-between gap-3">
          <h3 className="max-w-[300px] font-ui text-[22px] font-black text-white">
            Obaalu’s Dominion: The Iron Inferno
          </h3>
          <p className="whitespace-nowrap font-ui text-base font-medium text-accent">By: Arinola</p>
        </div>
        <p className="mt-4 font-ui text-sm text-neutral-300">
          <span className="font-bold">From the heart of molten mountains, Obaalu rises — </span>
          the forge-born sovereign of flame and will. His dominion burns with purpose, shaping worlds
          and warriors alike in the heat of creation...
        </p>
        <a href="#character" className="mt-4 flex items-center justify-end gap-1 font-ui text-sm text-white underline">
          Read More
          <img src={arrowUpRight} alt="" className="size-4" />
        </a>
      </div>
    </article>
  );
}

function PostGallery({ images }) {
  const [index, setIndex] = useState(0);
  if (!images?.length) return null;

  return (
    <div className="relative mt-6 aspect-[1291/288] w-full overflow-hidden rounded-xl">
      <img src={images[index]} alt="" className="size-full object-cover" />
      <span className="absolute right-4 top-4 rounded-md bg-black/70 px-2 py-1 font-ui text-sm text-white">
        {index + 1}/{images.length}
      </span>
      <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
        {images.map((image, i) => (
          <button
            key={`${image}-${i}`}
            type="button"
            aria-label={`Show image ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={`size-2 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
          />
        ))}
      </div>
    </div>
  );
}

function HighlightPost({ post, onEdit, onDelete }) {
  return (
    <article className="rounded-2xl bg-[#232c3d] p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={profilePic} alt="" className="size-10 rounded-full" />
          <div>
            <p className="flex items-center gap-1.5 font-ui text-base font-bold text-white">
              {post.author}
              {post.verified && (
                <svg viewBox="0 0 24 24" className="size-4 text-[#22c55e]" fill="currentColor" aria-label="Verified">
                  <path d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1.3 2.9 1.3 2.9-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1L2.7 15.5 4 12.6 2.7 9.7l2.8-1.6.9-3.1 3.2.3z" />
                  <path d="M10.6 15.4l-2.9-2.9 1.1-1.1 1.8 1.8 4-4 1.1 1.1z" fill="#fff" />
                </svg>
              )}
            </p>
            <p className="font-ui text-sm text-neutral-400">{post.handle}</p>
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
  const [tab, setTab] = useState("Highlights");
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [modal, setModal] = useState(null); // { mode, post }

  const savePost = ({ title, content, images }) => {
    if (modal?.mode === "edit") {
      setPosts((prev) =>
        prev.map((p) => (p.id === modal.post.id ? { ...p, title, content, images } : p))
      );
    } else {
      setPosts((prev) => [
        {
          id: `post-${Date.now()}`,
          author: "Anthony Joseph",
          handle: "@Josephmaroon021",
          verified: false,
          title,
          content,
          images,
        },
        ...prev,
      ]);
    }
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

        <div className="flex gap-8 border-b border-white/10" role="tablist" aria-label="Creator sections">
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
                className={`-mb-px border-b-[3px] pb-3 font-ui text-2xl transition-colors ${
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
            <div className="flex flex-wrap items-center justify-between gap-6">
              <h2 className="font-ui text-[42px] font-bold text-white">My Characters</h2>
              <Link
                to="/creators-hub/character/new"
                className="rounded-xl bg-primary px-10 py-5 font-ui text-2xl font-bold text-white transition-opacity hover:opacity-90"
              >
                + Add Character
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-8">
              <CharacterCard onEdit={() => {}} onDelete={() => {}} />
            </div>
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

            <div className="mt-10 flex flex-col gap-8">
              {posts.map((post) => (
                <HighlightPost
                  key={post.id}
                  post={post}
                  onEdit={() => setModal({ mode: "edit", post })}
                  onDelete={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
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
