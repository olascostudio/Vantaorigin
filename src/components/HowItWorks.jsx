import { useEffect, useRef, useState } from "react";
import SectionHeading from "./SectionHeading";

// x/y place each step along the curve on the 1376px desktop stage.
const STEPS = [
  {
    title: "Create your page",
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
    text: "Manage your characters and keep your page updated as your creative work grows.",
    x: "837px",
    y: "197.8px",
  },
  {
    title: "Share Your Link",
    text: "Get your public link and put it on Instagram, TikTok, X, Discord, or anywhere your audience finds you.",
    x: "1096px",
    y: "109.8px",
  },
];

// The curve, lifted out of journey-curve.svg so it can be drawn rather than
// just shown. An <img> is a picture: nothing inside it can be animated.
//
// Note the direction. The path is authored from the top right and ends at
// the bottom left, which is backwards from how anybody reads this section.
// Drawing it in its own direction would start at "Share Your Link" and
// finish at "Create your page", telling the story in reverse.
const CURVE =
  "M1354.34 39.6C1350.74 39.6 1335.16 27.5626 1263.86 27.5625C1222.1 27.5624 1218.5 34.7626 1076.66 72.2028C1030.06 84.5035 980.299 141.714 944.926 137.141C939.247 136.407 936.107 135.65 930.411 135.067C903.315 132.296 886.6 132.141 860.945 141.288C844.387 147.191 835.913 152.93 821.547 163.061C808.41 172.324 801.828 178.671 790.443 190.017C776.196 204.217 770.12 213.945 757.265 229.416C729.664 262.635 719.148 285.762 687.8 315.47C678.427 324.352 673.422 329.736 662.916 337.243C649.796 346.617 641.568 350.874 626.628 356.942C615.238 361.569 608.792 365.028 596.561 366.273C581.921 367.764 573.847 362.849 559.236 361.089C518.538 356.189 495.467 351.909 454.519 353.832C443.973 354.327 438.016 354.422 427.563 355.905C409.77 358.431 399.589 360.446 382.98 367.31C359.525 377.005 348.49 387.262 329.067 403.598C307.803 421.483 301.293 437.195 280.337 455.438C265.068 468.731 257.405 478.412 238.865 486.543C224.745 492.735 215.899 495.052 200.503 495.874C173.623 497.308 159.338 486.703 134.148 477.211C86.4471 459.238 10.337 418.523 10.337 418.523";

// Where each step's marker sits, in the same order as STEPS: bottom left
// first, top right last.
const DOTS = [
  [207.739, 498.6],
  [594.136, 363],
  [960.136, 138.6],
  [1267.34, 27],
];

const DRAW_MS = 2400;

const wantsStillness = () => {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
};

// How far along the path each marker sits, as a fraction, found by walking
// the real path rather than guessing from the coordinates. If somebody
// redraws the curve the markers still light up in the right places.
const evenlySpaced = () => DOTS.map((_, i) => i / DOTS.length);

// Measuring a path is not something every engine can do: jsdom has neither
// of these, and reaching for them unguarded took the whole section down
// rather than only the animation.
const canMeasure = (path) =>
  typeof path?.getTotalLength === "function" && typeof path?.getPointAtLength === "function";

function markerTimings(path) {
  const total = path.getTotalLength();
  if (!total) return evenlySpaced();

  const samples = 600;
  const nearest = DOTS.map(() => ({ at: 0, gap: Infinity }));

  for (let i = 0; i <= samples; i += 1) {
    const at = (total * i) / samples;
    const point = path.getPointAtLength(at);
    DOTS.forEach(([x, y], index) => {
      const gap = (point.x - x) ** 2 + (point.y - y) ** 2;
      if (gap < nearest[index].gap) nearest[index] = { at, gap };
    });
  }

  // The line is drawn from the path's end, so a marker near the end is
  // reached first. That is what turns a backwards path into a forwards
  // story.
  return nearest.map(({ at }) => (total - at) / total);
}

