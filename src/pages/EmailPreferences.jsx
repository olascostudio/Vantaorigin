// Choosing what you hear about.
//
// Reachable from a link in any email, with nobody signed in, because the
// person who most wants this page is holding an email and no patience. The
// token in the address is what stands in for a session.
//
// The three ways out are the whole point of the page. A single "unsubscribe"
// means somebody who wanted one fewer email a month leaves for good, and
// every one of those is a reader lost to a setting that did not exist. So
// each is one press, none of them argues, and none of them asks "are you
// sure?" twice.
import { useCallback, useEffect, useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { api, ApiError } from "../data/api";
import { usePageMeta } from "../data/pageMeta";

// Said in the person's words, not ours. "character_activity" is a column
// name; "when something happens to your characters" is a thing to want.
const CATEGORIES = [
  {
    name: "comments",
    title: "Replies and comments",
    note: "When somebody replies to you or comments on your work.",
  },
  {
    name: "character_activity",
    title: "Your characters",
    note: "Follows, likes and milestones on the characters you have made.",
  },
  {
    name: "battle_challenges",
    title: "Battle challenges",
    note: "When one of your characters is challenged.",
  },
  {
    name: "affiliate_earnings",
    title: "Earnings",
    note: "Payouts, affiliate earnings and anything to do with money.",
  },
];

const CARD = "rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7";

// A switch, not a checkbox dressed up as one: the whole row is the target,
// which matters most on a phone.
//
// `label` is what the switch controls, and it is separate from `title`
// because the two are not always the same thing. The newsletter switch's
// title is its state -- "On, but paused" -- so a screen reader took that as
// the name and read the state twice while never saying what it was a switch
// for, when a sighted reader can see "The creator newsletter" written above
// it. The note is attached as a description rather than folded into the
// name, so it is available without being read out as part of it.
function Switch({ on, onChange, busy, title, note, label }) {
  const noteId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label || title}
      aria-describedby={noteId}
      disabled={busy}
      onClick={() => onChange(!on)}
      className="flex w-full items-start gap-4 rounded-xl px-3 py-4 text-left transition hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          on ? "bg-primary" : "bg-white/20"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white transition-transform ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block font-ui text-base font-bold text-white">{title}</span>
        <span id={noteId} className="mt-1 block font-ui text-sm leading-relaxed text-subtext">
          {note}
        </span>
      </span>
    </button>
  );
}

