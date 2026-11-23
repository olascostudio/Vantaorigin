// What each control in the hub actually does, said once.
//
// This replaces the "Getting started" checklist. The checklist told somebody
// what to do next but never what anything was, and it did it from inside the
// page flow: 467px on a phone, 59% of the screen, sitting between the profile
// and the characters somebody came to see. A guide to the buttons does not
// belong in the scroll at all, so this floats instead and the flow keeps its
// height.
//
// No checkboxes. Their state was read off the account, which made them honest
// but also made the panel a progress meter, and progress was never the
// question being asked. The question is what the buttons are for.
import { useState } from "react";
import { seenTour } from "../data/tour";

const DISMISSED = "vantaorigin.hub-guide.hidden";

const hidden = () => {
  try {
    return window.localStorage.getItem(DISMISSED) === "yes";
  } catch {
    return false;
  }
};

const hide = () => {
  try {
    window.localStorage.setItem(DISMISSED, "yes");
  } catch {
    // Then it comes back next visit, which is a small cost and not worth a
    // second mechanism.
  }
};

// Named as they are labelled on screen, so somebody can match them up by
// eye without being told where to look.
const CONTROLS = [
  {
    name: "View your page",
    does: "Opens your public page, the one visitors see at the link you share.",
  },
  {
    name: "Subscribers",
    does: "Everyone who followed you, and somewhere to write to them.",
  },
  {
    name: "Creator Studio",
    does: "Selling printed copies of your work. Not open yet.",
  },
  {
    name: "Edit",
    does: "Your name, and the line about you underneath it.",
  },
  {
    name: "Share",
    does: "Copies your page link, ready to paste anywhere.",
  },
  {
    name: "Add Category",
    does: "Groups your characters, so a visitor can tell one project from another.",
  },
];

export default function HubGuide() {
  const [gone, setGone] = useState(hidden);

  // The tour says the same things, one control at a time and pointing at
  // each. While it is still on offer this would be a second card saying so
  // over the top of it, so this waits until the tour has been taken or
  // turned down and then stays as the reference you can reopen.
  if (gone || !seenTour()) return null;

  return (
    // Fixed, so it costs the page no height. Full width inside a gutter on a
    // phone, a panel in the corner once there is room for one.
    //
    // Capped at half the screen on a phone, because a floating thing that
    // covers most of the screen is the problem this was meant to solve: at
    // 70vh it came to 568px of 812, which is the old checklist's footprint
    // moved rather than removed. The list scrolls inside that.
    <aside
      aria-labelledby="hub-guide"
      className="fixed inset-x-3 bottom-3 z-40 flex max-h-[50vh] flex-col rounded-2xl border border-white/15 bg-[#222c40] p-4 shadow-lg sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-h-[70vh] sm:w-[340px] sm:p-5"
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="hub-guide" className="font-ui text-base font-bold text-white">
            What each button does
          </h2>
          <p className="mt-1 font-ui text-sm text-neutral-400">
            Close this when you have the hang of it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            hide();
            setGone(true);
          }}
          aria-label="Close the guide"
          title="Close the guide"
          className="-mr-1.5 -mt-1.5 flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6 18 18M18 6 6 18" />
          </svg>
        </button>
      </div>

      {/* The header stays put and only the list scrolls, so the way out of
          the panel is never the thing you have to scroll to reach. */}
      <dl className="mt-3 flex min-h-0 flex-col gap-2.5 overflow-y-auto">
        {CONTROLS.map(({ name, does }) => (
          <div key={name}>
            <dt className="font-ui text-sm font-bold text-white">{name}</dt>
            <dd className="mt-0.5 font-ui text-[13px] leading-snug text-neutral-400">{does}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
