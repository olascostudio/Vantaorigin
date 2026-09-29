import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../data/api";
import logoMark from "../assets/landing/footer/logo-mark.svg";
import logoWordmark from "../assets/landing/footer/logo-wordmark.svg";
import instagramIcon from "../assets/landing/footer/instagram.svg";
import facebookIcon from "../assets/landing/footer/facebook.svg";
import tiktokIcon from "../assets/landing/footer/tiktok.svg";
import pattern4962 from "../assets/landing/footer/pattern-4962.svg";
import pattern4967 from "../assets/landing/footer/pattern-4967.svg";
import pattern4968 from "../assets/landing/footer/pattern-4968.svg";

const SOCIALS = [
  { label: "Instagram", icon: instagramIcon, url: "https://www.instagram.com/vantaoriginstudio/" },
  { label: "Facebook", icon: facebookIcon, url: "https://facebook.com/groups/1640856640355085/" },
  { label: "TikTok", icon: tiktokIcon, url: "https://www.tiktok.com/@vantaorigin" },
];

// Only what is live today. Events, Leaderboards and Explore
// Comics are held back until they exist.
const LINK_COLUMNS = [
  {
    title: "Platform",
    width: "sm:w-[133.2px]",
    links: [
      { label: "Explore characters", to: "/discover" },
      { label: "Creator Studio", to: "/marketplace" },
    ],
  },
  {
    title: "Community",
    width: "sm:w-[184.8px]",
    links: [
      { label: "Community", to: "/community" },
      { label: "Marketplace", to: "/marketplace" },
      { label: "Help Center", to: "/help" },
    ],
  },
  {
    title: "Support",
    width: "sm:w-[136.8px]",
    links: [
      { label: "Contact Us", to: "/contact" },
      { label: "Terms of Service", to: "/terms" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "About VantaOrigin", to: "/about" },
    ],
  },
  {
    title: "Socials",
    width: "sm:min-w-[70.56px]",
    links: [
      { label: "Discord", href: "https://discord.gg/4E5dFcaEAa" },
      { label: "X", href: "https://x.com/vantaorigin" },
      { label: "Instagram", href: "https://www.instagram.com/vantaoriginstudio/" },
    ],
  },
];

// Logo sequence of the white pattern row, as laid out in Figma.
const WHITE_ROW = [
  pattern4967, pattern4968, pattern4968, pattern4967, pattern4968, pattern4968, pattern4968,
  pattern4968, pattern4968, pattern4968, pattern4967, pattern4968, pattern4968, pattern4962,
  pattern4968, pattern4968, pattern4968, pattern4968, pattern4968, pattern4968,
];
const REPEATS = 32; // enough logos to cover very wide screens

function PatternRow({ top, logo }) {
  return (
    <div className="absolute left-[calc(50%-1475px)] flex gap-5" style={{ top }}>
      {Array.from({ length: REPEATS }, (_, i) => (
        <img
          key={i}
          src={logo ?? WHITE_ROW[i % WHITE_ROW.length]}
          alt=""
          className="h-[103.27px] w-[100px] max-w-none shrink-0"
        />
      ))}
    </div>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  // "idle" | "sending" | "done" | one sentence of trouble
  const [state, setState] = useState("idle");

  async function join(event) {
    event.preventDefault();
    if (state === "sending") return;

    setState("sending");
    try {
      await api.post("/newsletter/subscribe", { email });
      setEmail("");
      setState("done");
    } catch (error) {
      setState(error.message || "That did not go through. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-[30.24px]">
      <div>
        <p className="font-ui text-[20.16px] leading-none text-white">Join the Creator Newsletter</p>
        <p className="mt-2 font-ui text-[13px] leading-snug text-subtext">
          Creator updates, featured work and opportunities. Optional, and you can leave any time.
        </p>
      </div>

      {/* The circles keep their size; the link around them is a thumb's
          width, so the gap shrinks to hold the row together. */}
      <ul className="flex items-center gap-[12px]">
        {SOCIALS.map(({ label, icon, url }) => (
          <li key={label}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="group flex size-11 items-center justify-center"
            >
              <span className="flex size-[26.88px] items-center rounded-[13.44px] border-[1.26px] border-neutral-400 p-[3.36px] transition-colors group-hover:border-white">
                <img src={icon} alt="" className="size-[20.16px]" />
              </span>
            </a>
          </li>
        ))}
      </ul>

      <div className="w-full max-w-[402.36px]">
        <form className="flex gap-[6.72px]" onSubmit={join}>
          <input
            type="email"
            required
            aria-label="Email address"
            placeholder="placeholder@gmail.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              // A new address deserves a fresh answer.
              if (state !== "sending") setState("idle");
            }}
            className="h-[47.04px] min-w-0 flex-1 rounded-[6.72px] border-[0.42px] border-neutral-300 bg-transparent px-[13.44px] font-ui text-[11.76px] text-white outline-none placeholder:text-neutral-400 focus:border-secondary"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="h-[47.04px] w-[126.84px] shrink-0 rounded-[6.72px] bg-secondary px-[13.44px] font-ui text-[13.44px] leading-[1.4] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {state === "sending" ? "Adding you…" : "Get Creator Updates"}
          </button>
        </form>

        {/* Said out loud as well as shown, since the form it belongs to has
            just been submitted and focus is still on the button. */}
        {state !== "idle" && state !== "sending" && (
          <p
            role="status"
            className={`mt-[10px] font-ui text-[12.5px] leading-snug ${
              state === "done" ? "text-subtext" : "text-secondary"
            }`}
          >
            {state === "done"
              ? "You're on the list. Look out for the next one."
              : state}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-background">
      <div className="mx-auto flex max-w-[1263.72px] flex-col gap-12 px-6 pt-[50px] lg:flex-row lg:items-center lg:justify-between lg:gap-8 xl:px-0">
        <div className="flex w-full max-w-[402.36px] flex-col gap-[60px]">
          <a href="/" className="flex items-center gap-3" aria-label="VantaOrigin home">
            <img src={logoMark} alt="" className="h-[42px] w-[40.671px]" />
            <img src={logoWordmark} alt="" className="h-[24.841px] w-[157.459px]" />
          </a>
          <Newsletter />
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-[18px] gap-y-10 sm:flex sm:items-start">
          {LINK_COLUMNS.map(({ title, width, links }) => (
            <div
              key={title}
              className={`flex flex-col gap-[21.6px] ${width}`}
            >
              <h3 className="font-ui text-lg font-medium text-white">{title}</h3>
              <ul className="flex flex-col gap-[24.48px] font-ui text-[15.84px] text-subtext">
                {links.map((link) => {
                  // A link is either a label waiting for a destination, or one
                  // that already has a page.
                  // A link is a page on this site (to), somewhere else (href),
                  // or a label still waiting for a destination.
                  const { label, to, href } = typeof link === "string" ? { label: link } : link;
                  const className = "whitespace-nowrap transition-colors hover:text-white";
                  return (
                    <li key={label}>
                      {to && (
                        <Link to={to} className={className}>
                          {label}
                        </Link>
                      )}
                      {href && (
                        <a href={href} target="_blank" rel="noreferrer" className={className}>
                          {label}
                        </a>
                      )}
                      {!to && !href && (
                        <a href="#" className={className}>
                          {label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Logo pattern band: two rows peeking up from the bottom edge. */}
      <div aria-hidden="true" className="relative mt-[59.53px] h-[234px] overflow-hidden">
        <PatternRow top={-15.9} />
        <PatternRow top={112.37} logo={logoMark} />
      </div>
    </footer>
  );
}
