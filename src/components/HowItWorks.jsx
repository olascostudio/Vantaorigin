import SectionHeading from "./SectionHeading";
import journeyCurve from "../assets/landing/how/journey-curve.svg";

// x/y place each step along the curve on the 1376px desktop stage.
const STEPS = [
  {
    title: "Create Your Realm",
    text: "Set up your personal character hub and make it yours.",
    x: "245px",
    y: "495.8px",
  },
  {
    title: "Add Your Characters",
    text: "Create character profiles with artwork, information, links, and other details.",
    x: "569px",
    y: "393.8px",
  },
  {
    title: "Organize Your Characters",
    text: "Manage your characters and keep your Realm updated as your creative work grows.",
    x: "837px",
    y: "197.8px",
  },
  {
    title: "Share Your Link",
    text: "Get your public Realm link and put it on Instagram, TikTok, X, Discord, or anywhere your audience finds you.",
    x: "1096px",
    y: "109.8px",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="flex flex-col items-center gap-[3px] overflow-hidden bg-background px-4 pb-[60px] pt-[61px] sm:px-8"
    >
      <SectionHeading
        title="How Your Realm Works"
        subtitle="Create your Realm, add your characters, keep them organised, and share one link with your audience."
      />

      {/* Below lg the steps are a plain timeline; from lg up they sit on the
          curve, with the whole 1376px stage scaled to fit. */}
      <div className="relative mt-10 w-full lg:mt-0 lg:h-[409px] xl:h-[496px] min-[1440px]:h-[583.8px]">
        <div className="lg:absolute lg:left-1/2 lg:top-0 lg:h-[583.8px] lg:w-[1376px] lg:origin-top lg:-translate-x-1/2 lg:scale-[0.7] xl:scale-[0.85] min-[1440px]:scale-100">
          <div className="absolute left-0 top-0 hidden h-[525.6px] w-[1344px] lg:block">
            <div className="absolute" style={{ inset: "0 -0.65% -2.74% -0.77%" }}>
              <img src={journeyCurve} alt="" className="block size-full max-w-none" />
            </div>
          </div>

          <ol className="mx-auto flex max-w-md flex-col gap-8 border-l-2 border-primary pl-6 lg:contents">
            {STEPS.map(({ title, text, x, y }) => (
              <li
                key={title}
                className="flex flex-col gap-2.5 lg:absolute lg:left-[var(--x)] lg:top-[var(--y)] lg:w-[280px]"
                style={{ "--x": x, "--y": y }}
              >
                <h3 className="font-ui text-xl font-semibold leading-[38.113px] text-white">{title}</h3>
                <p className="font-ui text-sm text-neutral-300 opacity-80">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
