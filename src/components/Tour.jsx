// A walk around the product, pointing at one control at a time.
//
// Offered once, after somebody signs up: a card asking whether they want to
// be shown around. Skip and it never asks again. Explore and it walks the
// steps in src/data/tour.js, scrolling each control into view, ringing it,
// and drawing a line from the card to the thing the card is talking about.
// The walk crosses pages, so it navigates itself: the step says where its
// control lives and the tour goes there.
//
// Nothing here blocks the page. There is no dimming layer over the top and
// no focus trap, because somebody halfway through a tour who spots the
// thing they actually came to do should be able to go and do it. The ring
// and the line are enough to say which control is being described.
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../data/AuthContext.jsx";
import { STEPS, firstStepOn, rememberTourSeen, seenTour } from "../data/tour";

// How long to wait for a step's control to turn up after navigating. The
// pages the tour visits load their own data, so the control it wants may
// not exist for a moment; 6s is generous, and running out is not an error
// worth showing anybody, it just moves on.
const WAIT_MS = 6000;
const POLL_MS = 100;

const findTarget = (key) => document.querySelector(`[data-tour="${key}"]`);

// The card is 320px on anything wider than a phone, and a full width sheet
// on a phone. Kept here because the line has to be drawn to the same box.
const CARD_W = 320;
const GAP = 14;

