import SectionHeading from "./SectionHeading";
import obaaluMask from "../assets/landing/realms/obaalu-mask.svg";
import obaaluIcon from "../assets/landing/realms/obaalu-icon.svg";
import iyanuMask from "../assets/landing/realms/iyanu-mask.svg";
import iyanuIcon from "../assets/landing/realms/iyanu-icon.svg";
import urukojinMask from "../assets/landing/realms/urukojin-mask.svg";
import urukojinIcon from "../assets/landing/realms/urukojin-icon.svg";
import eganonMaskShape from "../assets/landing/realms/eganon-mask-shape.svg";
import eganonArt from "../assets/landing/realms/eganon-art.svg";
import eganonIcon from "../assets/landing/realms/eganon-icon.svg";

function MaskArt({ src }) {
  return <img src={src} alt="" className="absolute left-[-1.05px] top-[-1.05px] h-[631.579px] w-[578.947px] max-w-none" />;
}

// Eganon's artwork is clipped by a separate alpha-mask shape in Figma.
function EganonArt() {
  return (
    <div
      className="absolute left-[164.21px] top-[211.58px] h-[535.79px] w-[370.371px]"
      style={{
        maskImage: `url("${eganonMaskShape}")`,
        maskMode: "alpha",
        maskRepeat: "no-repeat",
        maskPosition: "-164.21px -211.579px",
        maskSize: "578.947px 631.579px",
        WebkitMaskImage: `url("${eganonMaskShape}")`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "-164.21px -211.579px",
        WebkitMaskSize: "578.947px 631.579px",
      }}
    >
      <div className="absolute" style={{ inset: "-0.67% -0.6% -0.56% -0.6%" }}>
        <img src={eganonArt} alt="" className="block size-full max-w-none" />
      </div>
    </div>
  );
}

const REALMS = [
  {
    id: "obaalu",
    title: "Obaalu — The Emberforge of Creation",
    lead: "Born of flame and molten will, Obaalu represents the relentless spirit of creation. ",
    body: (
      <>
        <span className="font-normal">
          It’s the realm of builders, warriors, and innovators who turn raw passion into tangible
          power. From its endless furnaces, new ideas are forged into legends
        </span>
        .
      </>
    ),
    art: <MaskArt src={obaaluMask} />,
    icon: obaaluIcon,
    iconInset: "calc(10% - 0.84px) calc(81.71% + 0.67px) calc(81.67% + 0.67px) calc(10.88% - 0.82px)",
    cardBg: "bg-black/[0.07]",
  },
  {
    id: "iyanu",
    title: (
      <>
        Iyanu — The Eternal
        <br />
        Flow
      </>
    ),
    lead: "The realm of dreams and reflection, Iyanu embodies creativity in motion. ",
    body: "Here, stories ripple like waves - ever-changing, ever-evolving. Its dwellers are poets, healers, and visionaries who shape emotion into art.",
    art: <MaskArt src={iyanuMask} />,
    icon: iyanuIcon,
    iconInset: "calc(11.67% - 0.81px) calc(81.95% + 0.67px) calc(80% + 0.63px) calc(10.91% - 0.82px)",
    cardBg: "bg-black",
  },
  {
    id: "urukojin",
    title: "Urukojin — The Celestial Drift",
    lead: "Realm of the unseen and the untamed. Urukojin is freedom incarnate — ",
    body: "where winds carry voices of old myths and ideas soar without limits. It’s home to explorers, dreamers, and thinkers who chase horizons beyond logic.",
    art: <MaskArt src={urukojinMask} />,
    icon: urukojinIcon,
    iconInset: "calc(12.5% - 0.79px) calc(80% + 0.63px) calc(80.95% + 0.65px) calc(10.91% - 0.82px)",
    cardBg: "bg-black/[0.07]",
  },
  {
    id: "eganon",
    title: "Eganon — The Core of Eternity",
    lead: "A realm rooted in endurance and legacy. ",
    body: "Eganon is where time itself solidifies into eternal stone. Its creators build worlds that outlive their makers — unyielding, wise, and unshakable.",
    art: <EganonArt />,
    icon: eganonIcon,
    iconInset: "calc(11.81% - 0.8px) calc(78.18% + 0.59px) calc(79.86% + 0.63px) calc(10.91% - 0.82px)",
    cardBg: "bg-black/[0.07]",
  },
];

function RealmCard({ title, lead, body, art, icon, iconInset, cardBg }) {
  return (
    <article
      className={`relative flex min-h-[560px] w-full max-w-[578.947px] flex-col overflow-hidden rounded-[42.105px] border-[1.053px] border-primary px-6 pb-[43px] pt-[180px] sm:h-[631.579px] sm:pl-[44px] sm:pr-[45px] ${cardBg}`}
    >
      {art}
      <img src={icon} alt="" className="absolute" style={{ inset: iconInset }} />

      <h3 className="relative max-w-[484.211px] font-ui text-[32px] font-black tracking-[-0.2105px] text-white sm:text-[42.105px]">
        {title}
      </h3>
      <p className="relative mt-5 max-w-[477.895px] font-ui text-lg font-medium leading-[1.5] text-white sm:text-[21.053px] sm:leading-[31.579px]">
        <span className="font-bold">{lead}</span>
        {body}
      </p>

      <div className="relative mt-auto flex items-center justify-between gap-4 pt-6">
        <a
          href="#join"
          className="rounded-[52.632px] bg-secondary px-[36.842px] py-[18.947px] font-ui text-[21.053px] font-bold text-white transition-opacity hover:opacity-90"
        >
          Open
        </a>
        <p className="whitespace-nowrap font-ui text-[24.211px] text-white">
          <span className="font-black">789k</span> <span className="font-medium">members</span>
        </p>
      </div>
    </article>
  );
}

export default function Realms() {
  return (
    <section id="realms" className="px-4 pb-[18px] pt-[60px] sm:px-8 xl:px-[117px]">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-[65px]">
        <SectionHeading
          title="Create Your Realm"
          subtitle="Every creator begins somewhere. Each Realm represents a different style of storytelling. Pick one, join its community and start building your own legacy."
          subtitleClassName="text-lg tracking-[-0.115px] sm:text-[23px]"
        />

        <div className="flex w-full flex-col items-center gap-[60px]">
          <div className="grid w-full grid-cols-1 justify-items-center gap-[42.105px] lg:grid-cols-2">
            {REALMS.map(({ id, ...realm }) => (
              <RealmCard key={id} {...realm} />
            ))}
          </div>

          <a
            href="#realms"
            className="rounded-[20px] border-[5px] border-[#d2d2d2] bg-white px-12 py-8 font-ui text-[28px] font-bold text-black transition-colors hover:bg-neutral-100"
          >
            See More
          </a>
        </div>
      </div>
    </section>
  );
}
