import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import CharacterCard from "../components/creator/CharacterCard";
import {
  addAsset,
  loadCharacter,
  removeAsset,
  saveCharacter,
  uploadImage,
} from "../data/character";
import EditableText from "../components/creator/EditableText";
import heroBanner from "../assets/creator/hero-banner.webp";
import mobileBanner from "../assets/creator/profile-mobile-bg.webp";
import flameBright from "../assets/creator/flame-bright.svg";
import flameSoft from "../assets/creator/flame-soft.svg";
import sword from "../assets/creator/sword.svg";

// Shared with the read-only character pages.

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

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M21 16l-5-5-8 8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Collapsible panel: the header toggles it, the body is edited in place.
function AbilityPanel({
  title,
  value,
  onChange,
  highlight,
  flame,
  defaultOpen = true,
  hideDescription = false,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

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

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative flex w-full items-center justify-between gap-3 font-ui text-lg font-bold text-[#6b8ff5]"
      >
        {title}
        <Chevron open={open} />
      </button>

      {open && (
        <div className="relative mt-4 flex flex-col gap-3">
          <EditableText
            value={value.name}
            onChange={(name) => onChange({ ...value, name })}
            placeholder="Enter name"
            label={`${title} name`}
            className="bg-[#39435a] font-ui text-base font-bold text-white"
            inputClassName="text-base font-bold"
          />
          {!hideDescription && (
            <EditableText
              value={value.description}
              onChange={(description) => onChange({ ...value, description })}
              placeholder="Describe ability"
              label={`${title} description`}
              multiline
              className="min-h-[92px] bg-white/5 font-ui text-base text-neutral-200"
              inputClassName="text-base"
            />
          )}
          {children}
        </div>
      )}
    </section>
  );
}

export default function CharacterProfile() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get("id");
  const [data, setData] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [problem, setProblem] = useState("");
  const lastSaved = useRef("");

  // Fetch the character being edited. Without one there is nothing to edit.
  useEffect(() => {
    let cancelled = false;
    loadCharacter(id)
      .then((character) => {
        if (cancelled) return;
        if (!character) {
          navigate("/creators-hub", { replace: true, state: { tab: "Character" } });
          return;
        }
        lastSaved.current = JSON.stringify(character);
        setData(character);
      })
      .catch(() => navigate("/creators-hub", { replace: true, state: { tab: "Character" } }));
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);
  const assetInput = useRef(null);
  const bannerInput = useRef(null);
  // Phones show the origin story folded until it's opened.
  const [storyOpen, setStoryOpen] = useState(false);
  // Which extra core ability is expanded; null shows the main ability's description.
  const [openExtra, setOpenExtra] = useState(null);
  // { done, total } while pictures are being uploaded.
  const [uploading, setUploading] = useState(null);

  // Auto-save: everything on this page persists as it is edited.
  useEffect(() => {
    if (!data) return undefined;
    const serialised = JSON.stringify(data);
    if (serialised === lastSaved.current) return undefined;

    const timer = setTimeout(async () => {
      try {
        await saveCharacter(data);
        lastSaved.current = serialised;
        setProblem("");
        setSavedAt(new Date());
      } catch (error) {
        setProblem(error.message);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [data]);

  const setField = (key) => (value) => setData((prev) => ({ ...prev, [key]: value }));

  // Uploaded to storage one at a time, each appearing as soon as it lands,
  // so a batch of ten doesn't look frozen until the last one finishes.
  const addAssets = async (files) => {
    const chosen = [...files];
    setUploading({ done: 0, total: chosen.length });

    for (const [index, file] of chosen.entries()) {
      try {
        const added = await addAsset(data.id, file);
        setData((prev) => ({ ...prev, assets: [...prev.assets, added] }));
      } catch (error) {
        setProblem(`${file.name}: ${error.message}`);
      }
      setUploading({ done: index + 1, total: chosen.length });
    }

    setUploading(null);
  };

  const setExtra = (index, patch) =>
    setField("core")({
      ...data.core,
      extras: data.core.extras.map((extra, i) => (i === index ? { ...extra, ...patch } : extra)),
    });

  const dropAsset = async (asset) => {
    await removeAsset(asset.id).catch(() => {});
    setData((prev) => ({ ...prev, assets: prev.assets.filter((item) => item.id !== asset.id) }));
  };

  const setNote = (index, note) =>
    setData((prev) => ({
      ...prev,
      stats: prev.stats.map((row, i) => (i === index ? { ...row, note } : row)),
    }));

  const setLevel = (index, level) =>
    setData((prev) => ({
      ...prev,
      stats: prev.stats.map((row, i) => (i === index ? { ...row, level } : row)),
    }));

  if (!data) {
    return (
      <div className="min-h-screen bg-[#1b2233]">
        <DashboardNav active="Creators’ Hub" />
        <p className="p-10 text-center font-ui text-base text-neutral-300">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav active="Creators’ Hub" />

      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-10">
        <div className="mx-auto w-full max-w-[640px] lg:max-w-none">
          {/* Header: who made it, visibility, and the (coming) challenge */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <p className="min-w-0 truncate font-ui text-lg text-white sm:text-2xl">
              <span className="italic">Created by:</span>{" "}
              <span className="font-bold">{data.creator}</span>
            </p>
            <div className="flex items-center justify-between gap-4 lg:justify-end">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={data.visibility === "public"}
                    aria-label="Show this character on Discover"
                    onClick={() =>
                      setField("visibility")(data.visibility === "public" ? "private" : "public")
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      data.visibility === "public" ? "bg-[#3ecf6a]" : "bg-[#3a4358]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                        data.visibility === "public" ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                  <span className="w-[52px] font-ui text-sm font-bold text-white">
                    {data.visibility === "public" ? "Public" : "Private"}
                  </span>
                </div>
                <span aria-live="polite" className="hidden font-ui text-xs text-neutral-400 sm:inline">
                  {problem
                  ? problem
                  : savedAt
                    ? `Saved ${savedAt.toLocaleTimeString()}`
                    : "Changes save automatically"}
                </span>
              </div>
              {/* The badge sits over the button so it's clear what's coming */}
              <div className="relative shrink-0 pt-2">
                <span className="absolute -top-0.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 font-ui text-[11px] font-bold text-white shadow-md">
                  Coming soon
                </span>
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-5 py-2.5 font-ui text-sm font-bold text-white opacity-70 sm:text-base"
                >
                  Challenge
                </button>
              </div>
            </div>
          </div>

          {/* One file picker behind both background buttons */}
          <input
            ref={bannerInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadImage(file, "banners").then(setField("banner")).catch(() => {});
              event.target.value = "";
            }}
          />

          {/* ---- Phones & tablets: card, then the story card ---- */}
          <div className="mt-8 flex flex-col gap-10 lg:hidden">
            <SectionPill>Characters</SectionPill>
            <Stacked className="mx-auto">
              <CharacterCard alias={data.alias} power={data.power} cover={data.cover} showViewMore />
            </Stacked>

            <section
              aria-label="Origin story"
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#222b3c]"
            >
              <img
                src={data.banner || mobileBanner}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-full object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-[#1b2233]/70" />

              <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                {data.banner && (
                  <button
                    type="button"
                    onClick={() => setField("banner")(null)}
                    className="rounded-full bg-black/55 px-3 py-1.5 font-ui text-xs font-bold text-white backdrop-blur hover:bg-black/75"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => bannerInput.current?.click()}
                  aria-label="Change background"
                  className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 font-ui text-xs font-bold text-white backdrop-blur hover:bg-black/75"
                >
                  <ImageIcon />
                  <span className="hidden sm:inline">Change background</span>
                </button>
              </div>

              <div className="relative flex flex-col items-center px-5 pb-12 pt-14 text-center">
                <img src={flameBright} alt="" aria-hidden="true" className="h-12 w-auto" />

                <div className="mt-4 flex flex-wrap items-center justify-center">
                  <EditableText
                    value={data.alias}
                    onChange={setField("alias")}
                    label="character name"
                    placeholder="Character name"
                    className="!w-auto !px-2 !py-1 text-center font-ui text-2xl font-medium text-white"
                    inputClassName="text-center text-xl"
                  />
                  <span aria-hidden="true" className="font-ui text-2xl text-white">
                    —
                  </span>
                  <EditableText
                    value={data.realm}
                    onChange={setField("realm")}
                    label="universe"
                    placeholder="Their universe"
                    className="!w-auto !px-2 !py-1 text-center font-ui text-2xl font-medium text-white"
                    inputClassName="text-center text-xl"
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-center">
                  <span className="font-ui text-base font-bold text-white">Tagline —</span>
                  <EditableText
                    value={data.tagline}
                    onChange={setField("tagline")}
                    label="tagline"
                    placeholder="Add a tagline"
                    className="!w-auto !px-2 !py-1 text-center font-ui text-base font-bold text-white"
                    inputClassName="text-center text-base"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStoryOpen((open) => !open)}
                  aria-expanded={storyOpen}
                  className="mt-5 font-ui text-base font-bold text-[#6b8ff5] hover:underline"
                >
                  Origin Backstory
                </button>

                {storyOpen && (
                  <EditableText
                    value={data.backstory}
                    onChange={setField("backstory")}
                    label="origin story"
                    placeholder="Tell their story"
                    multiline
                    className="mt-3 bg-black/25 text-left font-ui text-sm leading-relaxed text-white"
                    inputClassName="text-sm leading-relaxed"
                  />
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
              src={data.banner || heroBanner}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 h-full w-[62%] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#222b3c] via-[#222b3c]/95 to-[#222b3c]/10" />

            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
              {data.banner && (
                <button
                  type="button"
                  onClick={() => setField("banner")(null)}
                  className="rounded-full bg-black/55 px-3 py-1.5 font-ui text-xs font-bold text-white backdrop-blur hover:bg-black/75"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => bannerInput.current?.click()}
                className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 font-ui text-xs font-bold text-white backdrop-blur hover:bg-black/75"
              >
                <ImageIcon />
                Change background
              </button>
            </div>

            <div className="relative flex flex-row gap-6 p-6">
              <CharacterCard alias={data.alias} power={data.power} cover={data.cover} showViewMore />

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:gap-4">
                  <div className="flex min-w-0 flex-1 items-start">
                    <EditableText
                      value={data.alias}
                      onChange={setField("alias")}
                      label="character name"
                      placeholder="Character name"
                      className="!w-auto shrink-0 !px-2 font-ui text-lg font-bold text-white"
                      inputClassName="text-lg font-bold"
                    />
                    <span aria-hidden="true" className="shrink-0 py-2.5 font-ui text-lg font-bold text-white">
                      —
                    </span>
                    <EditableText
                      value={data.realm}
                      onChange={setField("realm")}
                      label="universe"
                      placeholder="Their universe"
                      className="!w-auto min-w-0 break-words !px-2 font-ui text-lg font-bold text-white"
                      inputClassName="text-lg font-bold"
                    />
                  </div>
                  <div className="flex min-w-0 items-start xl:max-w-[45%] xl:shrink-0">
                    <span className="shrink-0 py-2.5 pl-2 font-ui text-lg font-bold text-white">
                      Tagline <span aria-hidden="true">—</span>
                    </span>
                    <EditableText
                      value={data.tagline}
                      onChange={setField("tagline")}
                      label="tagline"
                      placeholder="Add a tagline"
                      className="!w-auto min-w-0 break-words !px-2 font-ui text-lg font-bold text-white"
                      inputClassName="text-lg font-bold"
                    />
                  </div>
                </div>

                <p className="mt-3 flex items-center gap-2 px-4 font-ui text-lg font-bold text-[#4ea1ff]">
                  Origin Story <span aria-hidden="true">🥇🎖️</span>
                </p>

                <EditableText
                  value={data.backstory}
                  onChange={setField("backstory")}
                  label="origin story"
                  placeholder="Tell their story"
                  multiline
                  className="mt-1 font-ui text-sm leading-relaxed text-white"
                  inputClassName="text-sm leading-relaxed"
                />
              </div>
            </div>
          </section>

          {/* Assets: empty state until something is uploaded, then a scrolling row */}
          <section aria-label="Assets" className="mt-12 flex flex-col gap-8 lg:mt-5 lg:block">
            <SectionPill>Assets</SectionPill>
            {data.assets.length === 0 && !uploading ? (
              <Stacked className="mx-auto w-full max-w-[420px] lg:max-w-none">
                <div className="flex min-h-[260px] flex-col items-center justify-center gap-6 rounded-[26px] border border-white/10 bg-[#222b3c] px-6 py-10 text-center">
                  <p className="max-w-[240px] font-ui text-base text-[#6b8ff5]">
                    Nothing to show here. Start by uploading your first assets here.
                  </p>
                  <button
                    type="button"
                    onClick={() => assetInput.current?.click()}
                    className="flex items-center gap-2 rounded-full border border-white/70 px-6 py-2.5 font-ui text-base font-bold text-white hover:bg-white/10"
                  >
                    <span aria-hidden="true" className="text-lg leading-none">+</span> Upload
                  </button>
                </div>
              </Stacked>
            ) : null}
            {uploading && (
              <p aria-live="polite" className="font-ui text-base text-[#6b8ff5]">
                Uploading {uploading.done} of {uploading.total}…
              </p>
            )}

            <div className={`grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${data.assets.length || uploading ? "grid" : "hidden"}`}>
              {data.assets.map((asset, index) => (
                <div
                  key={asset.id}
                  className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#222b3c]"
                >
                  <img src={asset.url} alt={`Asset ${index + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => dropAsset(asset)}
                    aria-label={`Remove asset ${index + 1}`}
                    className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/60 font-ui text-lg text-white hover:bg-black/80"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* One placeholder per picture still uploading */}
              {uploading &&
                Array.from({ length: uploading.total - uploading.done }).map((_, index) => (
                  <div
                    key={`pending-${index}`}
                    className="flex aspect-[3/4] animate-pulse items-center justify-center rounded-2xl bg-[#222b3c] font-ui text-sm text-neutral-400"
                  >
                    Uploading…
                  </div>
                ))}

              <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-dashed border-white/20 bg-[#222b3c]/60 p-3">
                <button
                  type="button"
                  disabled={Boolean(uploading)}
                  onClick={() => assetInput.current?.click()}
                  className="flex items-center gap-2 rounded-full border border-white/70 px-4 py-2.5 text-center font-ui text-sm text-white hover:bg-white/10 disabled:opacity-50 sm:text-base"
                >
                  <img src={sword} alt="" className="size-5" />
                  Add Assets
                </button>
                <input
                  ref={assetInput}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files?.length) addAssets(event.target.files);
                    event.target.value = "";
                  }}
                />
              </div>
            </div>
          </section>

          {/* Abilities */}
          <div className="mt-12 lg:hidden">
            <SectionPill>Strength &amp; Weakness</SectionPill>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5 lg:mt-5 lg:grid-cols-[1.1fr_1fr_1fr]">
            <AbilityPanel
              title="Core Ability"
              value={data.core}
              onChange={setField("core")}
              highlight
              hideDescription={openExtra !== null}
            >
              <div className="flex flex-col gap-3">
                {data.core.extras.map((extra, index) => {
                  const open = openExtra === index;
                  return (
                    <div key={index} className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenExtra(open ? null : index)}
                        aria-expanded={open}
                        className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left font-ui text-base font-bold text-white transition-colors ${
                          open ? "bg-white/25" : "bg-white/15 hover:bg-white/20"
                        }`}
                      >
                        <span aria-hidden="true" className="text-lg text-[#ff8fc7]">
                          ✦
                        </span>
                        <span className="min-w-0 flex-1">{extra.name || "Unnamed ability"}</span>
                        <Chevron open={open} />
                      </button>

                      {open && (
                        <div className="flex flex-col gap-2 pl-8">
                          <EditableText
                            value={extra.name}
                            onChange={(name) => setExtra(index, { name })}
                            placeholder="Enter name of ability"
                            label={`extra ability ${index + 1} name`}
                            className="bg-white/10 font-ui text-sm font-bold text-white"
                            inputClassName="text-sm font-bold"
                          />
                          <EditableText
                            value={extra.description}
                            onChange={(description) => setExtra(index, { description })}
                            placeholder="Describe this ability"
                            label={`extra ability ${index + 1} description`}
                            multiline
                            className="min-h-[72px] bg-white/5 font-ui text-sm text-neutral-200"
                            inputClassName="text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setField("core")({
                      ...data.core,
                      extras: [...data.core.extras, { name: "", description: "" }],
                    });
                    setOpenExtra(data.core.extras.length);
                  }}
                  className="self-start px-4 font-ui text-sm font-bold text-white/90 underline"
                >
                  + Add another ability
                </button>
              </div>
            </AbilityPanel>

            <AbilityPanel
              title="Signature Move"
              value={data.signature}
              onChange={setField("signature")}
              flame={flameBright}
            />

            <AbilityPanel title="Weakness" value={data.weakness} onChange={setField("weakness")} />
          </div>

          {/* Alignment + stats */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_2.6fr]">
            <AbilityPanel
              title="Alignment"
              value={data.alignment}
              onChange={setField("alignment")}
              flame={flameSoft}
            />

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
                    {data.stats.map((row, index) => (
                      <tr key={row.attribute} className="border-t border-white/10">
                        <td className="py-3 pr-4">{row.attribute}</td>
                        <td className="py-3 pr-4">
                          <label className="sr-only" htmlFor={`level-${index}`}>
                            {row.attribute} level
                          </label>
                          <select
                            id={`level-${index}`}
                            value={row.level}
                            onChange={(event) => setLevel(index, Number(event.target.value))}
                            className="cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 font-ui text-sm font-bold text-white outline-none hover:bg-white/20 focus:ring-2 focus:ring-[#6b8ff5]"
                          >
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                              <option key={level} value={level} className="bg-[#222b3c]">
                                {level}/10
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5">
                          <EditableText
                            value={row.note}
                            onChange={(note) => setNote(index, note)}
                            label={`${row.attribute} note`}
                            placeholder="Add a note"
                            className="font-ui text-sm font-bold text-white"
                            inputClassName="text-sm font-bold"
                          />
                        </td>
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
