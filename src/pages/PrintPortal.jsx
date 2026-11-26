// A print partner's job queue.
//
// The person reading this is standing in a print shop with other work on,
// and they want three things: what to print, where it goes, and a way to say
// it has gone. So a job is a card with the spec, the address, and the one
// button that is next, and there is nothing else on the page.
//
// No money anywhere. A printer is paid their quoted cost; what the book sold
// for and what the creator earned is not on this screen because it is not
// their business, and the API does not send it.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePrivatePage } from "../data/pageMeta";
import { Skeleton } from "../components/Loading.jsx";
import { addressLines, loadJobs, moveJob } from "../data/printer";
import logoMark from "../assets/landing/hero/logo-mark.svg";

// What to do next, given where a job is. One button, because a queue with
// four choices per row is a queue nobody works through.
const NEXT = {
  paid: { label: "Start printing", status: "in_production" },
  in_production: { label: "Mark as shipped", status: "shipped", needsTracking: true },
};

const WHERE = {
  pending_payment: "Waiting for payment",
  paid: "Ready to print",
  in_production: "Printing",
  shipped: "Shipped",
  delivered: "Delivered",
  inspection_window: "Delivered",
  completed: "Complete",
  cancelled: "Cancelled",
};

function Job({ job, onMoved }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [courier, setCourier] = useState(job.courier || "");
  const [tracking, setTracking] = useState(job.trackingNumber || "");

  const next = NEXT[job.status];

  const move = async () => {
    if (busy) return;
    setBusy(true);
    setProblem("");
    try {
      const updated = await moveJob(job.publicId, {
        status: next.status,
        ...(courier ? { courier } : {}),
        ...(tracking ? { trackingNumber: tracking } : {}),
      });
      onMoved(updated);
    } catch (error) {
      setProblem(error.message || "That did not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-[#222b3c] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {job.items.map((item) => (
            <div key={item.title}>
              <h2 className="font-ui text-lg font-bold text-white">
                {item.title}
                {item.quantity > 1 && (
                  <span className="text-[#f5af32]"> x {item.quantity}</span>
                )}
              </h2>
              <p className="mt-0.5 font-ui text-sm text-neutral-400">
                {item.formatSlug} · {item.pageCount} pages
              </p>
            </div>
          ))}
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 font-ui text-xs font-bold text-white">
          {WHERE[job.status] ?? job.status}
        </span>
      </div>

      {/* The address, one line each, because a courier reads it off a
          screen and commas are not line breaks. */}
      <div className="mt-5 rounded-xl bg-[#1b2233] p-4">
        <p className="font-ui text-xs font-bold uppercase tracking-wider text-neutral-500">
          Send to
        </p>
        <p className="mt-2 font-ui text-base font-bold text-white">{job.buyerName}</p>
        {addressLines(job).map((line) => (
          <p key={line} className="font-ui text-base text-neutral-300">
            {line}
          </p>
        ))}
        {job.buyerPhone && (
          <p className="mt-2 font-ui text-sm text-neutral-400">{job.buyerPhone}</p>
        )}
      </div>

      {next ? (
        <div className="mt-5">
          {next.needsTracking && (
            <div className="mb-4 flex flex-wrap gap-3">
              <input
                className="min-h-[44px] min-w-0 flex-[1_1_160px] rounded-xl border border-white/20 bg-[#1b2233] px-4 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#a855f7]"
                placeholder="Courier"
                aria-label="Courier"
                value={courier}
                onChange={(event) => setCourier(event.target.value)}
              />
              <input
                className="min-h-[44px] min-w-0 flex-[1_1_180px] rounded-xl border border-white/20 bg-[#1b2233] px-4 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#a855f7]"
                placeholder="Tracking number"
                aria-label="Tracking number"
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
              />
            </div>
          )}

          <button
            type="button"
            onClick={move}
            disabled={busy || (next.needsTracking && !tracking.trim())}
            className="min-h-[48px] rounded-full bg-[#a855f7] px-7 font-ui text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Saving..." : next.label}
          </button>

          {next.needsTracking && !tracking.trim() && (
            <p className="mt-2 font-ui text-xs text-neutral-500">
              A tracking number first, or the buyer has nothing to follow.
            </p>
          )}
        </div>
      ) : (
        job.trackingNumber && (
          <p className="mt-5 font-ui text-sm text-neutral-400">
            {job.courier ? `${job.courier}: ` : "Tracking: "}
            <span className="font-bold text-white">{job.trackingNumber}</span>
          </p>
        )
      )}

      {problem && (
        <p role="alert" className="mt-4 font-ui text-sm text-[#ffb4c4]">
          {problem}
        </p>
      )}
    </article>
  );
}

export default function PrintPortal() {
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");

  usePrivatePage();

  useEffect(() => {
    let cancelled = false;
    loadJobs()
      .then((rows) => !cancelled && setData(rows))
      .catch(
        (error) =>
          !cancelled &&
          setProblem(
            error.message === "No such printer" || error.status === 404
              ? "This account does not print for us. If you were sent an invitation, open that link instead."
              : error.message || "We could not load your jobs."
          )
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const replace = (updated) =>
    setData((current) => ({
      ...current,
      jobs: current.jobs.map((job) => (job.publicId === updated.publicId ? updated : job)),
    }));

  // Waiting first. It is the queue, so the thing to do next is at the top.
  const waiting = data?.jobs.filter((job) => NEXT[job.status]) ?? [];
  const done = data?.jobs.filter((job) => !NEXT[job.status]) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10 px-5 py-4 sm:px-8">
        <Link to="/print" className="flex items-center gap-2.5">
          <img src={logoMark} alt="" className="h-7 w-auto" aria-hidden="true" />
          <span className="font-ui text-base font-bold text-white">
            VantaOrigin <span className="text-neutral-400">for printers</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-[820px] px-5 pb-24 pt-10 sm:px-8">
        {problem ? (
          <>
            <h1 className="font-ui text-2xl font-bold text-white">Nothing to print here</h1>
            <p className="mt-3 font-ui text-base leading-relaxed text-neutral-300">{problem}</p>
          </>
        ) : !data ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <h1 className="font-ui text-3xl font-bold text-white sm:text-[40px]">
              {data.printer.name}
            </h1>
            <p className="mt-2 font-ui text-base text-neutral-400">
              {waiting.length === 0
                ? "Nothing waiting. We will email you when a job comes in."
                : `${waiting.length} ${waiting.length === 1 ? "job" : "jobs"} waiting.`}
            </p>

            {waiting.length > 0 && (
              <div className="mt-8 flex flex-col gap-5">
                {waiting.map((job) => (
                  <Job key={job.publicId} job={job} onMoved={replace} />
                ))}
              </div>
            )}

            {done.length > 0 && (
              <>
                <h2 className="mt-12 font-ui text-sm font-bold uppercase tracking-wider text-neutral-500">
                  Gone out
                </h2>
                <div className="mt-4 flex flex-col gap-5">
                  {done.map((job) => (
                    <Job key={job.publicId} job={job} onMoved={replace} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
