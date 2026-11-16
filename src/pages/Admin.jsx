import { useCallback, useEffect, useRef, useState } from"react";
import { Link } from"react-router-dom";
import DashboardNav from"../components/DashboardNav";
import { Skeleton } from"../components/Loading.jsx";
import NewsletterLetters from"../components/NewsletterEditor.jsx";
import {
  forgetSubscriber,
  importSubscribers,
  loadCreators,
  loadFunnel,
  loadOverview,
  loadReports,
  loadSubscribers,
  loadTopCharacters,
  resendWelcome,
  setSubscriberStatus,
  shrinkProgress,
  startShrinking,
  settleReport,
  subscribersFileUrl,
} from"../data/admin";
import characterCover from"../assets/creator/character-cover.svg";
import BlogPanel from"../components/BlogPanel.jsx";
import SuppressionPanel from"../components/SuppressionPanel";
import AdminShell from"../components/AdminShell";
import AnnouncementsPanel from"../components/AnnouncementsPanel";
import { usePrivatePage } from"../data/pageMeta";

// What is happening across VantaOrigin, for whoever runs it: the numbers, the
// reports waiting to be dealt with, who has joined, and what people like.

const REASONS = {
  copyright:"Copyright or stolen work",
  inappropriate:"Inappropriate content",
  harassment:"Harassment or abuse",
  spam:"Spam",
  other:"Other",
};

const TABS = ["Reports","Creators","Characters","Blog","Newsletter","Letters","Announcements","Blocked"];

const day = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" }) :"Not yet";

