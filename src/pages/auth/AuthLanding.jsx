import { Link } from "react-router-dom";
import { BackHome, GRADIENT, OrDivider, PILL, SocialButtons, TermsNote } from "./authUi";
import banner from "../../assets/auth/banner.webp";
import card1 from "../../assets/auth/cards/card-1-pink.png";
import card2 from "../../assets/auth/cards/card-2-green.png";
import card3 from "../../assets/auth/cards/card-3-sand.png";
import card4 from "../../assets/auth/cards/card-4-blue.png";
import card5 from "../../assets/auth/cards/card-5-gold.png";
import card6 from "../../assets/auth/cards/card-6-magenta.png";
import card7 from "../../assets/auth/cards/card-7-white.png";

// Card placements on the 1728x306 banner, measured from the design export.
const CARDS = [
  { src: card1, left: 176, top: 34, width: 180 },
  { src: card2, left: 384, top: 94, width: 145 },
  { src: card3, left: 552, top: 18, width: 172 },
  { src: card4, left: 756, top: 88, width: 158 },
  { src: card5, left: 936, top: 8, width: 177 },
  { src: card6, left: 1130, top: 82, width: 161 },
  { src: card7, left: 1334, top: 16, width: 193 },
];

function Banner() {
  return (
    <div aria-hidden="true" className="relative h-[140px] overflow-hidden sm:h-[220px] lg:h-[306px]">
      <img src={banner} alt="" className="absolute left-1/2 top-0 w-[1728px] max-w-none -translate-x-1/2" />

      <div className="absolute left-1/2 top-0 h-[306px] w-[1728px] origin-top -translate-x-1/2 scale-[0.46] sm:scale-[0.72] lg:scale-100">
        {CARDS.map(({ src, left, top, width }) => (
          <img key={src} src={src} alt="" className="absolute max-w-none" style={{ left, top, width }} />
        ))}
      </div>

      {/* Art fades into the page background at the bottom edge. */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-auth-bg" />
    </div>
  );
}

export default function AuthLanding() {
  return (
    <div className="min-h-screen bg-auth-bg pb-[86px]">
      <Banner />

      <div className="mx-auto flex w-full max-w-[762px] flex-col px-6 sm:px-0">
        <div className="mt-[42px]">
          <BackHome />
        </div>

        <h1 className="mt-[22px] text-center font-ui text-[32px] font-bold leading-[1.25] text-white sm:text-[40px]">
          Welcome to VantaOrigin
        </h1>
        <p className="mt-[10px] text-center font-ui text-lg leading-[27px] text-[#f5f5f5] sm:text-[22px]">
          Create your Realm, showcase your characters, and share your world with one link.
        </p>

        <div className="mt-[46.5px] flex flex-col items-center">
          <Link to="/signup" className={`${PILL} h-16 w-full max-w-[324px] ${GRADIENT}`}>
            Sign Up
          </Link>
          <Link to="/signin" className={`${PILL} mt-[18px] h-[60px] w-full max-w-[232px] bg-white text-black`}>
            Sign In
          </Link>

          <div className="mt-[19px]">
            <OrDivider />
          </div>

          <div className="mt-[21.5px] flex w-full flex-col items-center gap-5">
            <SocialButtons label="Sign up" />
          </div>

          <div className="mt-[46px]">
            <TermsNote />
          </div>
        </div>
      </div>
    </div>
  );
}
