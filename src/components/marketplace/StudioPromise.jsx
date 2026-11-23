// What a brief actually buys, sliding past where the artist chips were.
//
// The chips named the artists behind each album and let somebody filter by
// one. That is how a marketplace of freelancers works, and it told a client
// who to ask for by name, which is the opposite of what a studio sells: the
// studio picks the right person, stands behind the work, and is who the
// client has the agreement with. So the names came out and this went in.
//
// A strip rather than a paragraph because it sits above the grid, where a
// block of prose would push the work itself off the screen.

// Said in the order somebody worries about them: who is doing this, who is
// answerable for it, is it the right person, is it any good, will it be late.
const PROMISES = [
  "Every brief is matched to a VantaOrigin Studio artist, vetted by us.",
  "The studio manages the project from the brief to the final file.",
  "You are matched to the professional whose style suits your project.",
  "Work is checked by the studio before it reaches you.",
  "Delivered on the date agreed, not whenever it happens to be ready.",
];

function Run({ hidden }) {
  return (
    <ul
      className="flex shrink-0 items-center gap-10 pr-10 font-ui text-sm text-neutral-200 sm:text-base"
      aria-hidden={hidden || undefined}
    >
      {PROMISES.map((line) => (
        <li key={line} className="flex shrink-0 items-center gap-10">
          <span className="whitespace-nowrap">{line}</span>
          <span aria-hidden="true" className="text-[#a855f7]">
            &bull;
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function StudioPromise() {
  return (
    <div
      className="group scrollbar-none overflow-x-auto border-b border-white/10 bg-[#2b3547] py-3.5"
      // A region rather than a banner landmark: there is one of those on the
      // page already, and this is a strip of copy, not navigation.
      role="region"
      aria-label="How a brief works"
    >
      {/* Two runs of the same list, sliding the width of one. The second is
          hidden from screen readers: it exists so the loop has something to
          show while the first scrolls out, and hearing every promise twice
          is not a feature.

          Paused on hover, so a line somebody is halfway through reading
          stops instead of escaping. Stopped outright for anybody who has
          asked for less motion, and the strip stays scrollable by hand so
          the copy is still reachable when it is not moving. */}
      <div className="flex w-max animate-marquee [animation-duration:46s] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        <Run />
        <Run hidden />
      </div>
    </div>
  );
}
