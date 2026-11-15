// A creator's own subscribers.
//
// Private, and private by omission rather than by a rule: this address is
// not in the sitemap and not in the prerendering matcher, so there is no
// server rendered copy of it for anybody to find. It also says noindex,
// because a page of other people's email addresses should be asking not to
// be kept even if something else goes wrong.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../data/AuthContext";
import { usePageMeta } from "../data/pageMeta";
import {
  loadActivity,
  loadInterest,
  loadOverview,
  loadSubscribers,
  registerInterest,
  subscribersFileUrl,
} from "../data/creatorDashboard";

const TABS = ["Overview", "Subscribers", "Activity", "Editor"];

const CARD = "rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6";

const day = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

function Figure({ label, value, note }) {
  return (
    <div className={CARD}>
      <p className="font-ui text-xs font-bold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-2 font-ui text-3xl font-bold text-white">{value}</p>
      {note && <p className="mt-1 font-ui text-sm text-neutral-400">{note}</p>}
    </div>
  );
}

// Eight weeks of joins, drawn as bars.
//
// Written by hand rather than with a charting library: it is one series of
// small whole numbers, and a library would be a larger download than the
// whole page for a picture this plain.
function Growth({ weeks }) {
  const tallest = Math.max(...weeks.map((w) => w.value), 1);

  if (!weeks.length) {
    return (
      <p className="font-ui text-sm text-neutral-400">
        Nothing to chart yet. This fills in as people subscribe.
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-32 items-end gap-2" role="img" aria-label="Subscribers gained by week">
        {weeks.map((week) => (
          <div key={week.week} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t bg-primary"
              style={{ height: `${Math.max((week.value / tallest) * 100, 3)}%` }}
            />
            <span className="font-ui text-[10px] text-neutral-500">{week.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 font-ui text-xs text-neutral-500">
        New subscribers by week, oldest on the left.
      </p>
    </div>
  );
}

function Empty({ handle }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/creator/${String(handle || "").replace(/^@/, "")}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused. The address is on screen either
      // way, so there is still something to do.
      setCopied(false);
    }
  };

  return (
    <div className={`${CARD} text-center`}>
      <p className="font-ui text-base text-white">
        No subscribers yet. Share your profile link to get your first one.
      </p>
      <p className="mt-3 break-all font-ui text-sm text-neutral-400">{link}</p>
      <button
        type="button"
        onClick={copy}
        className="mt-4 rounded-full bg-primary px-6 py-3 font-ui text-sm font-bold text-white transition hover:opacity-90"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

function Subscribers({ handle }) {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [problem, setProblem] = useState("");

  const refresh = useCallback(async (search, which) => {
    try {
      setData(await loadSubscribers({ q: search, page: which }));
    } catch (error) {
      setProblem(error.message);
    }
  }, []);

  useEffect(() => {
    refresh(q, page);
    // Only when the page changes: searching is an explicit submit, so that
    // a half typed address does not fire a request per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, refresh]);

  if (problem) {
    return (
      <p role="alert" className="font-ui text-sm font-bold text-red-400">
        {problem}
      </p>
    );
  }

  if (!data) return <p className="font-ui text-sm text-neutral-400">Loading…</p>;

  if (!data.total && !q) return <Empty handle={handle} />;

  return (
    <div>
      {/* Stacked on a phone. Side by side, the search field, its button and
          the download link share one row and the field is what gives way,
          collapsing to a sliver nobody can type into. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            refresh(q, 1);
          }}
        >
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search an address"
            aria-label="Search an address"
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/30 px-5 py-2.5 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white/40"
          />
          <button
            type="submit"
            className="rounded-full bg-white/10 px-5 py-2.5 font-ui text-sm font-bold text-white transition hover:bg-white/20"
          >
            Search
          </button>
        </form>

        {/* A plain link, not a fetch: the browser saves the file and the
            session cookie travels with it. */}
        <a
          href={subscribersFileUrl()}
          className="shrink-0 rounded-full border border-white/20 px-5 py-2.5 text-center font-ui text-sm font-bold text-white transition hover:bg-white/10"
        >
          Download CSV
        </a>
      </div>

      <p className="mt-4 font-ui text-sm text-neutral-400">
        {data.total} {data.total === 1 ? "person" : "people"}
        {q ? " matching" : ""}. The file holds subscribed people only.
      </p>

      {data.subscribers.length === 0 ? (
        <p className={`mt-4 ${CARD} font-ui text-base text-neutral-300`}>Nothing matching that.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4 font-ui text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Email
                </th>
                <th className="py-3 pr-4 font-ui text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Subscribed
                </th>
                <th className="py-3 font-ui text-xs font-bold uppercase tracking-wide text-neutral-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {data.subscribers.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="py-3 pr-4 font-ui text-sm text-white break-all">{row.email}</td>
                  <td className="py-3 pr-4 font-ui text-sm text-neutral-400">{day(row.since)}</td>
                  <td className="py-3 font-ui text-sm">
                    <span
                      className={
                        row.status === "subscribed" ? "text-emerald-400" : "text-neutral-500"
                      }
                    >
                      {row.status === "subscribed" ? "Subscribed" : "Unsubscribed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((n) => n - 1)}
            className="rounded-full border border-white/20 px-4 py-2 font-ui text-sm text-white transition hover:bg-white/10 disabled:opacity-40"
          >
            Back
          </button>
          <span className="font-ui text-sm text-neutral-400">
            Page {data.page} of {data.pages}
          </span>
          <button
            type="button"
            disabled={page >= data.pages}
            onClick={() => setPage((n) => n + 1)}
            className="rounded-full border border-white/20 px-4 py-2 font-ui text-sm text-white transition hover:bg-white/10 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function Activity() {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    loadActivity()
      .then((answer) => setRows(answer.activity))
      .catch(() => setRows([]));
  }, []);

  if (!rows) return <p className="font-ui text-sm text-neutral-400">Loading…</p>;
  if (!rows.length) {
    return <p className="font-ui text-sm text-neutral-400">Nothing has happened yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
        >
          <span className="font-ui text-sm text-white break-all">{row.email}</span>
          <span className="flex items-center gap-3">
            <span
              className={`font-ui text-xs font-bold ${
                row.kind === "subscribed" ? "text-emerald-400" : "text-neutral-500"
              }`}
            >
              {row.kind === "subscribed" ? "Subscribed" : "Unsubscribed"}
            </span>
            <span className="font-ui text-xs text-neutral-500">{day(row.at)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Editor() {
  const [asked, setAsked] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadInterest()
      .then((answer) => setAsked(answer.features.includes("editor")))
      .catch(() => setAsked(false));
  }, []);

  const tell = async () => {
    setBusy(true);
    try {
      await registerInterest("editor");
      setAsked(true);
    } catch {
      setAsked(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${CARD} text-center`}>
      <span className="inline-block rounded-full bg-white/10 px-3 py-1 font-ui text-xs font-bold text-neutral-300">
        Coming soon
      </span>
      <h2 className="mt-4 font-ui text-xl font-bold text-white">Write to your subscribers</h2>
      <p className="mx-auto mt-2 max-w-[460px] font-ui text-sm leading-relaxed text-neutral-400">
        Compose and send updates from here, without exporting anything. Not ready yet.
      </p>
      <button
        type="button"
        disabled={busy || asked}
        onClick={tell}
        className="mt-5 rounded-full bg-primary px-6 py-3 font-ui text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {asked ? "We will tell you" : "Notify me"}
      </button>
    </div>
  );
}

export default function CreatorDashboard() {
  usePageMeta({
    title: "Subscribers",
    description: "The people subscribed to your work.",
    noindex: true,
  });

  const { user } = useAuth();
  const [tab, setTab] = useState("Overview");
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    loadOverview()
      .then(setOverview)
      .catch(() => setOverview({ total: 0, thisWeek: 0, unsubscribed: 0, growth: [] }));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="mx-auto max-w-[900px] px-5 pb-24 pt-10 sm:pt-14">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-ui text-[28px] font-bold leading-tight text-white sm:text-[36px]">
            Subscribers
          </h1>
          <Link
            to="/creators-hub"
            className="font-ui text-sm font-bold text-neutral-300 underline hover:text-white"
          >
            Back to your hub
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              aria-pressed={tab === name}
              className={`rounded-full px-5 py-2.5 font-ui text-sm font-bold transition-colors ${
                tab === name ? "bg-white text-black" : "bg-white/5 text-neutral-300 hover:text-white"
              }`}
            >
              {name}
              {name === "Editor" && (
                <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 font-ui text-[10px] text-neutral-200">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>

        <section className="mt-6">
          {tab === "Overview" &&
            (overview ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Figure label="Subscribers" value={overview.total} />
                  <Figure label="New this week" value={overview.thisWeek} />
                  <Figure
                    label="Unsubscribed"
                    value={overview.unsubscribed}
                    note="All time, for honesty"
                  />
                </div>
                <div className={CARD}>
                  <Growth weeks={overview.growth} />
                </div>
              </div>
            ) : (
              <p className="font-ui text-sm text-neutral-400">Loading…</p>
            ))}

          {tab === "Subscribers" && <Subscribers handle={user?.username} />}
          {tab === "Activity" && <Activity />}
          {tab === "Editor" && <Editor />}
        </section>

        <p className="mt-10 font-ui text-xs leading-relaxed text-neutral-500">
          These people gave you their email address so you could write to them about your work.
          Only write to them about that, always include a way to unsubscribe, and never sell or
          pass on the list. See the{" "}
          <Link to="/privacy" className="underline hover:text-neutral-300">
            privacy policy
          </Link>{" "}
          for what that means in full.
        </p>
      </main>
    </div>
  );
}
