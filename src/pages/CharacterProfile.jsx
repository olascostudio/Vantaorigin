import { useEffect, useRef, useState } from "react";
import DashboardNav from "../components/DashboardNav";
import CharacterCard from "../components/creator/CharacterCard";
import { loadCharacter, saveCharacter } from "../data/character";
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
function AbilityPanel({ title, value, onChange, highlight, flame, defaultOpen = true, children }) {
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
          <EditableText
            value={value.description}
            onChange={(description) => onChange({ ...value, description })}
            placeholder="Describe ability"
            label={`${title} description`}
            multiline
            className="min-h-[92px] bg-white/5 font-ui text-base text-neutral-200"
            inputClassName="text-base"
          />
          {children}
        </div>
      )}
    </section>
  );
}

export default function CharacterProfile() {
  const [data, setData] = useState(loadCharacter);
  const [savedAt, setSavedAt] = useState(null);
  const lastSaved = useRef(JSON.stringify(loadCharacter()));
  const assetInput = useRef(null);

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

  const addAssets = (files) => {
    const urls = [...files].map((file) => URL.createObjectURL(file));
    setData((prev) => ({ ...prev, assets: [...prev.assets, ...urls] }));
  };

  const removeAsset = (index) =>
    setData((prev) => ({ ...prev, assets: prev.assets.filter((_, i) => i !== index) }));

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
            <div className="flex items-center gap-3">
              <span aria-live="polite" className="font-ui text-xs text-neutral-400">
                {savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : "Changes save automatically"}
              </span>
              <button
                type="button"
                className="rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-6 py-2 font-ui text-base font-bold text-white hover:opacity-90"
              >
                Challenge
              </button>
            </div>
          </div>

          {/* Hero: card + backstory */}
          <section className="relative mt-5 overflow-hidden rounded-2xl bg-[#222b3c]">
            <img
              src={heroBanner}
              alt=""
              aria-hidden="true"
              className="absolute inset-y-0 right-0 hidden h-full w-[62%] object-cover lg:block"
            />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-[#222b3c] via-[#222b3c]/95 to-[#222b3c]/10 lg:block" />

            <div className="relative flex flex-col gap-6 p-4 lg:flex-row lg:p-6">
              <CharacterCard alias={data.alias} power={data.power} showViewMore />

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:gap-4">
                  <EditableText
                    value={data.name}
                    onChange={setField("name")}
                    label="character name"
                    placeholder="Character name"
                    className="font-ui text-lg font-bold text-white xl:max-w-[440px]"
                    inputClassName="text-lg font-bold"
                  />
                  <EditableText
                    value={data.tagline}
                    onChange={setField("tagline")}
                    label="tagline"
                    placeholder="Tagline"
                    className="font-ui text-lg font-bold text-[#5fdc8a]"
                    inputClassName="text-lg font-bold"
                  />
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
            >
              <div className="flex flex-col gap-3">
                {data.core.extras.map((extra, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span aria-hidden="true" className="font-ui text-lg text-[#ff8fc7]">
                      ✦
                    </span>
                    <EditableText
                      value={extra}
                      onChange={(next) =>
                        setField("core")({
                          ...data.core,
                          extras: data.core.extras.map((v, i) => (i === index ? next : v)),
                        })
                      }
                      placeholder="Enter name of ability"
                      label={`extra ability ${index + 1}`}
                      className="bg-white/15 font-ui text-base text-white"
                      inputClassName="text-base"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setField("core")({ ...data.core, extras: [...data.core.extras, ""] })
                  }
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
                        <td className="py-3">{row.note}</td>
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
