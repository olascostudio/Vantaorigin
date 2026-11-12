import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../data/AuthContext.jsx";
import { acceptTerms, currentTerms } from "../data/terms";

// The terms changed, and this person has not said yes to the new wording.
//
// It is a banner and not a wall. Somebody who has not accepted yet can still
// use their account; they are told, every time they arrive, until they say
// yes. Locking a creator out of work they have already done because a
// sentence in the terms changed is not proportionate, and consent given to
// escape a lock is not worth much as consent.
//
// It asks the server rather than trusting anything kept in the browser:
// which version is current, and whether this person has accepted it, are both
// facts the browser has no business deciding.
export default function TermsBanner() {
  const { user } = useAuth();
  // The id, not the object. Asking again whenever the object identity
  // changes means asking again on every render that happens to make a new
  // one, and the answer to that is another render: the effect sets state,
  // the state renders, the render makes a new object, the effect runs. The
  // id changes when the person does and at no other time.
  const who = user?.id ?? null;
  const [terms, setTerms] = useState(null);
  const [saying, setSaying] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    if (!who) {
      setTerms(null);
      return undefined;
    }

    let cancelled = false;
    currentTerms()
      .then((answer) => !cancelled && setTerms(answer))
      // A banner that cannot load is a banner that says nothing. It is not
      // worth an error on the screen.
      .catch(() => !cancelled && setTerms(null));

    return () => {
      cancelled = true;
    };
  }, [who]);

  if (!user || !terms?.mustAccept || !terms.version) return null;

  const agree = async () => {
    setSaying(true);
    setProblem("");
    try {
      await acceptTerms(terms.version.version);
      setTerms({ ...terms, mustAccept: false });
    } catch (error) {
      setProblem(error.message || "That did not save. Please try again.");
    } finally {
      setSaying(false);
    }
  };

  return (
    <div role="region" aria-label="Terms update" className="border-b border-white/10 bg-[#2c2410]">
      <div className="mx-auto flex max-w-[1368px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <p className="font-ui text-sm leading-relaxed text-[#ffd98a]">
          <span className="font-bold">The terms have changed.</span>{" "}
          {terms.version.summary || "The wording that governs your account has been updated."}{" "}
          <Link
            to={terms.version.url || "/terms"}
            className="font-bold underline underline-offset-2 hover:text-white"
          >
            Read them
          </Link>
          .
        </p>

        <div className="flex shrink-0 items-center gap-3">
          {problem && (
            <span role="alert" className="font-ui text-xs text-[#ffb4c4]">
              {problem}
            </span>
          )}
          <button
            type="button"
            onClick={agree}
            disabled={saying}
            className="h-9 shrink-0 rounded-full bg-[#ffd98a] px-5 font-ui text-sm font-bold text-[#2c2410] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saying ? "Saving…" : "I accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
