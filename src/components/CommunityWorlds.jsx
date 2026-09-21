import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import SectionHeading from "./SectionHeading";
import world1 from "../assets/landing/worlds/world-1.webp";
import world2Base from "../assets/landing/worlds/world-2-base.jpg";
import world2Overlay from "../assets/landing/worlds/world-2-overlay.webp";
import world3 from "../assets/landing/hero/card-urukojin.webp";
import world4 from "../assets/landing/worlds/world-4.webp";
import arrowUpRight from "../assets/landing/worlds/arrow-up-right.svg";
import chevronLeft from "../assets/landing/worlds/chevron-left.svg";
import chevronRight from "../assets/landing/worlds/chevron-right.svg";

const CARD_STEP = 530; // card width + gap

// Obaalu artwork: a base render with a matching transparent overlay on top.
function ObaaluArt() {
  return (
    <div className="absolute left-[calc(50%-0.5px)] top-[calc(50%+14.5px)] size-[461px] -translate-x-1/2 -translate-y-1/2">
      <img src={world2Base} alt="" className="absolute size-full max-w-none object-cover" />
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={world2Overlay}
          alt=""
          className="absolute top-0 h-full max-w-none"
          style={{ left: "-0.04%", width: "100.01%" }}
        />
      </div>
    </div>
  );
}

const REALMS = [
  {
    id: "iron-inferno-1",
    color: "#fc590b",
    title: "Obaalu’s Realm",
    creator: "Arinola",
    characters: 12,
    tags: "Fantasy • Action • Mythology",
    art: (
      <img
        src={world1}
        alt=""
        className="absolute left-[calc(50%-0.5px)] top-[calc(50%+0.5px)] size-[455px] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
      />
    ),
  },
  {
    id: "iron-inferno-2",
    color: "#f5af32",
    title: "Emberforge Realm",
    creator: "Carlos Idrobo",
    characters: 9,
    tags: "Fantasy • Concept Art",
    art: <ObaaluArt />,
  },
  {
    id: "iyanu-etere",
    color: "#6687cd",
    title: "Iyanu-Etere Realm",
    creator: "Meyimeyi",
    characters: 7,
    tags: "Myth • Illustration",
    art: (
      <>
        <ObaaluArt />
        <div className="absolute left-1/2 top-1/2 h-[360px] w-[476px] -translate-x-1/2 -translate-y-1/2 overflow-hidden">
          <img
            src={world3}
            alt=""
            className="absolute top-0 h-full max-w-none"
            style={{ left: "0.02%", width: "99.98%" }}
          />
        </div>
      </>
    ),
  },
  {
    id: "iron-inferno-3",
    color: "#96307e",
    title: "Urukojin Realm",
    creator: "Bruno Diaz",
    characters: 14,
    tags: "3D • Props • Environments",
    titleWidth: "w-[244px]",
    authorColor: "text-[#ccc4c1]",
    art: (
      <div className="absolute left-0 top-[-4px] h-[513px] w-[449px] overflow-hidden">
        <img
          src={world4}
          alt=""
          className="absolute top-0 h-full max-w-none"
          style={{ left: "0.09%", width: "99.9%" }}
        />
      </div>
    ),
  },
];

function RealmCard({ color, title, creator, characters, tags, art, titleWidth = "w-[300px]", authorColor = "text-accent" }) {
  return (
    <article
      className="flex w-[calc(100vw-48px)] max-w-[500px] shrink-0 snap-center flex-col items-center gap-[18px] overflow-hidden rounded-[25px] border-[1.667px] p-4 sm:w-[500px] sm:p-[25px]"
      style={{ borderColor: color, backgroundColor: `${color}0d` }}
      data-testid="realm-card"
    >
      <div className="relative h-[360px] w-full overflow-hidden rounded-xl bg-[#888787]">{art}</div>

      <div className="flex w-full max-w-[433.333px] flex-col items-end gap-[25px]">
        <div className="flex w-full flex-col gap-[16.667px]">
          <div className="flex w-full items-center justify-between gap-3">
            <h3
              className={`max-w-full font-ui text-[22px] font-black tracking-[-0.125px] text-white sm:text-[25px] ${titleWidth}`}
            >
              {title}
            </h3>
            <p className={`whitespace-nowrap font-ui text-lg font-medium ${authorColor}`}>
              By {creator}
            </p>
          </div>
          <p className="font-ui text-base font-bold text-white">{characters} Characters</p>
          <p className="min-h-[46px] font-ui text-base text-neutral-300">{tags}</p>
        </div>

        <Link
          to="/character"
          className="flex items-center gap-[5px] font-ui text-base font-medium text-white underline"
        >
          View Realm
          <img src={arrowUpRight} alt="" className="size-5" />
        </Link>
      </div>
    </article>
  );
}

function ArrowButton({ label, icon, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-[273px] flex items-center rounded-full bg-white/10 px-7 py-[17px] backdrop-blur-sm transition-colors hover:bg-white/20 ${className}`}
    >
      <img src={icon} alt="" className="h-[44.8px] w-[22.4px]" />
    </button>
  );
}

export default function CommunityWorlds() {
  const trackRef = useRef(null);

  // Start centred, like the design (two cards in view, one peeking each side).
  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = (track.scrollWidth - track.clientWidth) / 2;
  }, []);

  const scroll = (direction) => {
    trackRef.current?.scrollBy?.({ left: direction * CARD_STEP, behavior: "smooth" });
  };

  return (
    <section id="explore" className="flex flex-col items-center gap-[50px] overflow-hidden py-[61px]">
      <div className="px-4">
        <SectionHeading
          title="Explore Creator Realms"
          subtitle="Discover characters, creative work, and Realms built by creators across VantaOrigin."
        />
      </div>

      <div className="relative w-full">
        <div
          ref={trackRef}
          className="scrollbar-none flex snap-x snap-mandatory gap-[30px] overflow-x-auto px-6 min-[2090px]:justify-center"
        >
          {REALMS.map(({ id, ...realm }) => (
            <RealmCard key={id} {...realm} />
          ))}
        </div>

        <ArrowButton
          label="Previous realms"
          icon={chevronLeft}
          onClick={() => scroll(-1)}
          className="left-3 lg:left-[42px]"
        />
        <ArrowButton
          label="Next realms"
          icon={chevronRight}
          onClick={() => scroll(1)}
          className="right-3 lg:right-[41.2px]"
        />
      </div>
    </section>
  );
}
