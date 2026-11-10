import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { sendFeedback } from "../data/feedback";

// The line under the navbar that says this is a beta, and asks.
//
// It scrolls only when it has to. The words are measured against the space
// they have, and they move only if they do not fit, which on a wide screen
// they always do. That is better than picking a width and guessing: a longer
// line, a translation or somebody's larger default font all still get read
// instead of being quietly cut off.
//
// Nothing moves for somebody who has asked for less movement, and nothing
// moves while it is being hovered, focused or held. A marquee you cannot
// stop is a marquee you cannot read.
//
// Dismissal is remembered. It is read before the first paint rather than in
// an effect, so a banner already turned off never appears and then vanishes,
// pushing the page down and back on the way.

const LINE =
  "VantaOrigin is in beta. Share a quick piece of feedback and help us build your perfect creative tool.";

const REMEMBERED = "vantaorigin.beta-banner.dismissed";

// Nobody signed in and working needs a beta notice across their workspace,
// and these pages are nobody else's business anyway.
const PRIVATE = ["/creators-hub", "/settings", "/admin", "/signin", "/signup", "/auth", "/forgot-password"];

// Browser storage is not always there: a private window, blocked site data,
// or an embedded view can throw on the way in or out.
const wasDismissed = () => {
  try {
    return window.localStorage.getItem(REMEMBERED) === "yes";
  } catch {
    return false;
  }
};

const rememberDismissal = () => {
  try {
    window.localStorage.setItem(REMEMBERED, "yes");
  } catch {
    // Forgetting is survivable. It comes back next visit, which is a smaller
    // problem than failing to close.
  }
};

const prefersStillness = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

