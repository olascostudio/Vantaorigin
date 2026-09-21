import { Link } from "react-router-dom";
import SectionHeading from "./SectionHeading";
import cardFrame from "../assets/creator/card-frame.svg";
import characterCover from "../assets/creator/character-cover.svg";
import sword from "../assets/creator/sword.svg";

// A trimmed-down preview of a real character profile, so visitors can see what
// they get before signing up.
const DETAILS = [
  { label: "Core Ability", value: "Facial & Form Morphing Illusion" },
  { label: "Signature Move", value: "Mirror Shatter Pulse" },
  { label: "Alignment", value: "Chaotic Neutral" },
];

const STATS = [
  ["Attack", 6],
  ["Speed", 8],
  ["Intelligence", 10],
];

export default function CharacterShowcase() {
  return (
    <section id="characters" className="px-4 py-[61px] sm:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-[50px]">
        <SectionHeading
          title="Give Every Character A Home"
          subtitle="Create dedicated profiles for your characters and give your audience a place to learn about them, explore their artwork, and discover the world around them."
        />

        <div className="flex w-full flex-col items-center gap-10 rounded-[32px] bg-[#222b3c] p-6 lg:flex-row lg:items-stretch lg:p-10">
          {/* The character card */}
          <div className="relative w-[260px] shrink-0 sm:w-[300px]">
            <img src={cardFrame} alt="" className="w-full" />
            <div className="absolute inset-[4%] overflow-hidden rounded-[22px]">
              <img src={characterCover} alt="Switch Face" className="size-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-black/85 to-transparent px-4 pb-6 pt-14">
                <p className="font-ui text-2xl font-black text-white">Switch Face</p>
                <p className="flex items-center gap-2 font-ui text-base font-bold text-white">
                  <img src={sword} alt="" className="size-4" />
                  1.3M
                </p>
              </div>
            </div>
          </div>

          {/* What the profile holds */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <div>
              <p className="font-ui text-lg font-bold text-[#4ea1ff]">Character Profile</p>
              <p className="mt-2 font-ui text-base leading-relaxed text-neutral-200">
                Artwork, abilities, stats and links live on one page — yours to edit any time, and
                ready for your audience to read.
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {DETAILS.map(({ label, value }) => (
                <li key={label} className="rounded-xl bg-[#2b3547] px-5 py-3">
                  <p className="font-ui text-sm text-[#6b8ff5]">{label}</p>
                  <p className="font-ui text-base font-bold text-white">{value}</p>
                </li>
              ))}
            </ul>

            <div className="rounded-xl bg-[#2b3547] px-5 py-4">
              <p className="font-ui text-sm text-[#5fdc8a]">Character Stats</p>
              <ul className="mt-3 flex flex-col gap-3">
                {STATS.map(([label, level]) => (
                  <li key={label} className="flex items-center gap-4">
                    <span className="w-[110px] shrink-0 font-ui text-sm font-bold text-white">
                      {label}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7]"
                        style={{ width: `${level * 10}%` }}
                      />
                    </span>
                    <span className="w-12 shrink-0 text-right font-ui text-sm text-neutral-300">
                      {level}/10
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/character"
              className="self-start rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-8 py-3 font-ui text-base font-bold text-white hover:opacity-90"
            >
              See a character profile
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
