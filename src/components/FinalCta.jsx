import { Link } from "react-router-dom";
import background from "../assets/landing/cta/final-cta-bg.webp";

export default function FinalCta() {
  return (
    <section
      id="start"
      className="relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden bg-black px-4 py-[70px] text-center"
    >
      <img
        src={background}
        alt=""
        loading="lazy"
        className="absolute inset-0 size-full object-cover object-[center_12%] opacity-50"
      />

      <div className="relative flex max-w-[900px] flex-col items-center gap-6">
        <h2 className="font-display text-4xl text-white sm:text-[56px]">
          Your Characters. Your Realm. One Link.
        </h2>
        <p className="font-ui text-lg text-white sm:text-2xl">
          Create your Realm, showcase your characters, and give your audience one place to discover
          your work.
        </p>
        <Link
          to="/auth"
          className="mt-2 rounded-[44px] border-[3px] border-[#c687ff] bg-secondary px-12 py-4 font-pill text-xl font-bold text-white transition-opacity hover:opacity-90"
        >
          Create Your Realm
        </Link>
      </div>
    </section>
  );
}
