import background from "../assets/landing/cta/create-together-bg.webp";

const PILL =
  "flex w-[254px] items-center justify-center overflow-hidden whitespace-nowrap rounded-[44px] border-[3px] py-[15px] font-pill text-xl font-bold text-white transition-opacity hover:opacity-90";

export default function CreateTogether() {
  return (
    <section
      id="community"
      className="relative flex min-h-[400px] flex-col items-center overflow-hidden bg-black px-4 pb-[50px] pt-[62px] text-center text-white"
    >
      <img
        src={background}
        alt=""
        loading="lazy"
        className="absolute inset-0 size-full object-cover object-[center_12%] opacity-50"
      />

      <div className="relative flex max-w-[900px] flex-col items-center gap-[50px]">
        <h2 className="font-display text-5xl [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] [text-shadow:0_2.8px_2.8px_rgba(0,0,0,0.25)] sm:text-[64.413px]">
          Create Together
        </h2>
        <p className="font-ui text-xl font-medium [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] sm:text-[25px]">
          No great universe is built alone. Collaborate with artists, writers, worldbuilders and
          fans to expand your stories together.
        </p>
      </div>

      <div className="relative mt-auto flex flex-wrap justify-center gap-6 pt-10 sm:gap-10">
        <a href="#explore" className={`${PILL} border-[#c687ff] bg-secondary`}>
          Browse Community
        </a>
        <a href="#" className={`${PILL} border-[#efefef] bg-background/50`}>
          Join Discord
        </a>
      </div>
    </section>
  );
}
