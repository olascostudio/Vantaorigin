// Addresses we have stopped writing to, and the way back.
//
// The webhook endpoint fills this list by itself and never empties it. That
// is right for a mailbox that no longer exists and wrong for the cases that
// actually turn up: a mail server having a bad hour, a corporate filter
// reporting a newsletter on somebody's behalf, a person who pressed the
// wrong thing and wrote in to say so.
//
// Being on this list means not even a password reset arrives, so this
// screen exists to make a wrong entry visible and reversible rather than
// permanent and invisible. Two things follow from that: the sender's own
// words are shown so a decision can be made without guessing, and lifting
// one asks for a reason, because it is answerable later.
import { useCallback, useEffect, useState } from"react";
import { liftSuppression, loadSuppressions, loadWebhookEvents } from"../data/admin";

const WHY = {
  hard_bounce:"The address bounced permanently",
  complaint:"Reported as spam",
  manual:"Added by hand",
};

const day = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" })
    :"";

function Row({ row, onLift, busy }) {
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");

  return (
    <li className="rounded-xl border border-[#e6e8ec] bg-[#f6f7f9] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-ui text-base font-bold text-[#1b2233] break-all">{row.email}</p>
          <p className="mt-1 font-ui text-sm text-[#677181]">
            {WHY[row.reason] || row.reason}
            {row.createdAt ? ` · ${day(row.createdAt)}` :""}
          </p>
        </div>
        {!asking && (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="shrink-0 rounded-full border border-[#e6e8ec] px-4 py-2 font-ui text-sm font-bold text-[#1b2233] transition hover:bg-[#f1f2f5]"
          >
            Write to them again
          </button>
        )}
      </div>

      {/* What the sender actually said. An admin deciding whether a"permanent" bounce was really permanent needs the diagnostic line,
          not our summary of it. */}
      {row.diagnostic && (
        <p className="mt-3 rounded-md bg-black/30 p-3 font-mono text-xs leading-relaxed text-[#39435a] break-all">
          {row.diagnostic}
        </p>
      )}
      {row.bounceType && (
        <p className="mt-2 font-ui text-xs text-[#677181]">
          Sender called it: {row.bounceType}
          {row.bounceSubType ? ` / ${row.bounceSubType}` :""}
        </p>
      )}

      {asking && (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="font-ui text-sm leading-relaxed text-[#39435a]">
            This starts writing to {row.email} again. If the address really is gone, the next
            bounce puts it straight back.
          </p>
          <label
            htmlFor={`why-${row.id}`}
            className="mt-3 block font-ui text-sm font-bold text-[#1b2233]"
          >
            Why are you lifting it?
          </label>
          <input
            id={`why-${row.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="They wrote in — their mail server was misconfigured"
            className="mt-2 w-full rounded-md border border-[#e6e8ec] bg-black/30 px-4 py-2.5 font-ui text-sm text-[#1b2233] outline-none placeholder:text-[#677181] focus:border-[#e6e8ec]"
          />
          <p className="mt-2 font-ui text-xs text-[#677181]">
            Kept with your name against it. This is a decision about someone&rsquo;s access to
            their own account.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !note.trim()}
              onClick={() => onLift(row.email, note.trim())}
              className="rounded-full bg-primary px-5 py-2.5 font-ui text-sm font-bold text-white transition disabled:opacity-40"
            >
              Lift it
            </button>
            <button
              type="button"
              onClick={() => {
                setAsking(false);
                setNote("");
              }}
              className="rounded-full border border-[#e6e8ec] px-5 py-2.5 font-ui text-sm font-bold text-[#1b2233] transition hover:bg-[#f1f2f5]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

// Whether the sender is telling us anything at all.
//
// Above the blocked list on purpose. Setting the webhook up is the one
// moment somebody needs this, and at that moment the list below is empty,
// so a screen that led with"nothing is blocked, that is the good state"
// would look like everything was fine whether or not a single event had
// ever arrived.
//
//"Nothing has ever arrived" is the whole point of the panel. Everything
// else is detail.
const SAYS = {"email.delivered":"Arrived","email.bounced":"Bounced","email.complained":"Reported as spam","email.opened":"Opened","email.clicked":"Clicked",
};

function WebhookFeed() {
  const [data, setData] = useState(null);

  useEffect(() => {
    loadWebhookEvents()
      .then(setData)
      .catch(() => setData({ everReceived: false, total: 0, events: [], thisWeek: [] }));
  }, []);

  if (!data) return null;

  return (
    <div className="mb-8 rounded-xl border border-[#e6e8ec] bg-[#f6f7f9] p-5 sm:p-6">
      <h3 className="font-ui text-lg font-bold text-[#1b2233]">What the sender tells us</h3>

      {!data.everReceived ? (
        <>
          <p className="mt-2 font-ui text-sm leading-relaxed text-amber-200">
            Nothing has ever arrived. Until something does, bounces and spam complaints are not
            reaching the blocked list, and we are still writing to addresses that no longer exist.
          </p>
          <p className="mt-3 font-ui text-sm leading-relaxed text-[#677181]">
            Add a webhook in Resend pointing at{" "}
            <span className="break-all font-mono text-xs text-[#39435a]">
              https://api.vantaorigin.com/webhooks/resend
            </span>{" "}
            for the delivered, bounced, complained, opened and clicked events, then put its
            signing secret into RESEND_WEBHOOK_SECRET on the API. Until that secret is set, every
            webhook is refused, which is deliberate.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 font-ui text-sm text-[#677181]">
            {data.total} in total. Last one {day(data.lastAt)}.
          </p>
          {data.thisWeek.length > 0 && (
            <p className="mt-1 font-ui text-sm text-[#677181]">
              This week: {data.thisWeek.map((c) => `${SAYS[c.type] || c.type} ${c.value}`).join(", ")}.
            </p>
          )}
          <ul className="mt-4 flex flex-col gap-2">
            {data.events.slice(0, 10).map((event) => (
              <li
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e6e8ec] bg-[#f6f7f9] px-4 py-2.5"
              >
                <span className="font-ui text-sm text-[#1b2233] break-all">
                  {event.email ||"no address given"}
                </span>
                <span className="flex items-center gap-3">
                  <span
                    className={`font-ui text-xs font-bold ${
                      event.type ==="email.bounced" || event.type ==="email.complained"
                        ?"text-[#9b1c44]"
                        :"text-[#677181]"
                    }`}
                  >
                    {SAYS[event.type] || event.type}
                    {event.bounceType ? ` (${event.bounceType})` :""}
                  </span>
                  <span className="font-ui text-xs text-[#677181]">{day(event.at)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function SuppressionPanel({ onTrouble }) {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  const refresh = useCallback(
    async (search ="") => {
      try {
        setData(await loadSuppressions(search));
      } catch (error) {
        onTrouble?.(error.message);
      }
    },
    [onTrouble]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const lift = async (email, note) => {
    setBusy(true);
    setDone("");
    try {
      await liftSuppression(email, note);
      setDone(`Writing to ${email} again.`);
      await refresh(q);
    } catch (error) {
      onTrouble?.(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return <p className="mt-5 font-ui text-base text-[#677181]">Loading…</p>;
  }

  return (
    <section className="mt-5">
      <WebhookFeed />

      <p className="font-ui text-base leading-relaxed text-[#39435a]">
        Addresses nothing is sent to — not even a password reset. Bounces and spam complaints land
        here on their own.
      </p>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          refresh(q);
        }}
      >
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search an address"
          aria-label="Search an address"
          className="min-w-0 flex-1 rounded-full border border-[#e6e8ec] bg-black/30 px-5 py-2.5 font-ui text-sm text-[#1b2233] outline-none placeholder:text-[#677181] focus:border-[#e6e8ec]"
        />
        <button
          type="submit"
          className="rounded-full bg-[#f1f2f5] px-5 py-2.5 font-ui text-sm font-bold text-[#1b2233] transition hover:bg-[#e6e8ec]"
        >
          Search
        </button>
      </form>

      {done && (
        <p role="status" className="mt-4 font-ui text-sm font-bold text-emerald-400">
          {done}
        </p>
      )}

      <p className="mt-5 font-ui text-sm text-[#677181]">
        {data.total} blocked{q ? ` · ${data.suppressions.length} matching` :""}
      </p>

      {data.suppressions.length === 0 ? (
        <p className="mt-4 rounded-xl border border-[#e6e8ec] bg-[#f6f7f9] p-6 font-ui text-base text-[#39435a]">
          {q ?"Nothing matching that." :"Nothing is blocked. That is the good state."}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {data.suppressions.map((row) => (
            <Row key={row.id} row={row} onLift={lift} busy={busy} />
          ))}
        </ul>
      )}

      {/* Kept visible rather than buried: a lift is the one action here that
          cannot be seen anywhere else afterwards, because it deletes the row
          that recorded the block. */}
      {data.lifts?.length > 0 && (
        <div className="mt-10">
          <h3 className="font-ui text-lg font-bold text-[#1b2233]">Lifted before</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {data.lifts.map((lift) => (
              <li
                key={lift.id}
                className="rounded-xl border border-[#e6e8ec] bg-[#f6f7f9] px-4 py-3 font-ui text-sm"
              >
                <span className="font-bold text-[#1b2233] break-all">{lift.email}</span>
                <span className="text-[#677181]">
                  {" "}
                  — was {WHY[lift.wasReason] || lift.wasReason}. {lift.liftedBy} on{" "}
                  {day(lift.liftedAt)}: {lift.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
