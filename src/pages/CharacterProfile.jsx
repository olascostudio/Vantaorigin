import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import CharacterCard from "../components/creator/CharacterCard";
import { loadCharacter, readImage, saveCharacter } from "../data/character";
import EditableText from "../components/creator/EditableText";
import heroBanner from "../assets/creator/hero-banner.webp";
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
  const [data, setData] = useState(() => loadCharacter(params.get("id")));
  const [savedAt, setSavedAt] = useState(null);
  const lastSaved = useRef(JSON.stringify(data));

  // Only the creator's own characters can be edited; the sample can't.
  useEffect(() => {
    if (!data.id) navigate("/creators-hub", { replace: true, state: { tab: "Character" } });
  }, [data.id, navigate]);
  const assetInput = useRef(null);
  const bannerInput = useRef(null);
  // Which extra core ability is expanded; null shows the main ability's description.
  const [openExtra, setOpenExtra] = useState(null);

  // Auto-save: everything on this page persists as it is edited.
  useEffect(() => {
    const serialised = JSON.stringify(data);
    if (serialised === lastSaved.current) return undefined;
    lastSaved.current = serialised;
    const id = setTimeout(() => {
      if (saveCharacter(data)) setSavedAt(new Date());
    }, 600);
    return () => clearTimeout(id);
  }, [data]);

  const setField = (key) => (value) => setData((prev) => ({ ...prev, [key]: value }));

  // Stored as data URLs so they survive a reload.
  const addAssets = async (files) => {
    const urls = await Promise.all([...files].map((file) => readImage(file, 1200).catch(() => null)));
    setData((prev) => ({ ...prev, assets: [...prev.assets, ...urls.filter(Boolean)] }));
  };

  const setExtra = (index, patch) =>
    setField("core")({
      ...data.core,
      extras: data.core.extras.map((extra, i) => (i === index ? { ...extra, ...patch } : extra)),
    });

  const removeAsset = (index) =>
    setData((prev) => ({ ...prev, assets: prev.assets.filter((_, i) => i !== index) }));

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

  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav active="Creators’ Hub" />

      {/* On phones the whole profile sits inside a character-card frame. */}
      <div className="px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
        <div className="mx-auto w-full max-w-[420px] rounded-[28px] border-2 border-[#eec340]/60 bg-[#1e2637] p-3 shadow-[0_0_40px_rgba(238,195,64,0.12)] sm:max-w-none sm:rounded-2xl sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-ui text-xl text-white sm:text-2xl">
              <span className="italic">Created by:</span>{" "}
              <span className="font-bold">{data.creator}</span>
            </p>
            <div className="flex flex-wrap items-center justify-end gap-3">
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
              <span aria-live="polite" className="font-ui text-xs text-neutral-400">
                {savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : "Changes save automatically"}
              </span>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-full bg-primary px-3 py-0.5 font-ui text-xs font-bold text-white">
                  Coming soon
                </span>
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-6 py-2 font-ui text-base font-bold text-white opacity-60"
                >
                  Challenge
                </button>
              </div>
            </div>
          </div>

          {/* Hero: card + backstory */}
          <section className="relative mt-5 overflow-hidden rounded-2xl bg-[#222b3c]">
            <img
              src={data.banner || heroBanner}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 hidden h-full w-[62%] object-cover lg:block"
            />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-[#222b3c] via-[#222b3c]/95 to-[#222b3c]/10 lg:block" />

            {/* The background only shows on wide screens, so the control does too. */}
            <div className="absolute bottom-3 right-3 z-10 hidden items-center gap-2 lg:flex">
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
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="9" cy="10" r="1.5" />
                  <path d="M21 16l-5-5-8 8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Change background
              </button>
              <input
                ref={bannerInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) readImage(file, 1600).then(setField("banner")).catch(() => {});
                  event.target.value = "";
                }}
              />
            </div>

            <div className="relative flex flex-col gap-6 p-4 lg:flex-row lg:p-6">
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

          {/* Assets: a scrolling row that always ends with the add tile */}
          <section aria-label="Assets" className="mt-5">
            <div className="scrollbar-none flex snap-x gap-5 overflow-x-auto pb-2">
              {data.assets.map((asset, index) => (
                <div
                  key={asset}
                  className="relative h-[260px] w-[270px] shrink-0 snap-start overflow-hidden rounded-2xl bg-[#222b3c] sm:h-[400px] sm:w-[320px]"
                >
                  <img src={asset} alt={`Asset ${index + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeAsset(index)}
                    aria-label={`Remove asset ${index + 1}`}
                    className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/60 font-ui text-lg text-white hover:bg-black/80"
                  >
                    ×
                  </button>
                </div>
              ))}

              <div className="flex h-[260px] w-[270px] shrink-0 snap-start items-center justify-center rounded-2xl bg-[#222b3c] sm:h-[400px] sm:w-[320px]">
                <button
                  type="button"
                  onClick={() => assetInput.current?.click()}
                  className="flex items-center gap-2 rounded-full border border-white/70 px-5 py-2.5 font-ui text-base text-white hover:bg-white/10"
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
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr_1fr]">
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

            <section className="overflow-hidden rounded-2xl bg-[#222b3c] p-5">
              <h2 className="font-ui text-lg font-bold text-[#6b8ff5]">Character Stats</h2>

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