export default function EmailPreferences() {
  usePageMeta({
    title: "Email preferences",
    description: "Choose what VantaOrigin emails you about.",
    canonicalPath: "/newsletter/preferences",
    noindex: true,
  });

  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const query = token ? `?token=${encodeURIComponent(token)}` : "";

  const [state, setState] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .get(`/newsletter/preferences${query}`)
      .then((answer) => alive && setState(answer))
      .catch((error) =>
        alive &&
        setProblem(
          error instanceof ApiError && error.status === 404
            ? "We could not match this link to an address. Open the link from one of our emails, or sign in and try again."
            : "We could not load your preferences. Try again in a moment."
        )
      );
    return () => {
      alive = false;
    };
  }, [query]);

  const change = useCallback(
    async (patch, message) => {
      setBusy(true);
      setProblem("");
      // The last success goes too. Without this, a save that fails after one
      // that worked leaves "Switched off." sitting in green above "That did
      // not save." in red, and the page is telling the reader both.
      setSaved("");
      try {
        setState(await api.patch(`/newsletter/preferences${query}`, patch));
        setSaved(message);
      } catch {
        setProblem("That did not save. Try again in a moment.");
      } finally {
        setBusy(false);
      }
    },
    [query]
  );

  if (problem && !state) {
    return (
      <Shell>
        <p className="font-ui text-base leading-relaxed text-neutral-200">{problem}</p>
        <Link
          to="/signin"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-ui text-base font-bold text-white"
        >
          Sign in
        </Link>
      </Shell>
    );
  }

  // The footer of a test copy carries a token that belongs to nobody. Saying
  // so plainly beats "we could not match this link", which on a test email
  // reads like the link is broken.
  if (state?.testCopy) {
    return (
      <Shell heading="That was a test copy">
        <p className="font-ui text-base leading-relaxed text-neutral-200">
          Nothing to change here: a test goes to one address and is not on the list. The real
          letter carries a link that belongs to the person reading it.
        </p>
      </Shell>
    );
  }

  if (!state) {
    return (
      <Shell>
        <p className="font-ui text-base text-subtext">Loading…</p>
      </Shell>
    );
  }

  const left = state.marketingStatus === "unsubscribed";
  const paused = state.pausedUntil && new Date(state.pausedUntil) > new Date();

  if (left) {
    return (
      <Shell heading="You are off the list">
        <p className="font-ui text-base leading-relaxed text-neutral-200">
          No more newsletters to {state.email}. Your account, if you have one, stays exactly as it
          is.
        </p>
        {/* Offered with or without an account: the token in the link is a
            secret only that address has, so tapping it is them. */}
        <button
          type="button"
          disabled={busy}
          onClick={() => change({ marketing: true }, "You are back on the list.")}
          className="mt-6 rounded-full border border-white/20 px-6 py-3 font-ui text-base font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
        >
          Actually, put me back on
        </button>
      </Shell>
    );
  }

  return (
    <Shell heading="Email preferences">
      <p className="font-ui text-base leading-relaxed text-neutral-200">
        Settings for <span className="font-bold text-white">{state.email}</span>. Changes save as
        you make them.
      </p>

      {saved && (
        <p role="status" className="mt-4 font-ui text-sm font-bold text-emerald-400">
          {saved}
        </p>
      )}
      {problem && (
        <p role="alert" className="mt-4 font-ui text-sm font-bold text-red-400">
          {problem}
        </p>
      )}

      {paused && (
        <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
          <p className="font-ui text-base font-bold text-white">Paused</p>
          <p className="mt-1 font-ui text-sm leading-relaxed text-neutral-200">
            Nothing until {new Date(state.pausedUntil).toLocaleDateString()}, then it starts again
            on its own. You do not have to remember to come back.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => change({ marketing: true }, "Unpaused.")}
            className="-mx-2 mt-2 px-2 py-3 font-ui text-sm font-bold text-white underline disabled:opacity-60"
          >
            Start again now
          </button>
        </div>
      )}

      <div className={`mt-8 ${CARD}`}>
        <h2 className="font-ui text-lg font-bold text-white">The creator newsletter</h2>
        <p className="mt-1 font-ui text-sm leading-relaxed text-subtext">
          Creator updates, featured work and the occasional opportunity.
        </p>
        <div className="mt-3">
          <Switch
            on={Boolean(state.marketing)}
            busy={busy}
            onChange={(next) =>
              change(
                { marketing: next },
                next ? "You are on the list." : "You are off the newsletter."
              )
            }
            // Not "Sending" while the amber panel above says paused: two
            // true-ish statements that contradict each other read as a bug.
            label="The creator newsletter"
            title={paused ? "On, but paused" : state.marketing ? "Sending" : "Not sending"}
            note={
              state.marketingStatus === "pending"
                ? "We have not sent any yet. Switch this on to say yes."
                : "One letter at a time, never a daily."
            }
          />
        </div>
      </div>

      {state.categories && (
        <div className={`mt-6 ${CARD}`}>
          <h2 className="font-ui text-lg font-bold text-white">About your account</h2>
          <p className="mt-1 font-ui text-sm leading-relaxed text-subtext">
            Switch off anything you would rather not hear about.
          </p>
          <div className="mt-3 divide-y divide-white/5">
            {CATEGORIES.map((category) => (
              <Switch
                key={category.name}
                on={Boolean(state.categories[category.name])}
                busy={busy}
                onChange={(next) =>
                  change({ [category.name]: next }, next ? "Switched on." : "Switched off.")
                }
                title={category.title}
                note={category.note}
              />
            ))}
          </div>
        </div>
      )}

      <div className={`mt-6 ${CARD}`}>
        <h2 className="font-ui text-lg font-bold text-white">Too much?</h2>
        <p className="mt-1 font-ui text-sm leading-relaxed text-subtext">
          Any of these is one press. No forms, and we will not ask you why.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {!paused && (
            <button
              type="button"
              disabled={busy}
              onClick={() => change({ choose: "pause" }, `Paused for ${state.pauseDays} days.`)}
              className="rounded-full border border-white/20 px-5 py-3 font-ui text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              Pause for {state.pauseDays} days
            </button>
          )}
          {state.categories && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                change({ choose: "fewer" }, "Only the newsletter from now on.")
              }
              className="rounded-full border border-white/20 px-5 py-3 font-ui text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              Just the newsletter, nothing else
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => change({ choose: "leave" }, "")}
            className="rounded-full border border-red-400/40 px-5 py-3 font-ui text-sm font-bold text-red-300 transition hover:bg-red-400/10 disabled:opacity-60"
          >
            Unsubscribe from everything
          </button>
        </div>
      </div>

      <p className="mt-8 font-ui text-sm leading-relaxed text-subtext">
        Password resets, verification codes, security notices and changes to our terms are not
        optional — they are how we reach you about your own account. Everything else is above.
      </p>
    </Shell>
  );
}

function Shell({ heading = "Email preferences", children }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-[680px] px-6 pb-24 pt-12 sm:pt-16">
        <h1 className="font-ui text-[32px] font-bold leading-tight text-white sm:text-[40px]">
          {heading}
        </h1>
        <div className="mt-5">{children}</div>
      </main>
    </div>
  );
}
