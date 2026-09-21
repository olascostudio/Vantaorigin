import cardFrame from "../../assets/creator/card-frame.svg";
import characterCover from "../../assets/creator/character-cover.svg";
import sword from "../../assets/creator/sword.svg";

export default function CharacterCard({ alias, power, cover = characterCover, showViewMore = false, onViewMore }) {
  return (
    <div className="relative mx-auto w-[280px] shrink-0 sm:w-[300px]">
      <img src={cardFrame} alt="" className="w-full" />
      <div className="absolute inset-[4%] overflow-hidden rounded-[22px]">
        <img src={cover} alt={alias} className="size-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-6 pt-16">
          {showViewMore && (
            <button
              type="button"
              onClick={onViewMore}
              className="rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-6 py-2 font-ui text-sm font-bold text-white ring-1 ring-white/60 hover:opacity-90"
            >
              View more
            </button>
          )}
          <p className="font-ui text-3xl font-black text-white">{alias}</p>
          <p className="flex items-center gap-2 font-ui text-lg font-bold text-white">
            <img src={sword} alt="" className="size-5" />
            {power}
          </p>
        </div>
      </div>
    </div>
  );
}
