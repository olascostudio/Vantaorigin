// The frame around every admin screen.
//
// There were eight sections as a row of pills, which wrapped onto three
// lines on a narrow window and gave no hint that Newsletter, Letters,
// Announcements and Blocked are all one subject. Eight flat things of
// equal weight is the definition of cluttered: nothing is grouped, so
// everything has to be read.
//
// So: a sidebar, grouped under headings, with the group names doing the
// work the pills could not. Four groups of two or three reads as four
// things, not eight.
//
// Light, because this is a tool somebody reads numbers and addresses in
// for long stretches, often beside other light tools, and the dark panel
// it inherited from the public site was never chosen for that job.
import { useState } from "react";
import { Link } from "react-router-dom";
import logoMark from "../assets/landing/hero/logo-mark.svg";

// Measured on white, the same palette the emails use.
//   ink    #1b2233  15.9 : 1
//   body   #39435a   9.9 : 1
//   muted  #677181   4.7 : 1
// The accent only ever carries white bold text or sits behind it, never
// small grey copy.
export const PAGE = "bg-[#f6f7f9]";
export const CARD = "rounded-xl border border-[#e6e8ec] bg-white";
export const INK = "text-[#1b2233]";
export const BODY = "text-[#39435a]";
export const MUTED = "text-[#677181]";

export const GROUPS = [
  { name: "At a glance", items: ["Overview"] },
  { name: "Watching", items: ["Reports", "Creators", "Characters"] },
  { name: "Writing", items: ["Blog", "Letters", "Announcements"] },
  { name: "The list", items: ["Newsletter", "Blocked"] },
  // Distribution. One item for now: the costs everything else is computed
  // from, and the only place a printer's quote can be typed in.
  { name: "Selling books", items: ["Costs and rates"] },
];

const ALL = GROUPS.flatMap((g) => g.items);
export const TABS = ALL;

function Item({ name, active, count, onPick }) {
  return (
    <button
      type="button"
      onClick={() => onPick(name)}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-ui text-sm transition-colors ${
        active
          ? "bg-[#1b2233] font-bold text-white"
          : "font-medium text-[#39435a] hover:bg-[#eef0f4]"
      }`}
    >
      {name}
      {count > 0 && (
        <span
          className={`ml-2 rounded-full px-2 py-0.5 font-ui text-xs font-bold ${
            active ? "bg-white/20 text-white" : "bg-[#fc187b] text-white"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Nav({ tab, onPick, counts }) {
  return (
    <nav aria-label="Admin sections" className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <div key={group.name}>
          <p className="px-3 pb-2 font-ui text-[11px] font-bold uppercase tracking-wider text-[#6a717d]">
            {group.name}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((name) => (
              <Item
                key={name}
                name={name}
                active={tab === name}
                count={counts?.[name] ?? 0}
                onPick={onPick}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminShell({ tab, onPick, counts, title, intro, children }) {
  // On a phone the sidebar is a drawer. Sitting it above the content
  // instead would put three groups of links between somebody and the thing
  // they came to read, every time.
  const [open, setOpen] = useState(false);

  const pick = (name) => {
    onPick(name);
    setOpen(false);
  };

  return (
    <div className={`min-h-screen ${PAGE}`}>
      <div className="mx-auto flex max-w-[1400px]">
        {/* Sidebar, on anything wide enough to spare the room. */}
        <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 border-r border-[#e6e8ec] bg-white px-4 py-6 lg:block">
          <Link to="/" className="mb-8 flex items-center gap-2 px-3">
            <img src={logoMark} alt="" className="h-7 w-auto" aria-hidden="true" />
            <span className={`font-ui text-base font-bold ${INK}`}>VantaOrigin</span>
          </Link>
          <Nav tab={tab} onPick={pick} counts={counts} />
          <Link
            to="/creators-hub"
            className={`mt-8 block px-3 font-ui text-sm ${MUTED} hover:text-[#1b2233]`}
          >
            Back to your hub
          </Link>
        </aside>

        <div className="min-w-0 flex-1">
          {/* The bar across the top: where you are, and on a phone the way
              to somewhere else. */}
          <header className="sticky top-0 z-20 border-b border-[#e6e8ec] bg-[#f6f7f9]/95 px-5 py-4 backdrop-blur sm:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open the admin sections"
                className="rounded-md border border-[#e6e8ec] bg-white px-3 py-2 font-ui text-sm font-bold text-[#1b2233] lg:hidden"
              >
                Sections
              </button>
              <div className="min-w-0">
                <h1 className={`truncate font-ui text-xl font-bold sm:text-2xl ${INK}`}>
                  {title}
                </h1>
                {intro && <p className={`mt-0.5 font-ui text-sm ${MUTED}`}>{intro}</p>}
              </div>
            </div>
          </header>

          <main className="px-5 pb-20 pt-6 sm:px-8">{children}</main>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="h-full w-[260px] overflow-y-auto bg-white px-4 py-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between px-3">
              <span className={`font-ui text-base font-bold ${INK}`}>Sections</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md px-2 py-1 font-ui text-lg text-[#677181]"
              >
                &times;
              </button>
            </div>
            <Nav tab={tab} onPick={pick} counts={counts} />
          </div>
        </div>
      )}
    </div>
  );
}
