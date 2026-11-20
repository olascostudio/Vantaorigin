import { Link } from "react-router-dom";
import SectionHeading from "./SectionHeading";
import arrowUpRight from "../assets/landing/features/arrow-up-right.svg";
import creator01 from "../assets/landing/features/creator-01.webp";
import creator02 from "../assets/landing/features/creator-02.webp";
import creator03a from "../assets/landing/features/creator-03a.webp";
import creator03b from "../assets/landing/features/creator-03b.webp";
import creator04 from "../assets/landing/features/creator-04.webp";
import creator05 from "../assets/landing/features/creator-05.webp";
import creator06 from "../assets/landing/features/creator-06.webp";
import creator07 from "../assets/landing/features/creator-07.webp";
import creator08 from "../assets/landing/features/creator-08.webp";
import creator09 from "../assets/landing/features/creator-09.webp";
import creator10 from "../assets/landing/features/creator-10.webp";
import creator11 from "../assets/landing/features/creator-11.webp";
import creator12 from "../assets/landing/features/creator-12.webp";
import creator13 from "../assets/landing/features/creator-13.webp";
import creator14 from "../assets/landing/features/creator-14.webp";
import creator15 from "../assets/landing/features/creator-15.webp";
import creator16 from "../assets/landing/features/creator-16.webp";
import creator17 from "../assets/landing/features/creator-17.webp";
import creator18 from "../assets/landing/features/creator-18.webp";

const BUILDERS = [
  {
    title: "Character Profiles",
    text: "Create dedicated profiles for every one of your characters.",
  },
  { title: "Your page", text: "Bring your characters together in one customizable public space." },
  {
    title: "One Shareable Link",
    text: "Give your audience one link to discover all your characters and creative work.",
  },
  {
    title: "Easy Character Management",
    text: "Create, edit, organize, and update your characters whenever you want.",
  },
];

// The glow, as one gradient rather than three things pretending to be one.
//
// It used to be a glow image pinned at a fixed 246.97px from the left, plus
// a separate inset shadow on the right edge. The pixel offset came from a
// 400px Figma frame, and these cards render at 313px in a four-up grid, so
// on every one of them the light source sat partly outside the card. A
// gradient placed in percentages cannot drift: it is anchored just off the
// top right corner whatever the card is doing.
//
// It stays on the right, away from the copy on the left, so the body text
// keeps its contrast against the dark surface.
const GLOW =
  "radial-gradient(130% 110% at 90% -12%, rgba(147, 51, 234, 0.46) 0%, rgba(147, 51, 234, 0.17) 34%, rgba(147, 51, 234, 0) 66%)";

function BuilderCard({ title, text }) {
  return (
    // A flex column that grows with its copy, not a fixed 150px box with
    // everything pinned inside it. The old version put "Learn More" at a
    // hardcoded 113px from the top, so the moment a description ran to three
    // lines the text slid underneath it: all four cards overlapped, and the
    // longest overflowed its own card by 24px. Nothing here can collide,
    // whatever anybody writes.
    <article className="relative flex min-h-[150px] w-full max-w-[400px] flex-col overflow-hidden rounded-[22.018px] bg-[rgba(43,43,43,0.2)] p-[25px] shadow-[0_11.743px_20.917px_0_rgba(0,0,0,0.05)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ backgroundImage: GLOW }}
      />

      <div className="relative flex flex-col gap-[15px] capitalize">
        <h3 className="font-ui text-[22px] font-bold text-white">{title}</h3>
        <p className="font-ui text-[15px] text-subtext">{text}</p>
      </div>

      {/* mt-auto holds it to the bottom edge however tall the card ends up,
          which is what keeps a row of them lined up. */}
      <a
        href="#features"
        className="relative mt-auto flex items-center gap-1 self-end pt-5 font-ui text-xs font-medium text-white underline"
      >
        Learn More
        <img src={arrowUpRight} alt="" className="size-4"  loading="lazy" />
      </a>
    </article>
  );
}

// Image placements inside each tile, copied from Figma. "center" images are
// centred on the tile with an offset; "top" images hang from the top edge.
const centered = (src, w, h, dx, dy) => ({
  src,
  className: "-translate-x-1/2 -translate-y-1/2",
  style: { width: w, height: h, left: `calc(50% + ${dx}px)`, top: `calc(50% + ${dy}px)` },
});
const topAnchored = (src, dx = 0) => ({
  src,
  className: "-translate-x-1/2",
  style: { width: 199.115, height: 190.979, left: `calc(50% + ${dx}px)`, top: 0 },
});
const bust = (src) => centered(src, 176.927, 190.893, 0, 4.56);
const portrait = (src, dy) => centered(src, 185.284, 277.893, 0.14, dy);

