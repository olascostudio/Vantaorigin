import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import PageSkeleton, { Skeleton } from "../components/Loading.jsx";
import NewsletterLetters from "../components/NewsletterEditor.jsx";
import {
  amIAdmin,
  forgetSubscriber,
  loadCreators,
  loadOverview,
  loadReports,
  loadSubscribers,
  loadTopCharacters,
  resendWelcome,
  setSubscriberStatus,
  settleReport,
  subscribersFileUrl,
} from "../data/admin";
import characterCover from "../assets/creator/character-cover.svg";

// What is happening across VantaOrigin, for whoever runs it: the numbers, the
// reports waiting to be dealt with, who has joined, and what people like.

const REASONS = {
  copyright: "Copyright or stolen work",
  inappropriate: "Inappropriate content",
  harassment: "Harassment or abuse",
  spam: "Spam",
  other: "Other",
};

const TABS = ["Reports", "Creators", "Characters", "Newsletter", "Letters"];

const day = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

function Figure({ label, value, note }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#222b3c] p-5">
      <p className="font-ui text-sm text-neutral-400">{label}</p>
      <p className="mt-1 font-ui text-3xl font-black text-white">{value}</p>
      {note && <p className="mt-1 font-ui text-sm text-[#6b8ff5]">{note}</p>}
    </div>
  );
}

