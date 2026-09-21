import { Link } from "react-router-dom";
import SectionHeading from "./SectionHeading";
import instagramIcon from "../assets/landing/footer/instagram.svg";
import tiktokIcon from "../assets/landing/footer/tiktok.svg";
import facebookIcon from "../assets/landing/footer/facebook.svg";

const PLACES = [
  { label: "Instagram", icon: instagramIcon },
  { label: "TikTok", icon: tiktokIcon },
  { label: "Facebook", icon: facebookIcon },
];

export default function ShareLink() {
  return (
    <section id="share" className="px-4 py-[61px] sm:px-8">
      <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-[50px]">
        <SectionHeading
          title="One Link For Your Characters"
          subtitle="Your characters don’t have to live across scattered posts and platforms. Bring them together in your Realm and share one link wherever your audience finds you."
        />

        {/* Social bio -> Realm link -> characters */}
        <div className="w-full rounded-[32px] bg-[#222b3c] p-6 sm:p-10">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-[#1b2233] px-5 py-6 sm:flex-row sm:justify-between sm:gap-6">
            <p className="break-all text-center font-ui text-xl font-bold text-white sm:text-left sm:text-2xl">
              vantaorigin.com/realm/<span className="text-primary">creatorname</span>
            </p>
            <span className="shrink-0 rounded-full bg-[#2b3547] px-5 py-2 font-ui text-sm text-neutral-300">
              your public Realm link
            </span>
          </div>

          <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <ul className="flex items-center gap-4">
              {PLACES.map(({ label, icon }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 font-ui text-sm text-neutral-200"
                >
                  <img src={icon} alt="" className="size-4" />
                  {label}
                </li>
              ))}
              <li className="font-ui text-sm text-neutral-400">and anywhere else</li>
            </ul>

            <Link
              to="/auth"
              className="rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-8 py-3 font-ui text-base font-bold text-white hover:opacity-90"
            >
              Claim your link
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
