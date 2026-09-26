import { Link } from "react-router-dom";
import Navbar from "./Navbar";
import Rotated from "./Rotated";
import bellRing from "../assets/landing/hero/bell-ring.svg";
import chevronRight from "../assets/landing/hero/chevron-right.svg";
import gridLine from "../assets/landing/hero/grid-line.svg";
import glowEllipse from "../assets/landing/hero/glow-ellipse.svg";
import bottomFade from "../assets/landing/hero/bottom-fade.png";
import cardBadge from "../assets/landing/hero/card-badge.svg";
import artVtuber from "../assets/landing/hero/card-vtuber.webp";
import artKnifeDancer from "../assets/landing/hero/card-knife-dancer.webp";
import artInkCentaur from "../assets/landing/hero/card-ink-centaur.webp";
import artHoodedGunman from "../assets/landing/hero/card-hooded-gunman.webp";
import artWingedWolf from "../assets/landing/hero/card-winged-wolf.webp";
import curve802 from "../assets/landing/hero/curve-802.svg";
import curve803 from "../assets/landing/hero/curve-803.svg";
import curve804 from "../assets/landing/hero/curve-804.svg";
import curve805 from "../assets/landing/hero/curve-805.svg";
import curve806 from "../assets/landing/hero/curve-806.svg";
import curve807 from "../assets/landing/hero/curve-807.svg";
import curve808 from "../assets/landing/hero/curve-808.svg";
import curve809 from "../assets/landing/hero/curve-809.svg";
import curve810 from "../assets/landing/hero/curve-810.svg";
import curve811 from "../assets/landing/hero/curve-811.svg";
import curve812 from "../assets/landing/hero/curve-812.svg";
import curve813 from "../assets/landing/hero/curve-813.svg";
import curve814 from "../assets/landing/hero/curve-814.svg";
import curve815 from "../assets/landing/hero/curve-815.svg";
import curve816 from "../assets/landing/hero/curve-816.svg";
import curve817 from "../assets/landing/hero/curve-817.svg";
import curve818 from "../assets/landing/hero/curve-818.svg";
import curve819 from "../assets/landing/hero/curve-819.svg";
import curve820 from "../assets/landing/hero/curve-820.svg";
import curve821 from "../assets/landing/hero/curve-821.svg";

// --- Background decoration (1440px-wide design frame) ----------------------

const GRID_LINES = [
  [121, -3], [224, -3], [327, -4], [430, -4], [507, -4], [610, -4],
  [857, 0], [960, 0], [1063, -1], [1166, -1], [1243, -1], [1346, -1],
];

const TILT_LEFT = "rotate(-1.55deg)";
const FLIP = "rotate(180deg) scaleY(-1)";
const FLIP_TILT = "rotate(-178.45deg) scaleY(-1)";

// [src, bounding box [x, y, w, h], layer size [w, h], transform, image inset]
const CURVES = [
  [curve802, [-66, -1, 312, 180], [312, 180], "none", "-0.48% -0.16%"],
  [curve803, [-96, -6, 519, 300], [519, 300], "none", "-0.29% 0"],
  [curve804, [-107, -12, 717, 404], [717, 404], "none", "-0.22% 0"],
  [curve805, [-54, 91, 664, 361], [664, 361], "none", "-0.24% 0"],
  [curve806, [-45.4, 182.16, 664.449, 373.611], [655.05, 356.006], TILT_LEFT, "-0.25% 0"],
  [curve807, [-20.65, 283.57, 639.647, 359.665], [630.599, 342.717], TILT_LEFT, "-0.26% 0"],
  [curve808, [-26.32, 379.86, 645.348, 362.871], [636.22, 345.772], TILT_LEFT, "-0.25% 0"],
  [curve809, [-62.7, 484.02, 682.552, 383.79], [672.897, 365.705], TILT_LEFT, "-0.24% 0"],
  [curve810, [-36.85, 577.46, 655.646, 368.661], [646.372, 351.289], TILT_LEFT, "-0.25% 0"],
  [curve811, [-57, 686, 676.533, 380.406], [666.963, 362.48], TILT_LEFT, "-0.24% 0"],
  [curve812, [1228.76, -1.5, 238.5, 137.698], [238.5, 137.698], FLIP, "-0.63% -0.21%"],
  [curve813, [1052, -6, 485, 280], [485, 280], FLIP, "-0.31% -0.1%"],
  [curve814, [857, -15, 689, 388], [689, 388], FLIP, "-0.22% 0"],
  [curve815, [857, 87, 595, 324], [595, 324], FLIP, "-0.27% 0"],
  [curve816, [848.94, 177.45, 605.287, 340.345], [596.725, 324.307], FLIP_TILT, "-0.27% 0"],
  [curve817, [849.21, 279.2, 605.382, 340.398], [596.819, 324.358], FLIP_TILT, "-0.27% 0"],
  [curve818, [848.98, 375.45, 619.51, 348.321], [610.748, 331.906], FLIP_TILT, "-0.26% 0"],
  [curve819, [849.03, 479.81, 620.981, 349.137], [612.198, 332.684], FLIP_TILT, "-0.26% 0"],
  [curve820, [848.45, 572.66, 636.525, 357.836], [627.523, 340.97], FLIP_TILT, "-0.26% 0"],
  [curve821, [848.62, 673.14, 601.93, 338.457], [593.416, 322.509], FLIP_TILT, "-0.27% 0"],
];

function HeroBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-0 h-full w-[1440px] -translate-x-1/2"
    >
      {GRID_LINES.map(([x, y]) => (
        <img
          key={x}
          src={gridLine}
          alt=""
          className="absolute"
          style={{ left: x - 1, top: y, width: 2, height: 1013.5 }}
        />
      ))}
      {CURVES.map(([src, box, size, transform, inset]) => (
        <Rotated key={src} box={box} size={size} transform={transform}>
          <div className="absolute" style={{ inset }}>
            <img src={src} alt="" className="block size-full max-w-none" />
          </div>
        </Rotated>
      ))}
    </div>
  );
}

// --- Character showcase ------------------------------------------------------

const FLIPPED = (deg) => `rotate(${deg}deg) scaleY(-1)`;

// Positions are relative to the 1307px showcase stage; `x` is the offset of
// the card's bounding-box centre from the stage centre. Paint order matches
// Figma (last = on top).
const SHOWCASE_CARDS = [
  {
    id: "vtuber",
    x: 408.5,
    box: [156, 490.106, 541.786],
    transform: FLIPPED(-162.55),
    bg: "#3a2a6b",
    art: artVtuber,
    badge: { box: [21.01, 29.3, 52.317, 53.051], transform: FLIPPED(-176.98) },
  },
  {
    id: "knife-dancer",
    x: 198.83,
    box: [37, 466.77, 525.208],
    transform: FLIPPED(-166.54),
    bg: "#5e1a1a",
    art: artKnifeDancer,
    badge: { box: [17.75, 19.65, 50.567, 51.329], transform: FLIPPED(179.04) },
  },
  {
    id: "ink-centaur",
    x: -408.5,
    box: [156, 490.106, 541.786],
    transform: "rotate(-17.45deg)",
    bg: "#c08a5c",
    art: artInkCentaur,
    badge: { box: [10.61, 25.74, 50.284, 51.051], transform: "rotate(-0.64deg)" },
  },
  {
    id: "hooded-gunman",
    x: -220.63,
    box: [37.96, 490.106, 541.786],
    transform: "rotate(-17.45deg)",
    bg: "#1b3a63",
    art: artHoodedGunman,
    badge: { box: [35.21, 22.53, 50.284, 51.051], transform: "rotate(-0.64deg)" },
  },
  {
    id: "winged-wolf",
    x: -13.55,
    box: [0, 372, 451],
    transform: "none",
    bg: "#2a2f5e",
    art: artWingedWolf,
    badge: { box: [23.5, 23.5, 49.724, 50.5], transform: "none" },
  },
];

function CardBadge({ box, transform }) {
  return (
    <Rotated box={box} size={[49.724, 50.5]} transform={transform}>
      <div className="flex size-full items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-[4px]">
        <img src={cardBadge} alt="" className="h-[24.5px] w-[23.724px]" />
      </div>
    </Rotated>
  );
}