function ReportCard({ report, onSettle, busy }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#222b3c] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-ui text-base font-bold text-white">
            {REASONS[report.reason] || report.reason}
          </p>
          <p className="mt-1 font-ui text-sm text-neutral-400">
            About <span className="text-white">{report.subject?.username || "a deleted account"}</span>
            {" · "}
            from {report.reporter?.username || "a deleted account"}
            {" · "}
            {day(report.createdAt)}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 font-ui text-xs font-bold ${
            report.status === "open"
              ? "bg-[#3a2030] text-[#ffb4c4]"
              : "bg-white/10 text-neutral-300"
          }`}
        >
          {report.status}
        </span>
      </div>

      {report.message && (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-black/25 px-4 py-3 font-ui text-sm leading-relaxed text-neutral-200">
          {report.message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {report.characterId && (
          <Link
            to={`/character/${report.characterSlug || report.characterId}`}
            className="rounded-full border border-white/30 px-4 py-2 font-ui text-sm text-white hover:bg-white/10"
          >
            See the character
          </Link>
        )}
        {report.subject?.username && (
          <Link
            to={`/creator/${report.subject.username.replace(/^@/, "")}`}
            className="rounded-full border border-white/30 px-4 py-2 font-ui text-sm text-white hover:bg-white/10"
          >
            See their page
          </Link>
        )}

        {report.status === "open" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSettle(report.id, "reviewed")}
              className="rounded-full bg-[#3ecf6a] px-4 py-2 font-ui text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              Acted on it
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSettle(report.id, "dismissed")}
              className="rounded-full border border-white/30 px-4 py-2 font-ui text-sm text-neutral-300 hover:bg-white/10 disabled:opacity-50"
            >
              Nothing in it
            </button>
          </>
        )}
      </div>
    </article>
  );
}

// Somebody who made an account before the welcome letter existed never got
// one. This posts it to them, addressed by the name on their account.
function WelcomeAgain({ onTrouble }) {
  const [to, setTo] = useState("");
  const [state, setState] = useState("");

  const send = async () => {
    setState("Sending…");
    try {
      const answer = await resendWelcome(to.trim());
      setState(`Sent to ${answer.to}`);
      setTo("");
    } catch (error) {
      setState("");
      onTrouble(error.message);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-black/25 p-4">
      <p className="font-ui text-sm font-bold text-white">Send the welcome letter again</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setState("");
          }}
          placeholder="An address that already has an account"
          className="h-11 min-w-[220px] flex-1 rounded-full border border-white/15 bg-black/25 px-5 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#6b8ff5]"
        />
        <button
          type="button"
          onClick={send}
          disabled={!to.includes("@") || state === "Sending…"}
          className="shrink-0 rounded-full border border-white/25 px-5 py-2.5 font-ui text-sm text-white hover:bg-white/10 disabled:opacity-40"
        >
          Send it
        </button>
      </div>
      {state && <p className="font-ui text-sm text-neutral-400">{state}</p>}
    </div>
  );
}

// Who hears from VantaOrigin. The useful question is usually "is this person
// on it?", so the search box comes before the list.
function NewsletterPanel({ onTrouble }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [answer, setAnswer] = useState(null);
  const [busyId, setBusyId] = useState("");
  // Which row is waiting for a second press before it is erased.
  const [confirming, setConfirming] = useState("");

  // Typing should not send a request per keystroke.
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const refresh = async () => {
    try {
      setAnswer(await loadSubscribers({ q: query, status }));
    } catch (error) {
      onTrouble(error.message);
    }
  };

  useEffect(() => {
    let cancelled = false;
    loadSubscribers({ q: query, status })
      .then((next) => {
        if (!cancelled) setAnswer(next);
      })
      .catch((error) => {
        if (!cancelled) onTrouble(error.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status]);

  const act = async (id, work) => {
    setBusyId(id);
    try {
      await work();
      await refresh();
    } catch (error) {
      onTrouble(error.message);
    } finally {
      setBusyId("");
      setConfirming("");
    }
  };

  const counts = answer?.counts;

  return (
    <section className="mt-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#222b3c] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-ui text-base font-bold text-white">
              {counts ? `${counts.subscribed} on the list` : "Counting…"}
            </p>
            <p className="mt-1 font-ui text-sm text-neutral-400">
              {counts
                ? `${counts.unsubscribed} ${counts.unsubscribed === 1 ? "has" : "have"} left. Every new account joins, and can leave from any email we send.`
                : " "}
            </p>
          </div>

          {/* A file, so the list can be carried to whatever sends the mail. */}
          <a
            href={subscribersFileUrl("subscribed")}
            className="rounded-full border border-white/30 px-5 py-2.5 font-ui text-sm text-white hover:bg-white/10"
          >
            Download as CSV
          </a>
        </div>

        <WelcomeAgain onTrouble={onTrouble} />

        <div className="flex flex-wrap items-center gap-3">
          <label className="min-w-[200px] flex-1">
            <span className="sr-only">Search addresses</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search an address…"
              className="h-11 w-full rounded-full border border-white/15 bg-black/25 px-5 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#6b8ff5]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {["all", "subscribed", "unsubscribed"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setStatus(name)}
                aria-pressed={status === name}
                className={`rounded-full px-4 py-1.5 font-ui text-sm transition-colors ${
                  status === name ? "bg-[#2b3547] text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!answer && <Skeleton className="mt-4 h-[220px] rounded-2xl" />}

      {answer?.rows.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center font-ui text-base text-neutral-400">
          {query ? `Nobody matching “${query}”.` : "Nobody on the list yet."}
        </p>
      )}

      {answer && answer.rows.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="bg-[#222b3c] font-ui text-sm text-neutral-400">
                  <th className="px-5 py-3 font-normal">Address</th>
                  <th className="px-5 py-3 font-normal">Joined by</th>
                  <th className="px-5 py-3 font-normal">Account</th>
                  <th className="px-5 py-3 font-normal">State</th>
                  <th className="px-5 py-3 font-normal">Since</th>
                  <th className="px-5 py-3 font-normal">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {answer.rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/5 bg-[#1e2637]">
                    <td className="px-5 py-3 font-ui text-sm text-white">{row.email}</td>
                    <td className="px-5 py-3 font-ui text-sm text-neutral-400">
                      {row.source === "signup"
                        ? "signing up"
                        : row.source === "google"
                          ? "Google sign-up"
                          : "the footer"}
                    </td>
                    <td className="px-5 py-3 font-ui text-sm">
                      <span className={row.hasAccount ? "text-[#5fdc8a]" : "text-neutral-500"}>
                        {row.hasAccount ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-ui text-sm">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          row.status === "subscribed"
                            ? "bg-white/10 text-neutral-200"
                            : "bg-[#3a2030] text-[#ffb4c4]"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-ui text-sm text-neutral-400">
                      {day(row.unsubscribedAt || row.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {row.status === "subscribed" ? (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => act(row.id, () => setSubscriberStatus(row.id, "unsubscribed"))}
                            className="rounded-full border border-white/25 px-4 py-1.5 font-ui text-sm text-neutral-300 hover:bg-white/10 disabled:opacity-50"
                          >
                            Take off
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => act(row.id, () => setSubscriberStatus(row.id, "subscribed"))}
                            className="rounded-full border border-white/25 px-4 py-1.5 font-ui text-sm text-neutral-300 hover:bg-white/10 disabled:opacity-50"
                          >
                            Put back
                          </button>
                        )}

                        {/* Erasing leaves nothing behind, so it asks twice. */}
                        {confirming === row.id ? (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => act(row.id, () => forgetSubscriber(row.id))}
                            className="rounded-full bg-[#c2185b] px-4 py-1.5 font-ui text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            Erase for good?
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirming(row.id)}
                            className="rounded-full px-3 py-1.5 font-ui text-sm text-neutral-500 hover:text-[#ffb4c4]"
                          >
                            Erase
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {answer.matching > answer.rows.length && (
            <p className="border-t border-white/5 bg-[#222b3c] px-5 py-3 font-ui text-sm text-neutral-400">
              Showing the newest {answer.rows.length} of {answer.matching}. Search to narrow it down.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default function Admin() {
  const [allowed, setAllowed] = useState(null); // null while we ask
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState("Reports");
  const [reportFilter, setReportFilter] = useState("open");
  const [reports, setReports] = useState(null);
  const [creators, setCreators] = useState(null);
  const [characters, setCharacters] = useState(null);
  const [problem, setProblem] = useState("");
  // Stops a second press while the first is in flight.
  const settling = useRef(false);

  useEffect(() => {
    let cancelled = false;
    amIAdmin().then(async (yes) => {
      if (cancelled) return;
      setAllowed(yes);
      if (!yes) return;
      try {
        const numbers = await loadOverview();
        if (!cancelled) setOverview(numbers);
      } catch (error) {
        if (!cancelled) setProblem(error.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Each list is fetched the first time its tab is opened, and again when the
  // report filter changes.
  useEffect(() => {
    if (!allowed) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        if (tab === "Reports") setReports(await loadReports(reportFilter));
        if (tab === "Creators" && !creators) setCreators(await loadCreators());
        if (tab === "Characters" && !characters) setCharacters(await loadTopCharacters());
      } catch (error) {
        if (!cancelled) setProblem(error.message);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, tab, reportFilter]);

  const settle = async (id, status) => {
    if (settling.current) return;
    settling.current = true;

    // Answer the press at once; the lists and the count follow.
    setReports((current) =>
      current?.map((row) => (row.id === id ? { ...row, status } : row))
    );
    setOverview((current) =>
      current ? { ...current, openReports: Math.max(0, current.openReports - 1) } : current
    );

    try {
      await settleReport(id, status);
      setReports(await loadReports(reportFilter));
      setOverview(await loadOverview());
    } catch (error) {
      setProblem(error.message);
      setReports(await loadReports(reportFilter).catch(() => null));
    } finally {
      settling.current = false;
    }
  };

  if (allowed === null) {
    return (
      <div className="min-h-screen bg-[#1b2233]">
        <DashboardNav />
        <PageSkeleton />
      </div>
    );
  }

  // Same answer the API gives: there is nothing here for you.
  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#1b2233]">
        <DashboardNav />
        <div className="mx-auto max-w-[520px] px-6 py-24 text-center">
          <h1 className="font-ui text-3xl font-bold text-white">Page not found</h1>
          <p className="mt-4 font-ui text-lg text-neutral-300">
            This page does not exist, or is not yours to open.
          </p>
          <Link
            to="/creators-hub"
            className="mt-8 inline-block rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-8 py-3 font-ui text-base font-bold text-white hover:opacity-90"
          >
            Back to your hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1b2233] pb-20">
      <DashboardNav />

      <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6">
        <h1 className="font-ui text-3xl font-black text-white sm:text-4xl">Site activity</h1>
        <p className="mt-2 font-ui text-base text-neutral-400">
          Everything happening across VantaOrigin, as it stands right now.
        </p>

        {problem && (
          <p role="alert" className="mt-5 rounded-xl bg-[#3a2030] px-5 py-4 font-ui text-base text-[#ffb4c4]">
            {problem}
          </p>
        )}

        {/* The numbers */}
        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
          {overview ? (
            <>
              <Figure
                label="Creators"
                value={overview.creators.total}
                note={`${overview.creators.thisWeek} this week`}
              />
              <Figure
                label="Verified emails"
                value={overview.creators.verified}
                note={`of ${overview.creators.total}`}
              />
              <Figure
                label="Characters"
                value={overview.characters.total}
                note={`${overview.characters.public} published`}
              />
              <Figure label="Likes" value={overview.likes} note={`${overview.posts} posts`} />
              <Figure
                label="Reports waiting"
                value={overview.openReports}
                note={overview.openReports ? "needs a look" : "all clear"}
              />
              <Figure
                label="Newsletter"
                value={overview.newsletter?.subscribed ?? 0}
                note={`${overview.newsletter?.thisWeek ?? 0} this week`}
              />
            </>
          ) : (
            Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[104px] rounded-2xl" />
            ))
          )}
        </div>

        {/* Which list */}
        <div className="mt-9 flex flex-wrap items-center gap-2">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              aria-pressed={tab === name}
              className={`rounded-full px-5 py-2.5 font-ui text-sm font-bold transition-colors sm:text-base ${
                tab === name ? "bg-white text-black" : "bg-white/5 text-neutral-300 hover:text-white"
              }`}
            >
              {name}
              {name === "Reports" && overview?.openReports > 0 && (
                <span className="ml-2 rounded-full bg-[#c2185b] px-2 py-0.5 font-ui text-xs text-white">
                  {overview.openReports}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "Reports" && (
          <section className="mt-5">
            <div className="flex flex-wrap gap-2">
              {["open", "reviewed", "dismissed", "all"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setReports(null);
                    setReportFilter(status);
                  }}
                  aria-pressed={reportFilter === status}
                  className={`rounded-full px-4 py-1.5 font-ui text-sm transition-colors ${
                    reportFilter === status
                      ? "bg-[#2b3547] text-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {!reports && <Skeleton className="h-[140px] rounded-2xl" />}
              {reports?.length === 0 && (
                <p className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center font-ui text-base text-neutral-400">
                  {reportFilter === "open" ? "No reports waiting." : `No ${reportFilter} reports.`}
                </p>
              )}
              {reports?.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onSettle={settle}
                  busy={settling.current}
                />
              ))}
            </div>
          </section>
        )}

        {tab === "Creators" && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            {!creators && <Skeleton className="h-[220px]" />}
            {creators && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#222b3c] font-ui text-sm text-neutral-400">
                      <th className="px-5 py-3 font-normal">Creator</th>
                      <th className="px-5 py-3 font-normal">Email</th>
                      <th className="px-5 py-3 font-normal">Characters</th>
                      <th className="px-5 py-3 font-normal">Verified</th>
                      <th className="px-5 py-3 font-normal">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creators.map((creator) => (
                      <tr key={creator.id} className="border-t border-white/5 bg-[#1e2637]">
                        <td className="px-5 py-3">
                          <Link
                            to={`/creator/${creator.username.replace(/^@/, "")}`}
                            className="font-ui text-base font-bold text-white hover:text-[#6b8ff5]"
                          >
                            {creator.username}
                          </Link>
                          {(creator.firstName || creator.lastName) && (
                            <span className="ml-2 font-ui text-sm text-neutral-400">
                              {creator.firstName} {creator.lastName}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-ui text-sm text-neutral-300">{creator.email}</td>
                        <td className="px-5 py-3 font-ui text-base text-white">{creator.characters}</td>
                        <td className="px-5 py-3 font-ui text-sm">
                          <span className={creator.emailVerified ? "text-[#5fdc8a]" : "text-neutral-500"}>
                            {creator.emailVerified ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-ui text-sm text-neutral-400">
                          {day(creator.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "Newsletter" && <NewsletterPanel onTrouble={setProblem} />}

        {tab === "Letters" && <NewsletterLetters onTrouble={setProblem} />}

        {tab === "Characters" && (
          <section className="mt-5">
            {!characters && <Skeleton className="h-[220px] rounded-2xl" />}
            {characters?.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center font-ui text-base text-neutral-400">
                No characters yet.
              </p>
            )}
            {characters && characters.length > 0 && (
              <ol className="flex flex-col gap-3">
                {characters.map((character, index) => (
                  <li
                    key={character.id}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#222b3c] p-3"
                  >
                    <span className="w-6 shrink-0 text-center font-ui text-base font-bold text-neutral-500">
                      {index + 1}
                    </span>
                    <img
                      src={character.coverUrl || characterCover}
                      alt=""
                      loading="lazy"
                      className="size-14 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/character/${character.slug || character.id}`}
                        className="block truncate font-ui text-base font-bold text-white hover:text-[#6b8ff5]"
                      >
                        {character.name}
                      </Link>
                      <p className="truncate font-ui text-sm text-neutral-400">
                        {character.creator} · {character.isPublic ? "published" : "private"} ·{" "}
                        {day(character.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 font-ui text-base font-bold text-[#f5af32]">
                      {character.likes}
                      <span className="ml-1 font-normal text-neutral-400">likes</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
