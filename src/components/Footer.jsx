import logoMark from "../assets/landing/footer/logo-mark.svg";
import logoWordmark from "../assets/landing/footer/logo-wordmark.svg";
import instagramIcon from "../assets/landing/footer/instagram.svg";
import facebookIcon from "../assets/landing/footer/facebook.svg";
import tiktokIcon from "../assets/landing/footer/tiktok.svg";
import pattern4962 from "../assets/landing/footer/pattern-4962.svg";
import pattern4967 from "../assets/landing/footer/pattern-4967.svg";
import pattern4968 from "../assets/landing/footer/pattern-4968.svg";

const SOCIALS = [
  { label: "Instagram", icon: instagramIcon },
  { label: "Facebook", icon: facebookIcon },
  { label: "TikTok", icon: tiktokIcon },
];

const LINK_COLUMNS = [
  { title: "Platform", width: "sm:w-[133.2px]", links: ["Explore Comics", "Creator Studio"] },
  { title: "Community", width: "sm:w-[184.8px]", links: ["Event & Realm Wars", "Marketplace", "Leaderbroads", "Help Center"] },
  { title: "Support", width: "sm:w-[136.8px]", links: ["Contact Us", "Term of Service", "Privacy Policy", "About"] },
  { title: "Socials", width: "sm:min-w-[70.56px]", links: ["Discord", "X(Twitter)", "Instagram"] },
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
  return (
    <div className="flex flex-col gap-[30.24px]">
      <p className="font-ui text-[20.16px] leading-none text-white">Join our newsletter</p>

      <ul className="flex items-center gap-[29.4px]">
        {SOCIALS.map(({ label, icon }) => (
          <li key={label}>
            <a
              href="#"
              aria-label={label}
              className="flex size-[26.88px] items-center rounded-[13.44px] border-[1.26px] border-neutral-400 p-[3.36px] transition-colors hover:border-white"
            >
              <img src={icon} alt="" className="size-[20.16px]" />
            </a>
          </li>
        ))}
      </ul>

      <form className="flex w-full max-w-[402.36px] gap-[6.72px]" onSubmit={(event) => event.preventDefault()}>
        <input
          type="email"
          required
          aria-label="Email address"
          placeholder="placeholder@gmail.com"
          className="h-[47.04px] min-w-0 flex-1 rounded-[6.72px] border-[0.42px] border-neutral-300 bg-transparent px-[13.44px] font-ui text-[11.76px] text-white outline-none placeholder:text-neutral-400 focus:border-secondary"
        />
        <button
          type="submit"
          className="h-[47.04px] w-[126.84px] shrink-0 rounded-[6.72px] bg-secondary px-[13.44px] font-ui text-[13.44px] leading-[1.4] text-white transition-opacity hover:opacity-90"
        >
          Send Email
        </button>
      </form>
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
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="whitespace-nowrap transition-colors hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
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