function FeedbackForm({ onClose, onSent }) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const box = useRef(null);
  const titleId = useId();

  // Taken to the first field, and Escape closes, because a panel that traps
  // you is worse than no panel.
  useEffect(() => {
    box.current?.focus();
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = async (event) => {
    event.preventDefault();
    if (!message.trim() || busy) return;

    setBusy(true);
    setProblem("");
    try {
      await sendFeedback({
        message: message.trim(),
        email: email.trim(),
        // Where they were when they said it, which is most of the context.
        page: window.location.href,
      });
      onSent();
    } catch (error) {
      setProblem(error.message || "That did not send. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[12vh]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        onSubmit={send}
        className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#1b2233] p-5 shadow-card"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-ui text-lg font-bold leading-tight text-white">
            Tell us what you think
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 shrink-0 rounded-full p-2 font-ui text-sm text-neutral-400 transition-colors hover:text-white"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <label className="mt-4 block">
          <span className="font-ui text-sm text-neutral-300">What is on your mind?</span>
          <textarea
            ref={box}
            required
            rows={4}
            maxLength={4000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="What worked, what did not, what you wish it did…"
            className="mt-2 w-full resize-y rounded-lg border border-white/15 bg-black/30 px-4 py-3 font-ui text-sm leading-relaxed text-white outline-none placeholder:text-neutral-600 focus:border-[#6b8ff5]"
          />
        </label>

        <label className="mt-3 block">
          <span className="font-ui text-sm text-neutral-300">
            Your email <span className="text-neutral-500">(only if you want a reply)</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-2 h-11 w-full rounded-lg border border-white/15 bg-black/30 px-4 font-ui text-sm text-white outline-none placeholder:text-neutral-600 focus:border-[#6b8ff5]"
          />
        </label>

        {problem && (
          <p role="alert" className="mt-3 font-ui text-sm leading-relaxed text-[#ffb4c4]">
            {problem}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 font-ui text-sm text-neutral-400 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !message.trim()}
            className="rounded-full bg-primary px-5 py-2 font-ui text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

// fullBleed is for the marketing pages, where the bar is a floating pill
// inside a padded container. Without it the banner inherits that padding and
// sits short of both edges, which reads as part of the nav rather than as a
// notice about the whole site. The dashboard bar is already full width and
// needs none of it.
export default function BetaBanner({ fullBleed = false }) {
  const { pathname } = useLocation();
  // Read before the first paint, so a banner already turned off is never
  // drawn and then taken away.
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [open, setOpen] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [scrolls, setScrolls] = useState(false);
  const [held, setHeld] = useState(false);

  const room = useRef(null);
  const words = useRef(null);

  // Measured rather than guessed at. One copy of the line is compared with
  // the space it has; it moves only if it does not fit.
  const measure = useCallback(() => {
    if (prefersStillness()) {
      setScrolls(false);
      return;
    }
    const space = room.current?.clientWidth ?? 0;
    const needed = words.current?.scrollWidth ?? 0;
    setScrolls(needed > space + 1);
  }, []);

  useEffect(() => {
    if (dismissed) return undefined;

    measure();
    const watcher = new ResizeObserver(measure);
    if (room.current) watcher.observe(room.current);

    // Asked for again if the reader changes their mind mid-visit. Not every
    // environment that renders this has matchMedia, so it is optional.
    const stillness =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    stillness?.addEventListener?.("change", measure);

    return () => {
      watcher.disconnect();
      stillness?.removeEventListener?.("change", measure);
    };
  }, [dismissed, measure]);

  if (dismissed) return null;
  if (PRIVATE.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null;

  const close = () => {
    setDismissed(true);
    rememberDismissal();
  };

  return (
    <>
      <div
        className={`relative z-20 border-b border-white/10 bg-[#2b2342] ${
          fullBleed ? "left-1/2 w-screen -translate-x-1/2" : "w-full"
        }`}
      >
        <div className="mx-auto flex h-10 max-w-[1368px] items-center gap-2 px-3 sm:h-11 sm:gap-4 sm:px-6">
          {/* The words. They scroll inside here and nowhere else, so the two
              buttons never move. */}
          <div
            ref={room}
            className="relative min-w-0 flex-1 overflow-hidden"
            onMouseEnter={() => setHeld(true)}
            onMouseLeave={() => setHeld(false)}
            onFocus={() => setHeld(true)}
            onBlur={() => setHeld(false)}
            onTouchStart={() => setHeld(true)}
            onTouchEnd={() => setHeld(false)}
          >
            {scrolls ? (
              <div
                className="flex w-max animate-marquee gap-12 whitespace-nowrap will-change-transform"
                style={held ? { animationPlayState: "paused" } : undefined}
              >
                {/* Said once for a screen reader; the second copy is what
                    makes the loop seamless and is not read out. */}
                <span className="font-ui text-xs text-[#d6cdf0] sm:text-sm">{LINE}</span>
                <span aria-hidden="true" className="font-ui text-xs text-[#d6cdf0] sm:text-sm">
                  {LINE}
                </span>
              </div>
            ) : (
              <p className="truncate font-ui text-xs text-[#d6cdf0] sm:text-sm">{LINE}</p>
            )}

            {/* Off screen, and the thing actually measured: the line at its
                natural width, never clipped by the box around it. */}
            <span
              ref={words}
              aria-hidden="true"
              className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap font-ui text-xs sm:text-sm"
            >
              {LINE}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 whitespace-nowrap rounded-full bg-white/15 px-3 py-1.5 font-ui text-xs font-bold text-white transition-colors hover:bg-white/25 sm:px-4 sm:text-sm"
          >
            Give feedback
          </button>

          <button
            type="button"
            onClick={close}
            aria-label="Dismiss this notice"
            className="-mr-1 shrink-0 rounded-full p-1.5 text-[#d6cdf0] transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <FeedbackForm
          onClose={() => setOpen(false)}
          onSent={() => {
            setOpen(false);
            setThanks(true);
          }}
        />
      )}

      {/* Said out loud as well as shown: the panel it came from has just
          closed, so focus is back on the page with nothing to read. */}
      {thanks && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-fit rounded-full bg-[#1b2233] px-5 py-3 font-ui text-sm text-white shadow-card ring-1 ring-white/15"
          onAnimationEnd={() => setThanks(false)}
        >
          Thank you. That reached us.
          <button
            type="button"
            onClick={() => setThanks(false)}
            className="ml-3 font-bold text-primary hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
