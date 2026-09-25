import { useEffect, useRef, useState } from "react";
import { api } from "../data/api";

// "Report Creator", beside Share. Asks what is wrong in as few words as
// possible, takes anything else the person wants to add, and says thank you.

const REASONS = [
  { value: "copyright", label: "Copyright or stolen work" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

function FlagIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 21V4m0 0h11l-1.5 4L15 12H4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// `target` is { characterId } or { username }: whichever the page knows.
export default function ReportCreator({ target, signedIn, onNeedsAccount, className = "" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  // React state arrives too late to stop a second click.
  const busy = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const start = () => {
    // Reporting needs an account, so ask a visitor in rather than sending
    // them to a form that will turn them away.
    if (!signedIn) {
      onNeedsAccount?.();
      return;
    }
    setReason("");
    setMessage("");
    setSent(false);
    setError("");
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!reason || busy.current) return;

    busy.current = true;
    setSending(true);
    setError("");
    try {
      const result = await api.post("/reports", { ...target, reason, message });
      setSent(result?.alreadyReported ? "again" : "new");
    } catch (problem) {
      setError(problem.message);
    } finally {
      busy.current = false;
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        className={`flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 font-ui text-sm font-bold text-white hover:bg-white/10 sm:px-5 sm:py-2.5 sm:text-base ${className}`}
      >
        <FlagIcon className="size-5" />
        Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            className="max-h-[92dvh] w-full max-w-[460px] overflow-y-auto overscroll-contain rounded-t-3xl border border-white/10 bg-[#222b3c] p-6 sm:rounded-3xl sm:p-7"
          >
            {sent ? (
              <div className="text-center">
                <h2 id="report-title" className="font-ui text-xl font-bold text-white">
                  Thank you
                </h2>
                <p className="mx-auto mt-3 max-w-[340px] font-ui text-base leading-relaxed text-neutral-300">
                  {sent === "again"
                    ? "You have already reported this creator, and we are still looking into it."
                    : "Your report has been sent. We review every report and will act on what we find."}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-6 w-full rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-8 py-3 font-ui text-base font-bold text-white hover:opacity-90"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="flex items-start justify-between gap-4">
                  <h2 id="report-title" className="font-ui text-xl font-bold text-white">
                    Report this creator
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="shrink-0 rounded-full px-3 py-1 font-ui text-xl text-neutral-400 hover:bg-white/10 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                <p className="mt-2 font-ui text-sm text-neutral-400">
                  What is wrong? Reports are private and are not shown to the creator.
                </p>

                <fieldset className="mt-4 flex flex-col gap-2">
                  <legend className="sr-only">Reason</legend>
                  {REASONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-ui text-base transition-colors ${
                        reason === option.value
                          ? "border-[#6b8ff5] bg-[#2b3547] text-white"
                          : "border-white/10 bg-[#1e2637] text-neutral-300 hover:border-white/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={option.value}
                        checked={reason === option.value}
                        onChange={(event) => setReason(event.target.value)}
                        className="size-4 accent-[#c2185b]"
                      />
                      {option.label}
                    </label>
                  ))}
                </fieldset>

                <label className="mt-4 block">
                  <span className="font-ui text-sm text-neutral-400">
                    Anything else we should know? (optional)
                  </span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value.slice(0, 1000))}
                    rows={3}
                    placeholder="Links, dates, or where the work first appeared."
                    className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#1e2637] px-4 py-3 font-ui text-base text-white outline-none placeholder:text-neutral-500 focus:border-[#6b8ff5]"
                  />
                </label>

                {error && (
                  <p role="alert" className="mt-3 font-ui text-sm text-[#f2415f]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!reason || sending}
                  className="mt-5 w-full rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-8 py-3.5 font-ui text-base font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send report"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
