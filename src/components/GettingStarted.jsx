// The three things to do first, for somebody who has not done them.
//
// Put here, in the hub, rather than on the public site, because the hub is
// where the loss actually is. The admin funnel counts four steps: made an
// account, confirmed their email, made a character, published one. The
// biggest fall is between confirming an address and making anything,
// which is a person who signed up, arrived at an empty page, and left. A
// tour on the homepage would not have reached them; they were already
// past it.
//
// Every step reads its state from what the account really has, so this
// cannot tell somebody to do a thing they have done. When all three are
// done it does not congratulate anybody, it disappears.
import { useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "./Reveal";

const DISMISSED = "vantaorigin.getting-started.hidden";

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
    // Then it comes back next visit, which is a small cost and not worth
    // a second mechanism.
  }
};

function Step({ done, title, note, action, to, onAction }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
          done ? "border-[#3ecf6a] bg-[#3ecf6a] text-[#10281a]" : "border-white/30 text-transparent"
        }`}
      >
        ✓
      </span>
      <div className="min-w-0">
        <p className={`font-ui text-base font-bold ${done ? "text-neutral-500 line-through" : "text-white"}`}>
          {title}
        </p>
        {!done && <p className="mt-0.5 font-ui text-sm leading-relaxed text-neutral-400">{note}</p>}
        {!done &&
          (onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="mt-2 font-ui text-sm font-bold text-[#4ea1ff] hover:underline"
            >
              {action}
            </button>
          ) : (
            <Link to={to} className="mt-2 inline-block font-ui text-sm font-bold text-[#4ea1ff] hover:underline">
              {action}
            </Link>
          ))}
      </div>
    </li>
  );
}

export default function GettingStarted({ settings, characters, onShare, copied }) {
  const [gone, setGone] = useState(hidden);

  const named = Boolean(settings?.firstName || settings?.lastName || settings?.bio);
  const made = (characters?.length ?? 0) > 0;
  const published = (characters || []).some((character) => character.isPublic);

  const left = [named, made, published].filter((done) => !done).length;

  // Nothing to say to somebody who has done all three. The panel is not a
  // trophy cabinet.
  if (gone || left === 0) return null;

  return (
    <Reveal className="mx-auto mt-8 w-full max-w-[1620px] px-6 lg:px-12">
      <section
        aria-labelledby="getting-started"
        className="rounded-2xl border border-white/10 bg-[#222c40] p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="getting-started" className="font-ui text-lg font-bold text-white">
              Getting started
            </h2>
            <p className="mt-1 font-ui text-sm text-neutral-400">
              {left === 1 ? "One thing left." : `${left} things left.`} Your page is live either
              way.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              hide();
              setGone(true);
            }}
            className="font-ui text-sm text-neutral-400 hover:text-white"
          >
            Hide this
          </button>
        </div>

        <ol className="mt-5 flex flex-col gap-4">
          <Step
            done={named}
            title="Say who you are"
            note="A name and a line about your work. It is the first thing anybody reads on your page."
            action="Add your details"
            to="/settings/personal"
          />
          <Step
            done={made}
            title="Add your first character"
            note="The thing people come to see. One is enough to make the page worth sharing."
            action="Make a character"
            to="/creators-hub/character/new"
          />
          <Step
            done={published}
            title="Publish it"
            note="A character stays private until you publish it. Nobody can see an unpublished one, including on your own link."
            action="Open your characters"
            to="/creators-hub"
          />
        </ol>

        {published && (
          <button
            type="button"
            onClick={onShare}
            className="mt-5 rounded-full bg-primary px-6 py-2.5 font-ui text-sm font-bold text-white hover:opacity-90"
          >
            Copy your page link
          </button>
        )}

        {copied && (
          <p role="status" className="mt-3 font-ui text-sm text-neutral-300 break-all">
            {copied}
          </p>
        )}
      </section>
    </Reveal>
  );
}
