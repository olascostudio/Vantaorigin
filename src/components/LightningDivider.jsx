// The lightning under the tab row.
//
// Lifted out of CreatorHub so the page a visitor sees can use the same
// one. The hub and the public page are the same place from two sides, and
// a visitor arriving from a shared link should recognise it as the thing
// the creator showed them, not a plainer cousin of it.
import bolt1 from "../assets/creator/bolt-1.svg";
import bolt2 from "../assets/creator/bolt-2.svg";
import bolt3 from "../assets/creator/bolt-3.svg";
import bolt4 from "../assets/creator/bolt-4.svg";
import bolt5 from "../assets/creator/bolt-5.svg";
import streak1 from "../assets/creator/streak-1.svg";
import streak2 from "../assets/creator/streak-2.svg";
import streak3 from "../assets/creator/streak-3.svg";
import streak4 from "../assets/creator/streak-4.svg";
import streak5 from "../assets/creator/streak-5.svg";
// Decorative lightning strokes under the tab row.
export default function LightningDivider() {
  const bolts = [
    { src: bolt1, left: "4%" },
    { src: bolt2, left: "22%" },
    { src: bolt3, left: "40%" },
    { src: bolt4, left: "65%" },
    { src: bolt5, left: "92%" },
  ];
  const streaks = [
    { src: streak1, left: "8%" },
    { src: streak2, left: "23%" },
    { src: streak3, left: "39%" },
    { src: streak4, left: "62%" },
    { src: streak5, left: "88%" },
  ];

  return (
    // 150px of decoration sat between the tabs and the characters at every
    // width. On a phone that is 18% of the screen of ornament directly
    // above the thing somebody opened the page to see, so here it scales
    // too. The desktop figures are the originals, untouched.
    <div aria-hidden="true" className="relative h-[78px] overflow-hidden sm:h-[120px] lg:h-[150px]">
      {bolts.map(({ src, left }) => (
        <img
          key={left}
          src={src}
          alt=""
          className="absolute top-1.5 h-7 w-[32px] max-w-none sm:top-2 sm:h-10 sm:w-[44px] lg:top-3 lg:h-12 lg:w-[54px]"
          style={{ left }}
        />
      ))}
      {streaks.map(({ src, left }) => (
        <img
          key={left}
          src={src}
          alt=""
          className="absolute top-[46px] h-[18px] w-[70px] max-w-none sm:top-[70px] sm:h-[24px] sm:w-[96px] lg:top-[88px] lg:h-[30px] lg:w-[120px]"
          style={{ left }}
        />
      ))}
    </div>
  );
}