function ShowcaseCard({ id, x, box, transform, bg, art, badge }) {
  const [top, width, height] = box;
  return (
    <div
      className="absolute flex items-center justify-center"
      data-testid="showcase-card"
      data-card={id}
      style={{ left: `calc(50% + ${x}px - ${width / 2}px)`, top, width, height }}
    >
      <div className="flex-none" style={{ transform }}>
        <div
          className="relative h-[451px] w-[372px] overflow-hidden rounded-t-[40px] shadow-card"
          style={{ backgroundColor: bg }}
        >
          {/* The artwork fills the card and tilts with it, as a card would */}
          <img src={art} alt="" className="absolute inset-0 size-full object-cover" />
          <CardBadge {...badge} />
        </div>
      </div>
    </div>
  );
}

function Showcase() {
  return (
    // Visible window onto the 698px-tall stage; the hero clips the rest.
    <div className="relative h-[141px] sm:h-[176px] md:h-[211px] lg:h-[282px] xl:h-[317px] min-[1440px]:h-[352px]">
      <div
        className="absolute left-1/2 top-0 h-[697.786px] w-[1440px] origin-top -translate-x-1/2 scale-[0.4] sm:scale-50 md:scale-[0.6] lg:scale-[0.8] xl:scale-90 min-[1440px]:scale-100"
        data-testid="showcase"
      >
        <div className="absolute left-[66px] top-0 h-full w-[1307.106px]">
          <div className="absolute left-1/2 top-[149px] h-[266px] w-[1195px] -translate-x-1/2">
            <div className="absolute" style={{ inset: "-75.19% -16.74%" }}>
              <img src={glowEllipse} alt="" className="block size-full max-w-none" />
            </div>
          </div>
          {SHOWCASE_CARDS.map(({ id, ...card }) => (
            <ShowcaseCard key={id} id={id} {...card} />
          ))}
        </div>
        <img
          src={bottomFade}
          alt=""
          className="absolute left-0 top-[193px] h-[207px] w-[1440px] max-w-none object-cover"
        />
      </div>
    </div>
  );
}

// --- Hero --------------------------------------------------------------------

function AnnouncementBadge() {
  return (
    <div className="flex items-center gap-2.5 rounded-[10px] bg-surface/20 px-2 py-[5px] backdrop-blur-[30px]">
      <img src={bellRing} alt="" className="h-[16.048px] w-4" />
      <p className="whitespace-nowrap text-center font-ui text-[7px] font-semibold text-white">
        Create your character hub. Share it anywhere.
      </p>
      <a
        href="#explore"
        className="flex items-center justify-center gap-[5px] rounded-full bg-secondary px-2.5 py-[5px] font-ui text-[7px] font-semibold text-white"
      >
        Get started
        <img src={chevronRight} alt="" className="h-[3.333px] w-1" />
      </a>
    </div>
  );
}

export default function Hero() {
  return (
    <header className="relative overflow-hidden bg-background px-4 pt-10">
      <HeroBackground />

      <div className="relative">
        <Navbar />

        <div className="mx-auto mt-16 flex max-w-[688px] flex-col items-center gap-[30px] text-center lg:mt-[101.25px]">
          <div className="flex flex-col items-center gap-5">
            <AnnouncementBadge />

            <div>
              <h1 className="font-display text-primary">
                <span className="block text-[40px] leading-[1.2] sm:text-[60px] lg:text-[85px] lg:leading-[120px]">
                  Create <span className="text-white">Your</span>
                </span>{" "}
                <span className="block text-[48px] leading-[1.2] sm:text-[73px] lg:text-[103.68px] lg:leading-[120px]">
                  <span className="text-white">Character</span> Realm
                </span>
              </h1>
              <p className="mx-auto mt-1 max-w-[700px] font-body text-base tracking-[-0.1px] text-subtext sm:text-xl">
                Create a home for your characters, organize their profiles, and share your
                Realm with one link.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            <Link
              to="/auth"
              className="mb-[5px] ml-[5px] bg-secondary px-6 py-4 font-ui text-sm font-bold text-white shadow-block transition-transform hover:-translate-y-0.5"
            >
              Create Your Realm
            </Link>
            <a
              href="#explore"
              className="border-2 border-white px-6 py-4 font-ui text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              Explore Realms
            </a>
          </div>
        </div>

        <div className="-mx-4 mt-9">
          <Showcase />
        </div>
      </div>
    </header>
  );
}