// Where people stop.
//
// Four steps, each a subset of the last, so the gap between two bars is the
// number of people who got that far and no further. The widest gap is the
// thing worth fixing, and it is the one question a visitor count cannot
// answer.
function Journey({ days = 30 }) {
  const [answer, setAnswer] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadFunnel(days)
      .then((next) => !cancelled && setAnswer(next))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (!answer) return <Skeleton className="mt-4 h-[168px] rounded-xl" />;

  const { joined, verified, made, published } = answer.recent;
  const steps = [
    { label:"Made an account", value: joined },
    { label:"Confirmed their email", value: verified },
    { label:"Made a character", value: made },
    { label:"Published one", value: published },
  ];

  // The largest fall between two steps, which is where to look first.
  let worst = null;
  for (let i = 1; i < steps.length; i += 1) {
    const lost = steps[i - 1].value - steps[i].value;
    if (lost > 0 && (!worst || lost > worst.lost)) {
      worst = { lost, from: steps[i - 1].label, to: steps[i].label };
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-[#e6e8ec] bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-ui text-base font-bold text-[#1b2233]">
          How far people get, these last {answer.days} days
        </h2>
        <p className="font-ui text-sm text-[#677181]">
          {answer.allTime.published} of {answer.allTime.joined} have ever published
        </p>
      </div>

      <ol className="mt-4 flex flex-col gap-2.5">
        {steps.map((step, index) => {
          const share = joined ? Math.round((step.value / joined) * 100) : 0;
          const lost = index === 0 ? 0 : steps[index - 1].value - step.value;
          return (
            <li key={step.label} className="flex items-center gap-3">
              <span className="w-[150px] shrink-0 font-ui text-sm text-[#39435a] sm:w-[170px]">
                {step.label}
              </span>
              <span className="relative h-7 min-w-[2px] flex-1 overflow-hidden rounded-md bg-black/25">
                <span
                  className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-[#c2185b] to-[#a855f7]"
                  style={{ width: `${Math.max(share, step.value ? 2 : 0)}%` }}
                />
              </span>
              <span className="w-[86px] shrink-0 text-right font-ui text-sm text-[#1b2233]">
                {step.value}
                <span className="ml-1.5 text-[#677181]">{share}%</span>
              </span>
              <span className="hidden w-[76px] shrink-0 text-right font-ui text-sm text-[#677181] sm:block">
                {lost > 0 ? `−${lost}` :""}
              </span>
            </li>
          );
        })}
      </ol>

      {worst && (
        <p className="mt-4 font-ui text-sm text-[#677181]">
          Most are lost between <span className="text-[#1b2233]">{worst.from.toLowerCase()}</span> and{" "}
          <span className="text-[#1b2233]">{worst.to.toLowerCase()}</span>: {worst.lost}{" "}
          {worst.lost === 1 ?"person" :"people"}.
        </p>
      )}
      {!worst && joined > 0 && (
        <p className="mt-4 font-ui text-sm text-[#677181]">
          Everybody who joined got all the way through.
        </p>
      )}
    </section>
  );
}

// A number, with no card around it.
//
// Six bordered boxes in a row is six borders, six corner radii and six
// fills to say one thing each. Catalyst's dashboard does the same job with
// bare numbers on white separated by hairlines, and it reads as quieter
// without losing anything. Geist puts it as a rule: draw each border once.
//
// The note was a blue that meant nothing. Numbers that are merely context
// are muted; the figure itself carries the weight, which is the only
// hierarchy this needs.
// No dividers between the figures.
//
// There were vertical rules with `first:border-l-0 first:pl-0` to drop the
// one on the left. `first:` means the first child of the grid, not the
// first of each row, so on the second row the leading figure kept both the
// rule and its 20px of padding and sat indented from the one above it.
//
// The fix is not a cleverer selector. It is that six numbers in a grid do
// not need eleven lines drawn between them: the gap already separates
// them, and with the rules gone there is nothing left to misalign.
function Figure({ label, value, note }) {
  return (
    <div>
      <p className="font-ui text-sm text-[#677181]">{label}</p>
      {/* Tabular figures, so a column of numbers lines up rather than
          wobbling as the digits change. */}
      <p className="mt-1 font-ui text-3xl font-bold tabular-nums text-[#1b2233]">{value}</p>
      {note && <p className="mt-1 font-ui text-sm text-[#677181]">{note}</p>}
    </div>
  );
}

function ReportCard({ report, onSettle, busy }) {
  return (
    <article className="rounded-xl border border-[#e6e8ec] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-ui text-base font-bold text-[#1b2233]">
            {REASONS[report.reason] || report.reason}
          </p>
          <p className="mt-1 font-ui text-sm text-[#677181]">
            About <span className="text-[#1b2233]">{report.subject?.username ||"a deleted account"}</span>
            {" ·"}
            from {report.reporter?.username ||"a deleted account"}
            {" ·"}
            {day(report.createdAt)}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 font-ui text-xs font-bold ${
            report.status ==="open"
              ?"bg-[#fdf2f7] text-[#9b1c44]"
              :"bg-[#f1f2f5] text-[#39435a]"
          }`}
        >
          {report.status}
        </span>
      </div>

      {report.message && (
        <p className="mt-3 whitespace-pre-line rounded-xl bg-black/25 px-4 py-3 font-ui text-sm leading-relaxed text-[#39435a]">
          {report.message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {report.characterId && (
          <Link
            to={`/character/${report.characterSlug || report.characterId}`}
            className="rounded-full border border-[#e6e8ec] px-4 py-2 font-ui text-sm text-[#1b2233] hover:bg-[#f1f2f5]"
          >
            See the character
          </Link>
        )}
        {report.subject?.username && (
          <Link
            to={`/creator/${report.subject.username.replace(/^@/,"")}`}
            className="rounded-full border border-[#e6e8ec] px-4 py-2 font-ui text-sm text-[#1b2233] hover:bg-[#f1f2f5]"
          >
            See their page
          </Link>
        )}

        {report.status ==="open" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSettle(report.id,"reviewed")}
              className="rounded-full bg-[#3ecf6a] px-4 py-2 font-ui text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              Acted on it
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSettle(report.id,"dismissed")}
              className="rounded-full border border-[#e6e8ec] px-4 py-2 font-ui text-sm text-[#39435a] hover:bg-[#f1f2f5] disabled:opacity-50"
            >
              Nothing in it
            </button>
          </>
        )}
      </div>
    </article>
  );
}

// Making the stored pictures smaller.
//
// Everything uploaded before the API learned to shrink them was kept exactly
// as it arrived. This walks the bucket once; addresses do not change, so
// nothing that has been shared or indexed stops working.
function ShrinkPictures({ onTrouble }) {
  const [state, setState] = useState(null);

  const ask = useCallback(async () => {
    try {
      setState(await shrinkProgress());
    } catch {
      // A failed look changes nothing on screen.
    }
  }, []);

  useEffect(() => {
    ask();
  }, [ask]);

  useEffect(() => {
    if (!state?.running) return undefined;
    const timer = setInterval(ask, 2000);
    return () => clearInterval(timer);
  }, [state?.running, ask]);

  const begin = async () => {
    try {
      await startShrinking();
      await ask();
    } catch (error) {
      onTrouble(error.message);
    }
  };

  const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-black/25 p-4">
      <p className="font-ui text-sm font-bold text-[#1b2233]">Shrink the stored pictures</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-ui text-sm text-[#677181]">
          {state?.running
            ? `Working through them… ${state.shrunk} shrunk, ${megabytes(state.saved)} saved so far.`
            : state?.finishedAt
              ? `${state.shrunk} shrunk, ${state.skipped} already fine, ${megabytes(state.saved)} saved.`
              :"Pictures uploaded before now were stored at full size. Their addresses do not change."}
        </p>
        <button
          type="button"
          onClick={begin}
          disabled={state?.running}
          className="shrink-0 rounded-full border border-[#e6e8ec] px-5 py-2.5 font-ui text-sm text-[#1b2233] hover:bg-[#f1f2f5] disabled:opacity-40"
        >
          {state?.running ?"Running…" :"Shrink them"}
        </button>
      </div>
      {state?.failed > 0 && (
        <p className="font-ui text-sm text-[#9b1c44]">
          {state.failed} could not be read, and were left as they were.
        </p>
      )}
    </div>
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
      <p className="font-ui text-sm font-bold text-[#1b2233]">Send the welcome letter again</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setState("");
          }}
          placeholder="An address that already has an account"
          className="h-11 min-w-[220px] flex-1 rounded-full border border-[#e6e8ec] bg-black/25 px-5 font-ui text-sm text-[#1b2233] outline-none placeholder:text-[#677181] focus:border-[#6b8ff5]"
        />
        <button
          type="button"
          onClick={send}
          disabled={!to.includes("@") || state ==="Sending…"}
          className="shrink-0 rounded-full border border-[#e6e8ec] px-5 py-2.5 font-ui text-sm text-[#1b2233] hover:bg-[#f1f2f5] disabled:opacity-40"
        >
          Send it
        </button>
      </div>
      {state && <p className="font-ui text-sm text-[#677181]">{state}</p>}
    </div>
  );
}

// Who hears from VantaOrigin. The useful question is usually"is this person
// on it?", so the search box comes before the list.
// Putting addresses on the list: a file chosen, or a list pasted in.
//
// Erasing a row leaves nothing behind, and the first use of that button was
// erasing the wrong person with no way back. The list could always be
// exported and never brought in again, so this is the other half of the
// Download button it sits beside.
//
// The file is read here and sent as text. The server picks the addresses out
// of whatever arrives, so a CSV, a column copied from a spreadsheet and a
// line of addresses all work without anybody choosing a format.
function BringThemBack({ onClose, onDone, onTrouble }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState(null);

  const readFile = async (file) => {
    if (!file) return;
    try {
      setText(await file.text());
      setAnswer(null);
    } catch {
      onTrouble("That file could not be read.");
    }
  };

  const send = async () => {
    setBusy(true);
    setAnswer(null);
    try {
      const result = await importSubscribers(text);
      setAnswer(result);
      setText("");
      await onDone();
    } catch (error) {
      onTrouble(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#e6e8ec] bg-black/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-ui text-sm font-bold text-[#1b2233]">Import addresses</p>
          <p className="mt-1 font-ui text-xs leading-relaxed text-[#677181]">
            A CSV, a column from a spreadsheet, or addresses separated by commas.
            Nobody is emailed: they go on the list and get the next letter.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full px-3 py-1 font-ui text-xs text-[#677181] hover:text-[#1b2233]"
        >
          Close
        </button>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        placeholder={"someone@example.com, another@example.com"}
        aria-label="Addresses to add"
        className="mt-3 w-full resize-y rounded-md border border-[#e6e8ec] bg-black/30 px-4 py-3 font-ui text-sm leading-relaxed text-[#1b2233] outline-none placeholder:text-[#677181] focus:border-[#6b8ff5]"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-full border border-[#e6e8ec] px-4 py-2 font-ui text-xs text-[#39435a] transition-colors hover:bg-[#f1f2f5]">
          Choose a file
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="sr-only"
            onChange={(event) => readFile(event.target.files?.[0])}
          />
        </label>

        <button
          type="button"
          onClick={send}
          disabled={busy || !text.trim()}
          className="rounded-full bg-[#6b8ff5] px-5 py-2 font-ui text-xs font-bold text-[#101725] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ?"Adding…" :"Add them"}
        </button>
      </div>

      {/* Said per address as well as in total: an import that reports only a
          number leaves you wondering which ones it meant. */}
      {answer && (
        <div className="mt-4 rounded-md border border-[#e6e8ec] bg-black/20 p-3">
          <p className="font-ui text-sm text-[#1b2233]">
            {[
              answer.added && `${answer.added} added`,
              answer.returned && `${answer.returned} brought back`,
              answer.already && `${answer.already} already there`,
              answer.failed && `${answer.failed} could not be read`,
            ]
              .filter(Boolean)
              .join(",") ||"Nothing to do."}
          </p>
          <ul className="mt-2 max-h-40 overflow-y-auto font-ui text-xs leading-relaxed text-[#677181]">
            {answer.results.map((row) => (
              <li key={row.email} className="flex justify-between gap-4 py-0.5">
                <span className="truncate">{row.email}</span>
                <span
                  className={
                    row.state ==="added" || row.state ==="returned"
                      ?"shrink-0 text-[#15803d]"
                      : row.state ==="already"
                        ?"shrink-0 text-[#677181]"
                        :"shrink-0 text-[#9b1c44]"
                  }
                >
                  {row.state}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NewsletterPanel({ onTrouble }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [answer, setAnswer] = useState(null);
  const [busyId, setBusyId] = useState("");
  // Which row is waiting for a second press before it is erased.
  const [confirming, setConfirming] = useState("");
  const [importing, setImporting] = useState(false);

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
      {/* The list, and the two ways in and out of it. The welcome letter and
          the picture shrinking used to sit in the middle of this, between the
          count and the search, which is not where either belongs: they are
          occasional jobs, not part of reading the list. They are below the
          table now. */}
      <div className="flex flex-col gap-5 rounded-xl border border-[#e6e8ec] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <p className="font-ui text-xl font-bold leading-tight text-[#1b2233]">
              {counts ? `${counts.subscribed} on the list` :"Counting…"}
            </p>
            <p className="mt-1.5 font-ui text-sm leading-relaxed text-[#677181]">
              {counts
                ? `${counts.unsubscribed} ${counts.unsubscribed === 1 ?"has" :"have"} left. Every new account joins, and can leave from any email we send.`
                :""}
            </p>
          </div>

          {/* Out and in, the same height and side by side, because they are
              two halves of one thing. A file carries the list to whatever
              sends the mail; an import brings one back. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setImporting((was) => !was)}
              aria-expanded={importing}
              className="h-10 rounded-full border border-[#e6e8ec] px-5 font-ui text-sm text-[#1b2233] transition-colors hover:bg-[#f1f2f5]"
            >
              Import addresses
            </button>
            <a
              href={subscribersFileUrl("subscribed")}
              className="flex h-10 items-center rounded-full border border-[#e6e8ec] px-5 font-ui text-sm text-[#1b2233] transition-colors hover:bg-[#f1f2f5]"
            >
              Download CSV
            </a>
          </div>
        </div>

        {importing && (
          <BringThemBack
            onClose={() => setImporting(false)}
            onDone={refresh}
            onTrouble={onTrouble}
          />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="min-w-[200px] flex-1">
            <span className="sr-only">Search addresses</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search an address…"
              className="h-11 w-full rounded-full border border-[#e6e8ec] bg-black/25 px-5 font-ui text-sm text-[#1b2233] outline-none placeholder:text-[#677181] focus:border-[#6b8ff5]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {["all","subscribed","unsubscribed"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setStatus(name)}
                aria-pressed={status === name}
                className={`rounded-full px-4 py-1.5 font-ui text-sm transition-colors ${
                  status === name ?"bg-white text-[#1b2233]" :"text-[#677181] hover:text-[#1b2233]"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!answer && <Skeleton className="mt-4 h-[220px] rounded-xl" />}

      {answer?.rows.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-[#e6e8ec] px-6 py-12 text-center font-ui text-base text-[#677181]">
          {query ? `Nobody matching “${query}”.` :"Nobody on the list yet."}
        </p>
      )}

      {answer && answer.rows.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-[#e6e8ec]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="bg-white font-ui text-sm text-[#677181]">
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
                  <tr key={row.id} className="border-t border-[#e6e8ec] bg-white">
                    <td className="px-5 py-3 font-ui text-sm text-[#1b2233]">{row.email}</td>
                    <td className="px-5 py-3 font-ui text-sm text-[#677181]">
                      {row.source ==="signup"
                        ?"signing up"
                        : row.source ==="google"
                          ?"Google sign-up"
                          : row.source ==="import"
                            ?"an import"
                            :"the footer"}
                    </td>
                    <td className="px-5 py-3 font-ui text-sm">
                      <span className={row.hasAccount ?"text-[#15803d]" :"text-[#677181]"}>
                        {row.hasAccount ?"Yes" :"No"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-ui text-sm">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          row.status ==="subscribed"
                            ?"bg-[#f1f2f5] text-[#39435a]"
                            :"bg-[#fdf2f7] text-[#9b1c44]"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-ui text-sm text-[#677181]">
                      {day(row.unsubscribedAt || row.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {row.status ==="subscribed" ? (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => act(row.id, () => setSubscriberStatus(row.id,"unsubscribed"))}
                            className="rounded-full border border-[#e6e8ec] px-4 py-1.5 font-ui text-sm text-[#39435a] hover:bg-[#f1f2f5] disabled:opacity-50"
                          >
                            Take off
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => act(row.id, () => setSubscriberStatus(row.id,"subscribed"))}
                            className="rounded-full border border-[#e6e8ec] px-4 py-1.5 font-ui text-sm text-[#39435a] hover:bg-[#f1f2f5] disabled:opacity-50"
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
                            className="rounded-full px-3 py-1.5 font-ui text-sm text-[#677181] hover:text-[#9b1c44]"
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
            <p className="border-t border-[#e6e8ec] bg-white px-5 py-3 font-ui text-sm text-[#677181]">
              Showing the newest {answer.rows.length} of {answer.matching}. Search to narrow it down.
            </p>
          )}
        </div>
      )}

      {/* Neither of these is about the list. They were between the count and
          the search, in front of the one job this screen exists for. */}
      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[#e6e8ec] bg-white p-5">
        <p className="font-ui text-xs font-bold uppercase tracking-[0.12em] text-[#677181]">
          Other jobs
        </p>
        <WelcomeAgain onTrouble={onTrouble} />
        <ShrinkPictures onTrouble={onTrouble} />
      </div>
    </section>
  );
}

export default function Admin() {
  // Never a search result: see usePrivatePage.
  usePrivatePage();
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [reportFilter, setReportFilter] = useState("open");
  const [reports, setReports] = useState(null);
  const [creators, setCreators] = useState(null);
  const [characters, setCharacters] = useState(null);
  const [problem, setProblem] = useState("");
  // Stops a second press while the first is in flight.
  const settling = useRef(false);

  // RequireAdmin has already settled whether this screen may be opened, so
  // there is nothing to ask here beyond the numbers.
  useEffect(() => {
    let cancelled = false;
    loadOverview()
      .then((numbers) => {
        if (!cancelled) setOverview(numbers);
      })
      .catch((error) => {
        if (!cancelled) setProblem(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Each list is fetched the first time its tab is opened, and again when the
  // report filter changes.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (tab ==="Reports") setReports(await loadReports(reportFilter));
        if (tab ==="Creators" && !creators) setCreators(await loadCreators());
        if (tab ==="Characters" && !characters) setCharacters(await loadTopCharacters());
      } catch (error) {
        if (!cancelled) setProblem(error.message);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, reportFilter]);

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


  // What each section is for, said once at the top rather than repeated
  // inside every panel.
  const ABOUT = {
    Overview:"Everything happening across VantaOrigin, as it stands right now.",
    Reports:"What people have flagged, and what was done about it.",
    Creators:"Who has joined, and how far they have got.",
    Characters:"What has been made, and what people like.",
    Blog:"Posts, drafts, and what is published.",
    Letters:"Write and send the creator newsletter.",
    Announcements:"For things people cannot opt out of. Everything else belongs in the newsletter.",
    Newsletter:"Who is on the list, and how they got there.",
    Blocked:"Addresses nothing is sent to, and whether the sender is telling us anything.",
  };

  return (
    <AdminShell
      tab={tab}
      onPick={setTab}
      counts={{ Reports: overview?.openReports ?? 0 }}
      title={tab}
      intro={ABOUT[tab]}
    >
      {problem && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-[#f3c6d4] bg-[#fdf2f7] px-5 py-4 font-ui text-base text-[#9b1c44]"
        >
          {problem}
        </p>
      )}

      {tab ==="Overview" && (
        <section>
          <div className="grid grid-cols-2 gap-x-10 gap-y-7 rounded-xl border border-[#e6e8ec] bg-white p-6 md:grid-cols-3">
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
                  note={overview.openReports ?"needs a look" :"all clear"}
                />
                <Figure
                  label="Newsletter"
                  value={overview.newsletter?.subscribed ?? 0}
                  note={`${overview.newsletter?.thisWeek ?? 0} this week`}
                />
              </>
            ) : (
              Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-[104px] rounded-xl" />
              ))
            )}
          </div>

          <Journey />
        </section>
      )}

        {tab ==="Reports" && (
          <section className="mt-5">
            <div className="flex flex-wrap gap-2">
              {["open","reviewed","dismissed","all"].map((status) => (
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
                      ?"bg-white text-[#1b2233]"
                      :"text-[#677181] hover:text-[#1b2233]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {!reports && <Skeleton className="h-[140px] rounded-xl" />}
              {reports?.length === 0 && (
                <p className="rounded-xl border border-dashed border-[#e6e8ec] px-6 py-12 text-center font-ui text-base text-[#677181]">
                  {reportFilter ==="open" ?"No reports waiting." : `No ${reportFilter} reports.`}
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

        {tab ==="Creators" && (
          <section className="mt-5 overflow-hidden rounded-xl border border-[#e6e8ec]">
            {!creators && <Skeleton className="h-[220px]" />}
            {creators && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead>
                    <tr className="bg-white font-ui text-sm text-[#677181]">
                      <th className="px-5 py-3 font-normal">Creator</th>
                      <th className="px-5 py-3 font-normal">Email</th>
                      <th className="px-5 py-3 font-normal">Characters</th>
                      <th className="px-5 py-3 font-normal">Verified</th>
                      <th className="px-5 py-3 font-normal">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creators.map((creator) => (
                      <tr key={creator.id} className="border-t border-[#e6e8ec] bg-white">
                        <td className="px-5 py-3">
                          <Link
                            to={`/creator/${creator.username.replace(/^@/,"")}`}
                            className="font-ui text-base font-bold text-[#1b2233] hover:text-[#1d4ed8]"
                          >
                            {creator.username}
                          </Link>
                          {(creator.firstName || creator.lastName) && (
                            <span className="ml-2 font-ui text-sm text-[#677181]">
                              {creator.firstName} {creator.lastName}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-ui text-sm text-[#39435a]">{creator.email}</td>
                        <td className="px-5 py-3 font-ui text-base text-[#1b2233]">{creator.characters}</td>
                        <td className="px-5 py-3 font-ui text-sm">
                          <span className={creator.emailVerified ?"text-[#15803d]" :"text-[#677181]"}>
                            {creator.emailVerified ?"Yes" :"No"}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-ui text-sm text-[#677181]">
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

        {tab ==="Blog" && <BlogPanel onTrouble={setProblem} />}

        {tab ==="Newsletter" && <NewsletterPanel onTrouble={setProblem} />}
        {tab ==="Announcements" && <AnnouncementsPanel onTrouble={setProblem} />}
        {tab ==="Blocked" && <SuppressionPanel onTrouble={setProblem} />}

        {tab ==="Letters" && <NewsletterLetters onTrouble={setProblem} />}

        {tab ==="Characters" && (
          <section className="mt-5">
            {!characters && <Skeleton className="h-[220px] rounded-xl" />}
            {characters?.length === 0 && (
              <p className="rounded-xl border border-dashed border-[#e6e8ec] px-6 py-12 text-center font-ui text-base text-[#677181]">
                No characters yet.
              </p>
            )}
            {characters && characters.length > 0 && (
              <ol className="flex flex-col gap-3">
                {characters.map((character, index) => (
                  <li
                    key={character.id}
                    className="flex items-center gap-4 rounded-xl border border-[#e6e8ec] bg-white p-3"
                  >
                    <span className="w-6 shrink-0 text-center font-ui text-base font-bold text-[#677181]">
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
                        className="block truncate font-ui text-base font-bold text-[#1b2233] hover:text-[#1d4ed8]"
                      >
                        {character.name}
                      </Link>
                      <p className="truncate font-ui text-sm text-[#677181]">
                        {character.creator} · {character.isPublic ?"published" :"private"} ·{" "}
                        {day(character.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 font-ui text-base font-bold text-[#92400e]">
                      {character.likes}
                      <span className="ml-1 font-normal text-[#677181]">likes</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
    </AdminShell>
  );
}