// [tile inset within the mosaic, image placement]
const TILES = [
  ["8.79% 72.71% 68.39% 14.61%", bust(creator01)],
  ["0 87.33% 77.18% 0", centered(creator02, 280.28, 302.404, 0, 4.56)],
  ["26.21% 87.33% 50.96% 0", { layered: true }],
  ["16.91% 58.17% 60.27% 29.16%", centered(creator04, 185.284, 198.696, 0.14, 8.46)],
  ["25.03% 43.63% 52.14% 43.7%", topAnchored(creator05)],
  ["16.91% 29.08% 60.27% 58.24%", bust(creator06)],
  ["0 0 77.18% 87.33%", portrait(creator07, -0.17)],
  ["8.79% 14.54% 68.39% 72.78%", portrait(creator08, -0.17)],
  ["26.21% 0 50.96% 87.33%", portrait(creator09, -0.17)],
  ["34.86% 72.71% 42.32% 14.61%", portrait(creator10, 48.06)],
  ["42.98% 58.17% 34.19% 29.16%", topAnchored(creator11)],
  ["51.1% 43.63% 26.07% 43.7%", bust(creator12)],
  ["42.98% 29.08% 34.19% 58.24%", portrait(creator13, -0.17)],
  ["34.86% 14.54% 42.32% 72.78%", topAnchored(creator07, 0.01)],
  ["60.93% 72.71% 16.24% 14.61%", portrait(creator14, 48.06)],
  ["69.05% 58.17% 8.12% 29.16%", portrait(creator15, -0.17)],
  ["77.18% 43.63% 0 43.7%", topAnchored(creator16)],
  ["69.05% 29.08% 8.12% 58.24%", bust(creator17)],
  ["60.93% 14.54% 16.24% 72.78%", portrait(creator18, 48.06)],
];

// Tile 3 stacks two crops of the same portrait.
function LayeredBust() {
  return (
    <div className="absolute left-1/2 top-[calc(50%+4.56px)] h-[190.893px] w-[176.927px] -translate-x-1/2 -translate-y-1/2">
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={creator03a}
          alt=""
          className="absolute left-0 w-full max-w-none"
          style={{ top: "-20.71%", height: "139.01%" }}
         loading="lazy" />
      </div>
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={creator03b}
          alt=""
          className="absolute max-w-none"
          style={{ left: "-0.41%", top: "-20.4%", width: "100.82%", height: "120.4%" }}
         loading="lazy" />
      </div>
    </div>
  );
}

function CreatorMosaic() {
  return (
    <div className="relative h-[796.458px] w-[1384.192px]">
      {TILES.map(([inset, image]) => (
        <div
          key={inset}
          className="absolute overflow-hidden rounded-[15.254px] bg-[#f8f8f8]"
          style={{ inset }}
          data-testid="creator-tile"
        >
          {image.layered ? (
            <LayeredBust />
          ) : (
            <img
              src={image.src}
              alt=""
              loading="lazy"
              className={`absolute max-w-none object-cover ${image.className}`}
              style={image.style}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function FeaturedCreators() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-plum lg:h-[595px]">
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 pt-16 text-center lg:absolute lg:left-1/2 lg:top-[95.5px] lg:-translate-x-1/2 lg:px-0 lg:pt-0">
        <h3 className="font-display text-[32px] leading-none text-white sm:text-[40px]">
          Discover Creators
        </h3>
        <p className="max-w-[1000px] font-ui text-lg leading-[1.6] text-neutral-300 sm:text-2xl lg:w-[1000px]">
          Explore pages built by creators and discover the characters behind them.
        </p>
        <Link
          to="/creators"
          className="flex w-[254px] items-center justify-center overflow-hidden whitespace-nowrap rounded-[44px] border-[3px] border-[#b90754] bg-primary py-[15px] font-pill text-xl font-bold text-white transition-opacity hover:opacity-90"
        >
          Explore Creators
        </Link>
      </div>

      {/* The mosaic is wider than the panel and cropped by it. Below lg it is
          shown scaled down underneath the copy. */}
      <div className="relative mt-10 h-[260px] lg:absolute lg:inset-x-0 lg:bottom-0 lg:top-[260.71px] lg:mt-0 lg:h-auto">
        <div className="absolute left-[calc(50%+0.1px)] top-0 origin-top -translate-x-1/2 scale-50 lg:scale-100">
          <CreatorMosaic />
        </div>
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section
      id="features"
      className="flex flex-col items-center gap-[73px] border-t border-surface px-4 py-[62px] sm:px-8 xl:px-14"
    >
      <SectionHeading title="Everything You Need To Showcase Your Characters" />

      <div className="flex w-full max-w-[1328px] flex-col gap-[60px]">
        <div className="grid grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {BUILDERS.map((builder) => (
            <BuilderCard key={builder.title} {...builder} />
          ))}
        </div>
        <FeaturedCreators />
      </div>
    </section>
  );
}