export default function Tour() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // idle: nothing to do. inviting: the offer is up. running: walking the
  // steps. done: the closing card.
  const [status, setStatus] = useState("idle");
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 640);

  const anchor = useRef(null);

  // Offer the walk once, to somebody signed in who has not been offered it.
  useEffect(() => {
    if (!user || seenTour()) return;
    setStatus((was) => (was === "idle" ? "inviting" : was));
  }, [user]);

  // Signing out mid-walk ends it rather than leaving a card pointing at a
  // page that is no longer there.
  useEffect(() => {
    if (!user) {
      setStatus("idle");
      anchor.current = null;
      setRect(null);
    }
  }, [user]);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const finish = useCallback(() => {
    rememberTourSeen();
    anchor.current = null;
    setRect(null);
    setStatus("done");
  }, []);

  const close = useCallback(() => {
    rememberTourSeen();
    anchor.current = null;
    setRect(null);
    setStatus("idle");
  }, []);

  const step = status === "running" ? STEPS[index] : null;

  // Get to the step: go to its page if we are not on it, then wait for its
  // control to exist, then scroll it into the middle of the screen.
  useEffect(() => {
    if (!step) return undefined;

    if (pathname !== step.path) {
      navigate(step.path);
      return undefined;
    }

    let cancelled = false;
    let waited = 0;
    anchor.current = null;
    setRect(null);

    const look = () => {
      if (cancelled) return;
      const found = findTarget(step.target);

      if (found) {
        anchor.current = found;
        setRect(found.getBoundingClientRect());
        found.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      waited += POLL_MS;
      // A control that never appears is a step that cannot be shown. Move
      // on rather than stall: the last step running out ends the walk.
      if (waited >= WAIT_MS) {
        if (index >= STEPS.length - 1) finish();
        else setIndex((n) => n + 1);
        return;
      }
      timer = window.setTimeout(look, POLL_MS);
    };

    let timer = window.setTimeout(look, POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [step, pathname, navigate, index, finish]);

  // Follow the control while the smooth scroll runs, and afterwards if the
  // page moves under it. A frame loop only while a step is on screen: the
  // alternative is a scroll listener that misses the easing and leaves the
  // line detached from what it points at.
  useEffect(() => {
    if (!step || !rect) return undefined;
    let raf = 0;
    const follow = () => {
      if (anchor.current) {
        const next = anchor.current.getBoundingClientRect();
        setRect((old) =>
          !old || old.top !== next.top || old.left !== next.left || old.width !== next.width
            ? next
            : old
        );
      }
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(raf);
    // rect is deliberately not a dependency: this loop is what updates it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, Boolean(rect)]);

  // Escape leaves, the arrows walk. A tour you cannot get out of from the
  // keyboard is a trap.
  useEffect(() => {
    if (status !== "running") return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") setIndex((n) => Math.min(n + 1, STEPS.length - 1));
      if (event.key === "ArrowLeft") setIndex((n) => Math.max(n - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [status, close]);

  if (status === "idle") return null;

  if (status === "inviting") {
    return (
      <Popup
        title="Shall we show you around?"
        body="A quick walk through the buttons on your hub, so you know what each one is for. It takes less than a minute, and you can stop at any point."
        primary="Explore"
        onPrimary={() => {
          setIndex(firstStepOn(pathname));
          setStatus("running");
        }}
        secondary="Skip"
        onSecondary={close}
      />
    );
  }

  if (status === "done") {
    return (
      <Popup
        title="That is the tour. Welcome to VantaOrigin."
        body="Everything you saw is where you left it. Your page is live, and the link under Share is the one to give people."
        primary="Get started"
        onPrimary={() => setStatus("idle")}
      />
    );
  }

  const last = index === STEPS.length - 1;
  const card = cardBox(rect, narrow);

  return (
    <>
      {/* The ring around the control being described. Drawn as its own
          fixed box rather than an outline on the control, so the tour never
          writes to the styling of anything it points at. */}
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[60] rounded-lg outline outline-[3px] outline-offset-4 outline-[#a855f7]"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}

      {/* The line from the card to the control. */}
      {rect && card && (
        <svg
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[59] h-full w-full"
          width="100%"
          height="100%"
        >
          <line
            x1={card.left + card.width / 2}
            y1={card.anchorY}
            x2={rect.left + rect.width / 2}
            y2={rect.top + rect.height / 2}
            stroke="#a855f7"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <circle
            cx={rect.left + rect.width / 2}
            cy={rect.top + rect.height / 2}
            r="4"
            fill="#a855f7"
          />
        </svg>
      )}

      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-step-name"
        className="fixed z-[61] rounded-2xl border border-white/15 bg-[#222c40] p-4 shadow-lg sm:p-5"
        style={
          card
            ? { top: card.top, left: card.left, width: card.width }
            : { bottom: 12, left: 12, right: 12 }
        }
      >
        <p className="font-ui text-xs font-bold uppercase tracking-wider text-neutral-400">
          Step {index + 1} of {STEPS.length}
        </p>
        <h2 id="tour-step-name" className="mt-1 font-ui text-base font-bold text-white">
          {step.name}
        </h2>
        <p className="mt-1.5 font-ui text-sm leading-relaxed text-neutral-300">{step.blurb}</p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((n) => Math.max(n - 1, 0))}
            disabled={index === 0}
            className="min-h-[40px] rounded-full border border-white/25 px-4 font-ui text-sm font-bold text-white transition-colors hover:bg-white/10 disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => (last ? finish() : setIndex((n) => n + 1))}
            className="min-h-[40px] rounded-full bg-[#a855f7] px-5 font-ui text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            {last ? "Finish" : "Next"}
          </button>
          <button
            type="button"
            onClick={close}
            className="ml-auto min-h-[40px] px-2 font-ui text-sm text-neutral-400 transition-colors hover:text-white"
          >
            Skip
          </button>
        </div>
      </section>
    </>
  );
}

// Where the card goes, and where on the card the line should leave from.
//
// On a phone it is a sheet across the bottom and the line leaves the top
// edge, because there is no room beside anything. On a wider screen it sits
// under the control it describes, or above it when there is not enough room
// below, and is clamped so it cannot hang off either side.
function cardBox(rect, narrow) {
  if (!rect) return null;

  if (narrow) {
    const width = window.innerWidth - 24;
    const below = rect.bottom + GAP;
    const roomBelow = window.innerHeight - below;
    // The sheet is roughly 210px tall. Put it on whichever side of the
    // control has room, bottom by default.
    const top = roomBelow > 230 ? below : Math.max(12, rect.top - 230 - GAP);
    return { top, left: 12, width, anchorY: top < rect.top ? top + 210 : top };
  }

  const left = Math.min(
    Math.max(12, rect.left + rect.width / 2 - CARD_W / 2),
    window.innerWidth - CARD_W - 12
  );
  const below = rect.bottom + GAP;
  const fitsBelow = window.innerHeight - below > 240;
  const top = fitsBelow ? below : Math.max(12, rect.top - 240 - GAP);
  return { top, left, width: CARD_W, anchorY: fitsBelow ? top : top + 220 };
}

// The offer at the start and the note at the end. Same shape, centred,
// because neither is pointing at anything yet.
function Popup({ title, body, primary, onPrimary, secondary, onSecondary }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-popup-title"
        className="w-full max-w-[420px] rounded-2xl border border-white/15 bg-[#222c40] p-5 shadow-lg"
      >
        <h2 id="tour-popup-title" className="font-ui text-lg font-bold text-white">
          {title}
        </h2>
        <p className="mt-2 font-ui text-sm leading-relaxed text-neutral-300">{body}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPrimary}
            className="min-h-[44px] rounded-full bg-[#a855f7] px-6 font-ui text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            {primary}
          </button>
          {secondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="min-h-[44px] px-3 font-ui text-sm font-bold text-neutral-400 transition-colors hover:text-white"
            >
              {secondary}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
