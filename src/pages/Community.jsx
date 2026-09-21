import DashboardNav from "../components/DashboardNav";
import tiktok from "../assets/community/tiktok.svg";
import discord from "../assets/community/discord.svg";
import instagram from "../assets/community/instagram.svg";
import facebook from "../assets/community/facebook.svg";
import backdrop1 from "../assets/community/backdrop-1.webp";
import backdrop2 from "../assets/community/backdrop-2.webp";
import backdrop3 from "../assets/community/backdrop-3.webp";
import backdrop4 from "../assets/community/backdrop-4.webp";
import backdrop5 from "../assets/community/backdrop-5.webp";

// Swap these for the real VantaOrigin handles when they exist.
const LINKS = [
  { id: "tiktok", label: "TikTok", icon: tiktok, url: "https://www.tiktok.com/" },
  { id: "discord", label: "Discord", icon: discord, url: "https://discord.com/", featured: true },
  { id: "instagram", label: "Instagram", icon: instagram, url: "https://www.instagram.com/" },
  { id: "facebook", label: "Facebook", icon: facebook, url: "https://www.facebook.com/" },
];

const BACKDROPS = [backdrop1, backdrop2, backdrop3, backdrop4, backdrop5];

export default function Community() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#1b2233]">
      <DashboardNav active="Community" />

      {/* Blurred community imagery behind the page */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 top-[76px]">
        <div className="absolute inset-x-0 bottom-0 flex h-[55%] justify-center gap-6 opacity-40 blur-3xl">
          {BACKDROPS.map((image) => (
            <img key={image} src={image} alt="" className="h-full w-[380px] object-cover" />
          ))}
        </div>
        <div className="absolute left-1/2 top-[18%] size-[520px] -translate-x-1/2 rounded-full bg-[#5b21b6]/25 blur-[140px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1b2233] via-[#1b2233]/70 to-[#1b2233]/95" />
      </div>

      <main className="relative flex min-h-[calc(100vh-76px)] flex-col items-center px-6 pt-[22vh]">
        <h1 className="text-center font-ui text-[32px] font-bold text-white sm:text-[40px]">
          Join Our Community
        </h1>

        <ul className="mt-12 grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4 lg:gap-10">
          {LINKS.map(({ id, label, icon, url, featured }) => (
            <li key={id}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Join VantaOrigin on ${label}`}
                className={`flex size-[150px] items-center justify-center rounded-[28px] bg-white/[0.04] backdrop-blur transition-all hover:-translate-y-1 hover:bg-white/[0.08] sm:size-[200px] lg:size-[285px] ${
                  featured ? "border-2 border-primary" : "border border-white/10 hover:border-white/25"
                }`}
              >
                <img src={icon} alt="" className="size-[70px] sm:size-[95px] lg:size-[130px]" />
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
