import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logoMark from "../assets/landing/hero/logo-mark.svg";

// Someone followed a creator's link and is looking at a character. After a
// little while, or the moment they try to do something that needs an account,
// this asks them in. It asks once: turning it down is remembered for a week,
// so a link that gets passed around does not nag the same person every time.

const REMEMBER_KEY = "vo_join_prompt_quiet_until";
const QUIET_DAYS = 7;
const AFTER_SECONDS = 8;

// Browser storage can be switched off, and then every one of these throws.
const quietUntil = () => {
  try {
    return Number(window.localStorage.getItem(REMEMBER_KEY)) || 0;
  } catch {
    return 0;
  }
};

const stayQuiet = () => {
  try {
    window.localStorage.setItem(REMEMBER_KEY, String(Date.now() + QUIET_DAYS * 86_400_000));
  } catch {
    // Nothing to do: the prompt simply asks again next time.
  }
};

// `enabled` is false for anyone signed in, and for pages with nothing to join
// from. `invite` opens it early, for a tap that needs an account.
export function useJoinPrompt({ enabled }) {
  const [open, setOpen] = useState(false);
  // Once it has been shown, the timer must not bring it back.
  const shown = useRef(false);

  useEffect(() => {
    if (!enabled || Date.now() < quietUntil()) return undefined;
    const timer = setTimeout(() => {
      if (!shown.current) {
        shown.current = true;
        setOpen(true);
      }
    }, AFTER_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [enabled]);

  const invite = useCallback(() => {
    if (!enabled) return false;
    shown.current = true;
    setOpen(true);
    return true;
  }, [enabled]);

  const close = useCallback(() => {
    stayQuiet();
    setOpen(false);
  }, []);

  return { open, invite, close };
}

export default function JoinPrompt({ open, onClose, creator }) {
  // Escape closes it, like every other dialog here.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-prompt-title"
        className="relative max-h-[92dvh] w-full max-w-[420px] overflow-y-auto overscroll-contain rounded-t-3xl border border-white/10 bg-[#222b3c] p-6 text-center sm:rounded-3xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Not now"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full font-ui text-xl text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          ×
        </button>

        <img src={logoMark} alt="" className="mx-auto h-10 w-auto" />

        <h2 id="join-prompt-title" className="mt-4 font-ui text-2xl font-bold text-white">
          Join VantaOrigin
        </h2>

        <p className="mx-auto mt-3 max-w-[320px] font-ui text-base leading-relaxed text-neutral-300">
          {creator ? (
            <>
              Like {creator}&rsquo;s characters, and build a Realm of your own — one link for
              everything you create.
            </>
          ) : (
            <>
              Create your own Realm, add your characters, and share them all with one link.
            </>
          )}
        </p>

        <Link
          to="/signup"
          className="mt-6 block rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-8 py-3.5 font-ui text-base font-bold text-white hover:opacity-90"
        >
          Create your Realm
        </Link>

        <p className="mt-4 font-ui text-sm text-neutral-400">
          Already have an account?{" "}
          <Link to="/signin" className="font-bold text-[#6b8ff5] underline hover:text-white">
            Log in
          </Link>
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 font-ui text-sm text-neutral-500 underline hover:text-neutral-300"
        >
          Keep looking around
        </button>
      </div>
    </div>
  );
}
