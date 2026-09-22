import { useId } from "react";
import cardFrame from "../../assets/creator/card-frame-gold.svg";
import characterCover from "../../assets/creator/character-cover.svg";
import sword from "../../assets/creator/sword.svg";

// The notched window inside the gold frame (inner sub-path of card-frame-gold.svg).
const WINDOW =
  "M132.639 10.2549C131.127 10.2549 129.671 10.8221 128.558 11.8447L109.7 29.1729C108.587 30.1955 107.131 30.7627 105.619 30.7627H41.0156C37.6843 30.7627 34.9834 33.4636 34.9834 36.7949V110.567C34.9834 112.698 33.8596 114.67 32.0273 115.756L13.8115 126.555C11.9792 127.641 10.8556 129.613 10.8555 131.743V462.047C10.8555 472.041 18.9572 480.142 28.9512 480.143H345.025C355.019 480.142 363.121 472.041 363.121 462.047V131.421C363.121 129.468 362.175 127.635 360.583 126.504L342.135 113.395C340.543 112.263 339.597 110.431 339.597 108.478V36.7949C339.597 33.4636 336.896 30.7627 333.564 30.7627H277.075C275.376 30.7627 273.756 30.0467 272.613 28.79L257.547 12.2275C256.404 10.9709 254.784 10.2549 253.085 10.2549H132.639Z";

export default function CharacterCard({ alias, power, cover, showViewMore = false, onViewMore }) {
  const id = useId().replace(/:/g, "");

  // containerType lets the text below scale with the card, not the screen.
  return (
    <div
      className="relative mx-auto aspect-[374/491] w-[280px] shrink-0 sm:w-[300px]"
      style={{ containerType: "inline-size" }}
    >
      <svg viewBox="0 0 374 491" className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <clipPath id={`window-${id}`}>
            <path d={WINDOW} />
          </clipPath>
          <linearGradient id={`fade-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.45" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#window-${id})`}>
          <rect width="374" height="491" fill="#1e2637" />
          <image
            href={cover || characterCover}
            x="10"
            y="10"
            width="354"
            height="471"
            preserveAspectRatio="xMidYMid slice"
          />
          <rect width="374" height="491" fill={`url(#fade-${id})`} />
        </g>
        <image href={cardFrame} width="374" height="491" />
      </svg>

      <div className="absolute inset-x-[4%] bottom-[4%] flex flex-col items-center gap-[0.5em] px-2 text-center">
        {showViewMore && (
          <button
            type="button"
            onClick={onViewMore}
            style={{ fontSize: "clamp(10px, 4.4cqw, 14px)" }}
            className="rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-[1.6em] py-[0.6em] font-ui font-bold text-white ring-1 ring-white/60 hover:opacity-90"
          >
            View more
          </button>
        )}
        <p
          style={{ fontSize: "clamp(14px, 8.6cqw, 30px)" }}
          className="line-clamp-2 w-full break-words font-ui font-black leading-[1.15] text-white"
        >
          {alias}
        </p>
        <p
          style={{ fontSize: "clamp(11px, 5.4cqw, 18px)" }}
          className="flex items-center gap-[0.4em] font-ui font-bold text-white"
        >
          <img src={sword} alt="" className="h-[1.1em] w-auto" />
          {power}
        </p>
      </div>
    </div>
  );
}
