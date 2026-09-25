import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import Loading, { Skeleton } from "../components/Loading.jsx";
import {
  amIAdmin,
  loadCreators,
  loadOverview,
  loadReports,
  loadTopCharacters,
  settleReport,
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

const TABS = ["Reports", "Creators", "Characters"];

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
            to={`/character?id=${report.characterId}`}
            className="rounded-full border border-white/30 px-4 py-2 font-ui text-sm text-white hover:bg-white/10"
          >
            See the character
          </Link>
        )}
        {report.subject?.username && (
          <Link
            to={`/realm/${report.subject.username.replace(/^@/, "")}`}
            className="rounded-full border border-white/30 px-4 py-2 font-ui text-sm text-white hover:bg-white/10"
          >
            See the Realm
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
        <Loading label="Checking your account" />
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
        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
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
            </>
          ) : (
            Array.from({ length: 5 }).map((_, index) => (
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
                            to={`/realm/${creator.username.replace(/^@/, "")}`}
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
                        to={`/character?id=${character.id}`}
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
