import { useState } from "react";
import characterCover from "../../assets/creator/character-cover.svg";

function Overlay({ children, onClose, label }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-md"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={label} className="w-full max-w-[740px]">
        {children}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 py-4">
      <span className="font-ui text-xl font-bold text-white sm:text-2xl">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-[60px] shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#3ecf6a]" : "bg-[#1b2333]"
        }`}
      >
        <span
          className={`absolute top-1 size-6 rounded-full transition-all ${
            checked ? "left-8 bg-white" : "left-1 bg-[#6b8ff5]"
          }`}
        />
      </button>
    </label>
  );
}

export function PrivacyModal({ open, onClose, onSave }) {
  const [isPrivate, setIsPrivate] = useState(true);
  const [agreed, setAgreed] = useState(false);

  if (!open) return null;

  return (
    <Overlay onClose={onClose} label="Character visibility">
      <div className="rounded-2xl bg-[#2b3547] px-6 py-10 sm:px-14">
        <h2 className="mx-auto max-w-[520px] text-center font-ui text-2xl font-bold leading-snug text-white sm:text-[26px]">
          Would you like to keep this character private or publish it publicly so it can appear on
          the Discovery page?
        </h2>

        <div className="mt-10 divide-y divide-white/10 rounded-2xl border border-white/20 px-6">
          <Toggle label="Keep Private" checked={isPrivate} onChange={() => setIsPrivate(true)} />
          <Toggle label="Make Public" checked={!isPrivate} onChange={() => setIsPrivate(false)} />
        </div>

        <label className="mt-6 flex items-center justify-center gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="size-5 shrink-0 cursor-pointer appearance-none rounded border-2 border-[#6b8ff5] checked:bg-[#6b8ff5]"
          />
          <span className="font-ui text-base font-medium text-white">
            I have read and agree with{" "}
            <a href="#guidelines" className="font-bold text-[#a855f7] hover:underline">
              Community Guidelines
            </a>
          </span>
        </label>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-white px-10 py-3 font-ui text-lg font-bold text-white hover:bg-white/10"
          >
            Go Back
          </button>
          <button
            type="button"
            disabled={!agreed}
            onClick={() => onSave({ visibility: isPrivate ? "private" : "public" })}
            className={`flex items-center gap-3 rounded-full px-10 py-3 font-ui text-lg font-bold text-white transition-opacity ${
              agreed ? "bg-gradient-to-r from-[#7b3fe4] to-[#a855f7] hover:opacity-90" : "cursor-not-allowed bg-[#4a5168]"
            }`}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            Save Character
          </button>
        </div>
      </div>
    </Overlay>
  );
}

export function SuccessModal({ open, character, onClose, onAddMore }) {
  if (!open) return null;

  return (
    <Overlay onClose={onClose} label="Character created">
      <div className="mx-auto flex w-full max-w-[1000px] overflow-hidden rounded-2xl bg-[#2b3547]">
        <div className="flex-1 px-6 py-8 sm:px-10">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-full border border-[#6b8ff5] font-ui text-sm text-[#6b8ff5] hover:bg-white/10"
          >
            ×
          </button>

          <p className="mt-6 text-center font-ui text-lg font-medium text-[#7ddc7d]">
            Yay!! You introduced a new identity!!
          </p>

          <p className="mt-6 text-center text-3xl" aria-hidden="true">
            📖
          </p>

          <h2 className="mt-4 text-center font-ui text-2xl font-bold text-white">
            {character?.name || "Iyanu-Etere: The Song Beneath the Waves"}
          </h2>

          <p className="mx-auto mt-8 max-w-[400px] text-center font-ui text-base leading-relaxed text-white">
            {character?.origin || (
              <>
                <span className="font-bold">
                  In the depths of the shifting seas, where silence hums with ancient power,
                  Iyanu-Etere reigns
                </span>{" "}
                — a being born from the heart of the primordial tides. Her every movement ripples
                across oceans, shaping storms, calming chaos, and awakening forgotten spirits.
              </>
            )}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-8 pb-4">
            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-[#7b3fe4] to-[#e0208c] px-12 py-3 font-ui text-lg font-bold text-white hover:opacity-90"
            >
              Share
            </button>
            <button
              type="button"
              onClick={onAddMore}
              className="rounded-full bg-gradient-to-r from-[#7b3fe4] to-[#e0208c] px-10 py-3 font-ui text-lg font-bold text-white hover:opacity-90"
            >
              Add More Info
            </button>
          </div>
        </div>

        <img
          src={character?.cover || characterCover}
          alt=""
          className="hidden w-[422px] shrink-0 object-cover lg:block"
        />
      </div>
    </Overlay>
  );
}
