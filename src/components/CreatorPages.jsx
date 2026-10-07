import { Link } from "react-router-dom";
import SectionHeading from "./SectionHeading";
import hopeBreakerArt from "../assets/landing/pages/hope-breaker.webp";
import hopeBreakerSmall from "../assets/landing/pages/hope-breaker-small.webp";
import urokojinArt from "../assets/landing/pages/urokojin.webp";
import urokojinSmall from "../assets/landing/pages/urokojin-small.webp";

// The characters shown here are real ones, and each is credited to whoever
// made it -- which is not always the person running this site. Getting that
// wrong is not a typo: it takes somebody else's work and puts another name
// on it.
//
// `to` is the page a card opens. A character whose creator has no page here
// yet has none to open, and says so rather than sending people somewhere
// that does not belong to it.
const PAGES = [
  {
    id: "hope-breaker",
    name: "Hope Breaker",
    universe: "Heartline Comics",
    tagline: "Marcus Sinclair",
    body: "Conjures weapons out of Nether energy, sees the souls of the living and the dead, and opens portals into the wraith zone.",
    art: hopeBreakerArt,
    artSmall: hopeBreakerSmall,
    // Somebody else's character, shown with their name on it. There is no
    // page to open until Spif Nation has one of their own.
    to: null,
    creator: "Spif Nation",
  },
  {
    id: "urokojin",
    name: "Urokojin",
    universe: "The Vantaverse",
    tagline: "The Thunder Judge",
    body: "What was left behind when the First Chaos struck the first laws of reality. He was not made to judge; judgment became part of him.",
    art: urokojinArt,
    artSmall: urokojinSmall,
    to: "/character/urokojin",
    creator: "@Vtgshadowscribe",
  },
];

function PageCard({ name, universe, tagline, body, art, artSmall, to, creator }) {
  return (
    <article className="relative flex min-h-[520px] w-[85vw] max-w-[578.947px] shrink-0 snap-center flex-col justify-end overflow-hidden rounded-[42.105px] border-[1.053px] border-primary bg-black px-6 pb-[43px] pt-[180px] sm:h-[631.579px] sm:pl-[44px] sm:pr-[45px] lg:w-full">
      <img
        src={art}
        srcSet={`${artSmall} 640w, ${art} 900w`}
        // Nearly the full width of a phone, half a desktop.
        sizes="(max-width: 1023px) 85vw, 578px"
        alt={`Artwork of ${name}`}
        loading="lazy"
        className="absolute inset-0 size-full object-cover object-top"
      />
      {/* The writing sits over the artwork, so the artwork darkens under it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black via-black/85 via-40% to-transparent"
      />

      <p className="relative font-ui text-sm font-bold uppercase tracking-[0.18em] text-primary">
        {universe}
      </p>
      <h3 className="relative mt-3 max-w-[484.211px] font-ui text-[32px] font-black leading-[1.05] tracking-[-0.2105px] text-white sm:text-[42.105px]">
        {name}
      </h3>
      <p className="relative mt-4 max-w-[477.895px] font-ui text-lg font-medium leading-[1.5] text-white sm:text-[21.053px] sm:leading-[31.579px]">
        <span className="font-bold">{tagline}. </span>
        {body}
      </p>

      <div className="relative mt-7 flex flex-wrap items-center justify-between gap-4">
        {to ? (
          <Link
            to={to}
            className="rounded-[52.632px] bg-secondary px-[36.842px] py-[18.947px] font-ui text-[21.053px] font-bold text-white transition-opacity hover:opacity-90"
          >
            View page
          </Link>
        ) : (
          // No page of their own yet, so nothing to promise.
          <p className="rounded-[52.632px] border border-white/25 px-[30px] py-[18.947px] font-ui text-[19px] font-medium text-neutral-300">
            Page coming soon
          </p>
        )}
        <p className="whitespace-nowrap font-ui text-[21px] text-white sm:text-[24.211px]">
          <span className="font-medium">by</span> <span className="font-black">{creator}</span>
        </p>
      </div>
    </article>
  );
}

export default function CreatorPages() {
  return (
    <section id="pages" className="px-4 pb-[18px] pt-[60px] sm:px-8 xl:px-[117px]">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-[65px]">
        <SectionHeading
          title="Create your page"
          subtitle="Your page is your personal space for your characters. Create it, customize it, add your characters, and share it with your audience."
          subtitleClassName="text-lg tracking-[-0.115px] sm:text-[23px]"
        />

        <div className="flex w-full flex-col items-center gap-[60px]">
          {/* Swipeable row on phones and tablets, two-up grid on desktop */}
          <div className="scrollbar-none -mx-4 flex w-[calc(100%+32px)] snap-x snap-mandatory gap-5 overflow-x-auto px-4 sm:-mx-8 sm:w-[calc(100%+64px)] sm:gap-[30px] sm:px-8 lg:mx-0 lg:grid lg:w-full lg:grid-cols-2 lg:justify-items-center lg:gap-[42.105px] lg:overflow-visible lg:px-0">
            {PAGES.map(({ id, ...page }) => (
              <PageCard key={id} {...page} />
            ))}
          </div>

          <Link
            to="/discover"
            className="rounded-[20px] border-[5px] border-[#d2d2d2] bg-white px-12 py-8 font-ui text-[28px] font-bold text-black transition-colors hover:bg-neutral-100"
          >
            See more pages
          </Link>
        </div>
      </div>
    </section>
  );
}
