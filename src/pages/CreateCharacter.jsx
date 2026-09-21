import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import { PrivacyModal, SuccessModal } from "../components/creator/CharacterModals";
import characterCover from "../assets/creator/character-cover.svg";
import studioCard1 from "../assets/creator/studio-card-1.webp";
import studioCard2 from "../assets/creator/studio-card-2.webp";
import studioCard3 from "../assets/creator/studio-card-3.webp";

const REALMS = ["Marvel Universe", "My Own World", "The Vantaverse", "Obaalu", "Iyanu", "Urukojin", "Eganon"];

function BackHome() {
  return (
    <Link
      to="/creators-hub"
      className="flex items-center gap-3 font-ui text-lg text-white transition-opacity hover:opacity-80"
    >
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back home
    </Link>
  );
}

function IdentityStep({ identity, setIdentity, onNext }) {
  return (
    <div className="mx-auto max-w-[740px] px-6 pb-24">
      <div className="rounded-2xl border border-white/10 bg-[#252e40] px-6 py-10 sm:px-12">
        <h1 className="text-center font-ui text-2xl font-bold text-white sm:text-[28px]">
          Every legend starts with an identity.
        </h1>

        <div aria-hidden="true" className="mt-3 flex items-center justify-center gap-1.5">
          <span className="h-1 w-2 rounded-full bg-[#6b8ff5]" />
          <span className="h-1 w-8 rounded-full bg-[#6b8ff5]" />
          <span className="size-1 rounded-full bg-[#6b8ff5]" />
          <span className="size-1 rounded-full bg-[#6b8ff5]" />
        </div>

        <p className="mx-auto mt-5 max-w-[470px] text-center font-ui text-base leading-relaxed text-neutral-200">
          Define who they are, where they come from, and what drives them. Your character’s identity
          is the foundation everything else is built on.
        </p>

        <hr className="my-8 border-white/10" />

        <h2 className="text-center font-ui text-2xl font-bold text-white">Forge Their Identity</h2>

        <label className="sr-only" htmlFor="identity">
          Character identity
        </label>
        <div className="relative mt-6">
          <svg
            viewBox="0 0 24 24"
            className="absolute left-5 top-1/2 size-5 -translate-y-1/2 text-[#6b8ff5]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5M9 13h6M9 17h6" />
          </svg>
          <input
            id="identity"
            value={identity}
            onChange={(event) => setIdentity(event.target.value)}
            placeholder="Sub Xero"
            className="h-[70px] w-full rounded-xl border border-[#6b8ff5] bg-[#2b3547] pl-14 pr-6 font-ui text-lg text-white outline-none placeholder:text-neutral-300 focus:ring-2 focus:ring-[#6b8ff5]"
          />
        </div>

        <hr className="my-8 border-white/10" />

        <h2 className="text-center font-ui text-2xl font-bold text-white">
          Bring your characters to life
        </h2>

        <div className="relative mt-6 overflow-hidden rounded-xl bg-gradient-to-r from-[#7b3fe4] to-[#4f46e5] p-6">
          <div className="max-w-[300px]">
            <h3 className="font-ui text-xl font-bold text-white">Visit VantaOrigin Studios.</h3>
            <p className="mt-2 font-ui text-xs leading-relaxed text-white/90">
              Your character has a specific energy, we get that. Browse our style catalog, pick what
              fits, and connect directly with Vanta-verified artists who know how to bring it to
              life. Every contract is bound to deliver, every price is set. No surprises, just
              results.
            </p>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-2 right-4 hidden items-end gap-2 sm:flex">
            <img src={studioCard1} alt="" className="h-[121px] w-[129px] -rotate-6" />
            <img src={studioCard2} alt="" className="h-[121px] w-[129px]" />
            <img src={studioCard3} alt="" className="h-[121px] w-[128px] rotate-6" />
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-3 rounded-full bg-[#2f86e8] px-10 py-3.5 font-ui text-lg font-bold text-white transition-opacity hover:opacity-90"
        >
          Let’s Go
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function DetailsStep({ form, setForm, cover, setCover, onSubmit }) {
  const fileRef = useRef(null);
  const field =
    "w-full rounded-xl border border-white/15 bg-[#2b3547] px-6 font-ui text-lg text-white outline-none placeholder:text-neutral-400 focus:border-[#6b8ff5]";

  return (
    <form
      className="mx-auto flex max-w-[1240px] flex-col gap-10 px-6 pb-24 lg:flex-row lg:gap-16"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex shrink-0 flex-col items-center gap-5 lg:items-start">
        <div className="relative h-[250px] w-[191px] overflow-hidden rounded-xl bg-white p-1.5 shadow-lg">
          <img src={cover} alt="Character cover" className="size-full rounded-lg object-cover" />
          <span className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-1.5 font-ui text-sm font-bold text-white">
            View preview
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z" />
            </svg>
          </span>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-[205px] items-center justify-center gap-3 rounded-full border-2 border-white py-3 font-ui text-base font-bold text-white hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Upload Cover
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setCover(URL.createObjectURL(file));
            event.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => setCover(characterCover)}
          className="flex w-[160px] items-center justify-center gap-3 rounded-full border-2 border-[#f2415f] py-3 font-ui text-base font-bold text-[#f2415f] hover:bg-[#f2415f]/10"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Remove
        </button>
      </div>

      <div className="flex-1">
        <label className="mb-3 block font-ui text-xl font-bold text-white" htmlFor="name">
          Character Name
        </label>
        <input
          id="name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Enter character name"
          required
          className={`${field} h-[60px] border-[#6b8ff5] shadow-[0_0_0_4px_rgba(107,143,245,0.15)]`}
        />

        <label className="mb-3 mt-8 block font-ui text-xl font-bold text-white" htmlFor="origin">
          Character Origin
        </label>
        <textarea
          id="origin"
          value={form.origin}
          onChange={(event) => setForm({ ...form, origin: event.target.value })}
          placeholder="Tell us more of what that inspired your character"
          rows={6}
          className={`${field} py-6 text-center placeholder:text-center`}
        />

        <div className="mb-3 mt-8 flex items-center justify-between gap-4">
          <label className="block font-ui text-xl font-bold text-white" htmlFor="realm">
            Which realm do they belong to?
          </label>
          <span className="rounded-full bg-primary px-3 py-0.5 font-ui text-xs font-bold text-white">
            New
          </span>
        </div>
        <select
          id="realm"
          value={form.realm}
          onChange={(event) => setForm({ ...form, realm: event.target.value })}
          className={`${field} h-[60px] appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:24px] bg-[right_1.5rem_center] bg-no-repeat pr-14`}
        >
          <option value="">Marvel Universe, My Own World, The Vantaverse...</option>
          {REALMS.map((realm) => (
            <option key={realm} value={realm}>
              {realm}
            </option>
          ))}
        </select>

        <label className="mb-3 mt-8 block font-ui text-xl font-bold text-white" htmlFor="tagline">
          Tagline
        </label>
        <input
          id="tagline"
          value={form.tagline}
          onChange={(event) => setForm({ ...form, tagline: event.target.value })}
          placeholder="Enter tagline"
          className={`${field} h-[60px]`}
        />

        <label className="mb-3 mt-8 block font-ui text-xl font-bold text-white" htmlFor="creator">
          Creator’s name
        </label>
        <input
          id="creator"
          value={form.creator}
          onChange={(event) => setForm({ ...form, creator: event.target.value })}
          placeholder="Enter name"
          className={`${field} h-[60px]`}
        />

        <div className="mt-10 flex justify-center">
          <button
            type="submit"
            className="flex items-center gap-3 rounded-full bg-gradient-to-r from-[#c2185b] to-[#4f46e5] px-14 py-4 font-ui text-xl font-bold text-white transition-opacity hover:opacity-90"
          >
            Create Character
            <span aria-hidden="true">✦</span>
          </button>
        </div>
      </div>
    </form>
  );
}

export default function CreateCharacter() {
  const navigate = useNavigate();
  const [step, setStep] = useState("identity");
  const [identity, setIdentity] = useState("");
  const [cover, setCover] = useState(characterCover);
  const [form, setForm] = useState({ name: "", origin: "", realm: "", tagline: "", creator: "" });
  const [modal, setModal] = useState(null); // "privacy" | "success"

  return (
    <div className="min-h-screen bg-[#1b2233]">
      <DashboardNav active="Creators’ Hub" />

      <div className="mx-auto max-w-[1620px] px-6 py-10 lg:px-12">
        <BackHome />
      </div>

      {step === "identity" ? (
        <IdentityStep
          identity={identity}
          setIdentity={setIdentity}
          onNext={() => setStep("details")}
        />
      ) : (
        <DetailsStep
          form={form}
          setForm={setForm}
          cover={cover}
          setCover={setCover}
          onSubmit={() => setModal("privacy")}
        />
      )}

      <PrivacyModal
        open={modal === "privacy"}
        onClose={() => setModal(null)}
        onSave={() => setModal("success")}
      />

      <SuccessModal
        open={modal === "success"}
        character={{
          name: form.name || identity,
          origin: form.origin,
          cover,
        }}
        onClose={() => navigate("/creators-hub")}
        onAddMore={() => navigate("/creators-hub/character/profile")}
      />
    </div>
  );
}
