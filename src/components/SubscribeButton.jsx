// Subscribing to a creator, from their page.
//
// The consent line is not decoration and it is not in a tooltip. Pressing
// this hands somebody's address to another person, and that is the one
// thing here nobody can take back, so it is written where the press
// happens, in both the signed in and the signed out case.
//
// Signed out, the press is remembered rather than lost: the modal sends
// them to sign up or sign in, and the subscription completes by itself when
// they come back.
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../data/AuthContext";
import {
  loadSubscription,
  rememberIntent,
  subscribeTo,
  unsubscribeFrom,
} from "../data/subscriptions";

export const consentLine = (creatorName) =>
  `Your email will be shared with ${creatorName} so they can send you updates. You can unsubscribe any time.`;

function Modal({ creatorName, onClose, onPick }) {
  // Escape closes it, because a dialog that traps you is worse than no
  // dialog. The backdrop closes it for the same reason.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscribe-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#1b2233] p-6"
      >
        <h2 id="subscribe-title" className="font-ui text-xl font-bold text-white">
          Subscribe to {creatorName}
        </h2>
        <p className="mt-2 font-ui text-sm leading-relaxed text-neutral-300">
          You need a VantaOrigin account to subscribe. We will bring you straight back here.
        </p>

        <p className="mt-4 rounded-xl bg-black/30 p-3 font-ui text-xs leading-relaxed text-neutral-400">
          {consentLine(creatorName)}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onPick("signup")}
            className="w-full rounded-full bg-primary px-6 py-3 font-ui text-base font-bold text-white transition hover:opacity-90"
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => onPick("signin")}
            className="w-full rounded-full border border-white/25 px-6 py-3 font-ui text-base font-bold text-white transition hover:bg-white/10"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 w-full px-6 py-2 font-ui text-sm text-neutral-400 transition hover:text-white"
          >
            Not now
          </button>
        </div>

        <p className="mt-4 text-center font-ui text-xs text-neutral-500">
          <a href="/privacy" className="underline hover:text-neutral-300">
            How we handle your data
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SubscribeButton({ username, creatorName, onDone }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let alive = true;
    loadSubscription(username)
      .then((answer) => alive && setState(answer))
      .catch(() => alive && setState({ subscribed: false, own: false }));
    return () => {
      alive = false;
    };
  }, [username, user?.id]);

  // Nothing is drawn until we know, so the button never flickers from
  // "Subscribe" to "Subscribed" in front of somebody who already is.
  if (!state) return <div className="h-[46px]" aria-hidden="true" />;

  // Never on your own page. The API says so too, so this is the tidy
  // version of a rule that is enforced somewhere it cannot be skipped.
  if (state.own) return null;

  // The subscription endpoint already drops the @ from a handle used as a
  // name, because "shared with @demoartist" reads badly in a sentence. The
  // public profile endpoint does not, so its value is only a fallback and
  // gets the same treatment.
  const name =
    state.creatorName || String(creatorName || username || "").replace(/^@/, "");

  const subscribe = async () => {
    if (!user) {
      setAsking(true);
      return;
    }
    setBusy(true);
    setProblem("");
    try {
      const answer = await subscribeTo(username);
      setState({ ...state, subscribed: true });
      // The typographic apostrophe, matching CreatorPage and the rest of
      // the app, so the same sentence looks the same whether somebody
      // subscribed here or came back from signing up to find it done.
      onDone?.(`You’re subscribed to ${answer.creatorName || name}.`);
    } catch (error) {
      // An unconfirmed address is sent to the verification screen by the
      // API client itself, so there is nothing to say here about that.
      if (error?.data?.needsVerification) {
        rememberIntent(username);
        return;
      }
      setProblem("That did not work. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    setProblem("");
    try {
      await unsubscribeFrom(username);
      setState({ ...state, subscribed: false });
      onDone?.(`You have unsubscribed from ${name}.`);
    } catch {
      setProblem("That did not work. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const pick = (where) => {
    rememberIntent(username);
    setAsking(false);
    // SignIn returns to where it came from; sign up goes through
    // verification, and the subscription completes wherever that lands.
    navigate(where === "signin" ? "/signin" : "/signup", {
      state: { from: location.pathname },
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {state.subscribed ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 font-ui text-sm font-bold text-white">
            <span aria-hidden="true">✓</span> Subscribed
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={leave}
            className="rounded-full border border-white/20 px-4 py-2.5 font-ui text-sm text-neutral-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            Unsubscribe
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={subscribe}
          className="rounded-full bg-primary px-7 py-2.5 font-ui text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "One moment" : "Subscribe"}
        </button>
      )}

      {/* Said at the press, not only in the modal: somebody already signed
          in never sees the modal at all. */}
      {!state.subscribed && (
        <p className="max-w-[420px] text-center font-ui text-xs leading-relaxed text-neutral-500">
          {consentLine(name)}
        </p>
      )}

      {problem && (
        <p role="alert" className="font-ui text-xs font-bold text-red-400">
          {problem}
        </p>
      )}

      {asking && (
        <Modal creatorName={name} onClose={() => setAsking(false)} onPick={pick} />
      )}
    </div>
  );
}