export default function HowItWorks() {
  const section = useRef(null);
  const path = useRef(null);
  const [drawn, setDrawn] = useState(false);
  const [timings, setTimings] = useState(evenlySpaced);
  // A guess until the path can be measured. It only has to be long enough to
  // keep the line hidden on the first paint; anything shorter would show a
  // flash of the finished curve before the observer has a chance to run.
  const [length, setLength] = useState(4000);

  useEffect(() => {
    const node = section.current;
    const line = path.current;
    if (!node || !line) return undefined;

    // Without measurement there is no sensible way to draw it, so show it
    // finished. Still for anybody who asked for less movement too, and drawn
    // rather than missing either way: the line is the content here, not
    // decoration on top of it.
    if (!canMeasure(line) || wantsStillness() || typeof IntersectionObserver !== "function") {
      setDrawn(true);
      return undefined;
    }

    setLength(line.getTotalLength() || 4000);
    setTimings(markerTimings(line));

    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setDrawn(true);
        watcher.disconnect();
      },
      { threshold: 0.25 }
    );
    watcher.observe(node);
    return () => watcher.disconnect();
  }, []);

  return (
    <section
      ref={section}
      id="how-it-works"
      className="flex flex-col items-center gap-[3px] overflow-hidden bg-background px-4 pb-[60px] pt-[61px] sm:px-8"
    >
      <SectionHeading
        title="How It Works"
        subtitle="Create your page, add your characters, keep them organised, and share one link with your audience."
      />

      {/* Below lg the steps are a plain timeline; from lg up they sit on the
          curve, with the whole 1376px stage scaled to fit. */}
      <div className="relative mt-10 w-full lg:mt-0 lg:h-[409px] xl:h-[496px] min-[1440px]:h-[583.8px]">
        <div className="lg:absolute lg:left-1/2 lg:top-0 lg:h-[583.8px] lg:w-[1376px] lg:origin-top lg:-translate-x-1/2 lg:scale-[0.7] xl:scale-[0.85] min-[1440px]:scale-100">
          <div className="absolute left-0 top-0 hidden h-[525.6px] w-[1344px] lg:block">
            <div className="absolute" style={{ inset: "0 -0.65% -2.74% -0.77%" }}>
              <svg
                viewBox="0 0 1363.13 540"
                preserveAspectRatio="none"
                fill="none"
                aria-hidden="true"
                className="block size-full max-w-none overflow-visible"
              >
                <path
                  ref={path}
                  d={CURVE}
                  stroke="#FC187B"
                  strokeWidth="7.2"
                  style={{
                    filter: "drop-shadow(0 0 7px rgba(252, 24, 123, 0.55))",
                    strokeDasharray: length,
                    // Negative offset hides the line from its start, so what
                    // appears first is the end: the bottom left.
                    strokeDashoffset: drawn ? 0 : -length,
                    transition: `stroke-dashoffset ${DRAW_MS}ms cubic-bezier(0.37, 0, 0.2, 1)`,
                  }}
                />

                {DOTS.map(([cx, cy], index) => (
                  <g
                    key={`${cx}-${cy}`}
                    style={{
                      opacity: drawn ? 1 : 0,
                      transform: drawn ? "scale(1)" : "scale(0.4)",
                      transformOrigin: `${cx}px ${cy}px`,
                      transition: `opacity 260ms ease-out ${timings[index] * DRAW_MS}ms, transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1) ${timings[index] * DRAW_MS}ms`,
                    }}
                  >
                    <circle cx={cx} cy={cy} r="27" fill="#0E0E0E" />
                    <circle
                      cx={cx + 0.9}
                      cy={cy + 0.9}
                      r="13.5"
                      fill="#FFA4CC"
                      style={{ filter: "drop-shadow(0 0 8px rgba(255, 164, 204, 0.7))" }}
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <ol className="relative mx-auto flex max-w-md flex-col gap-8 pl-6 lg:contents">
            {/* The mobile rail, grown rather than drawn. There is no curve
                here to follow, so it runs the way the steps read. */}
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-0.5 origin-top bg-primary lg:hidden"
              style={{
                transform: drawn ? "scaleY(1)" : "scaleY(0)",
                transition: `transform ${DRAW_MS}ms cubic-bezier(0.37, 0, 0.2, 1)`,
              }}
            />

            {STEPS.map(({ title, text, x, y }, index) => (
              <li
                key={title}
                className="flex flex-col gap-2.5 lg:absolute lg:left-[var(--x)] lg:top-[var(--y)] lg:w-[280px]"
                style={{
                  "--x": x,
                  "--y": y,
                  opacity: drawn ? 1 : 0,
                  transform: drawn ? "translateY(0)" : "translateY(10px)",
                  transition: `opacity 420ms ease-out ${timings[index] * DRAW_MS}ms, transform 420ms cubic-bezier(0.22, 1, 0.36, 1) ${timings[index] * DRAW_MS}ms`,
                }}
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
