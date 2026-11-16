// Something said to everybody at once.
//
// Deliberately slower to use than the newsletter screen. A newsletter goes
// to people who asked for it; this goes to people who cannot refuse it, and
// two of them reach somebody who has reported us as spam. So the reason has
// to be chosen before anything can be sent, the screen says out loud who
// that choice reaches, and the number of people has to be agreed to at the
// moment of sending rather than glanced at earlier.
import { useCallback, useEffect, useState } from"react";
import {
  audienceFor,
  discardAnnouncement,
  loadAnnouncements,
  previewAnnouncement,
  saveAnnouncement,
  sendAnnouncement,
  startAnnouncement,
  testAnnouncement,
} from"../data/announcements";

const CARD ="rounded-xl border border-[#e6e8ec] bg-[#f6f7f9] p-5 sm:p-6";

// Said in the words somebody choosing would use, not the column values.
const REASONS = {
  terms_change: {
    label:"A change to the terms",
    note:"Reaches everybody, including people who reported us as spam.",
    unavoidable: true,
  },
  privacy_change: {
    label:"A change to the privacy policy",
    note:"Reaches everybody, including people who reported us as spam.",
    unavoidable: true,
  },
  security_notice: {
    label:"A security notice",
    note:"Reaches everybody, including people who reported us as spam.",
    unavoidable: true,
  },
  downtime: {
    label:"Planned downtime",
    note:"Does not reach people who reported us as spam, or whose address bounced.",
    unavoidable: false,
  },
  account_policy: {
    label:"A change to account rules",
    note:"Does not reach people who reported us as spam, or whose address bounced.",
    unavoidable: false,
  },
};

const day = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" }) :"";

// One textarea, split into paragraphs on blank lines. An announcement is
// plain by nature: nobody needs image blocks and buttons to say that the
// terms are changing, and the fewer ways there are to decorate this, the
// more likely it reads like a person wrote it.
const toBlocks = (text) =>
  String(text ||"")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ type:"text", text: part }));

const fromBlocks = (blocks) =>
  (blocks || []).map((b) => b.text || b.html ||"").filter(Boolean).join("\n\n");

function Sent({ row }) {
  return (
    <li className={CARD}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-ui text-base font-bold text-[#1b2233]">{row.subject}</p>
        <span className="font-ui text-xs text-[#677181]">{day(row.sentAt)}</span>
      </div>
      <p className="mt-1 font-ui text-sm text-[#677181]">
        {REASONS[row.reasonCategory]?.label || row.reasonCategory}
        {row.termsVersion ? ` · version ${row.termsVersion}` :""}
      </p>
      {/* The audit, on the screen rather than only in the database. */}
      <p className="mt-3 font-ui text-xs leading-relaxed text-[#677181]">
        Sent by {row.sentByEmail || row.createdByEmail} to {row.audienceCount} people.{" "}
        {row.sentCount} delivered
        {row.skippedCount > 0 ? `, ${row.skippedCount} not sent on purpose` :""}
        {row.failedCount > 0 ? `, ${row.failedCount} did not arrive` :""}.
      </p>
    </li>
  );
}

function Editor({ row, versions, onChanged, onTrouble }) {
  const [subject, setSubject] = useState(row.subject ||"");
  const [text, setText] = useState(fromBlocks(row.blocks));
  const [reason, setReason] = useState(row.reasonCategory ||"");
  const [version, setVersion] = useState(row.termsVersion ||"");
  const [preview, setPreview] = useState(null);
  const [audience, setAudience] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");

  const save = useCallback(async () => {
    setBusy(true);
    try {
      await saveAnnouncement(row.id, {
        subject,
        blocks: toBlocks(text),
        reasonCategory: reason || null,
        termsVersion: version || null,
      });
      setSaid("Saved.");
      const seen = await previewAnnouncement(row.id);
      setPreview(seen);
    } catch (error) {
      onTrouble?.(error.message);
    } finally {
      setBusy(false);
    }
  }, [row.id, subject, text, reason, version, onTrouble]);

  const openConfirm = async () => {
    setBusy(true);
    setSaid("");
    try {
      await save();
      const seen = await previewAnnouncement(row.id);
      if (seen.problem) {
        onTrouble?.(seen.problem);
        return;
      }
      // Counted now, not earlier. The number somebody agrees to has to be
      // the number that will be written to.
      setAudience(await audienceFor(row.id));
      setConfirming(true);
    } catch (error) {
      onTrouble?.(error.message);
    } finally {
      setBusy(false);
    }
  };

  const reallySend = async () => {
    setBusy(true);
    try {
      await sendAnnouncement(row.id, audience.total);
      setConfirming(false);
      setSaid("Going out now.");
      onChanged();
    } catch (error) {
      // The API refuses if the number moved between the screen and the
      // press, and says what it is now.
      onTrouble?.(error.message);
      if (error?.data?.audienceCount) setAudience({ ...audience, total: error.data.audienceCount });
    } finally {
      setBusy(false);
    }
  };

  const chosen = REASONS[reason];

  return (
    <div className={CARD}>
      <label className="block font-ui text-xs font-bold uppercase tracking-wide text-[#677181]">
        Subject
      </label>
      <input
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        placeholder="We are changing the terms"
        className="mt-2 w-full rounded-xl border border-[#e6e8ec] bg-black/30 px-4 py-3 font-ui text-base text-[#1b2233] outline-none placeholder:text-[#677181] focus:border-[#e6e8ec]"
      />

      <label className="mt-5 block font-ui text-xs font-bold uppercase tracking-wide text-[#677181]">
        What it says
      </label>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
        placeholder={"Leave a blank line between paragraphs.\n\nSay what is changing, when, and what somebody has to do about it."}
        className="mt-2 w-full rounded-xl border border-[#e6e8ec] bg-black/30 px-4 py-3 font-ui text-base leading-relaxed text-[#1b2233] outline-none placeholder:text-[#677181] focus:border-[#e6e8ec]"
      />

      <label
        htmlFor={`why-${row.id}`}
        className="mt-5 block font-ui text-xs font-bold uppercase tracking-wide text-[#677181]"
      >
        Why this is being sent
      </label>
      <select
        id={`why-${row.id}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="mt-2 w-full rounded-xl border border-[#e6e8ec] bg-black/30 px-4 py-3 font-ui text-base text-[#1b2233] outline-none focus:border-[#e6e8ec]"
      >
        <option value="">Choose a reason</option>
        {Object.entries(REASONS).map(([value, { label }]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* The consequence of the choice above, said where the choice is made
          rather than left for somebody to know. */}
      {chosen && (
        <p
          className={`mt-2 rounded-xl p-3 font-ui text-sm leading-relaxed ${
            chosen.unavoidable
              ?"bg-amber-400/10 text-amber-200"
              :"bg-[#f6f7f9] text-[#677181]"
          }`}
        >
          {chosen.note}
        </p>
      )}

      {reason ==="terms_change" && (
        <>
          <label
            htmlFor={`version-${row.id}`}
            className="mt-5 block font-ui text-xs font-bold uppercase tracking-wide text-[#677181]"
          >
            Which version
          </label>
          <select
            id={`version-${row.id}`}
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#e6e8ec] bg-black/30 px-4 py-3 font-ui text-base text-[#1b2233] outline-none focus:border-[#e6e8ec]"
          >
            <option value="">Choose a version</option>
            {versions.map((v) => (
              <option key={v.version} value={v.version}>
                {v.version}
              </option>
            ))}
          </select>
          <p className="mt-2 font-ui text-xs text-[#677181]">
            The in app banner asks people to accept this version.
          </p>
        </>
      )}

      {said && (
        <p role="status" className="mt-4 font-ui text-sm font-bold text-emerald-400">
          {said}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="rounded-full bg-[#f1f2f5] px-5 py-2.5 font-ui text-sm font-bold text-[#1b2233] transition hover:bg-[#e6e8ec] disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            await save();
            try {
              const res = await testAnnouncement(row.id);
              setSaid(`Test copy sent to ${res.to}.`);
            } catch (error) {
              onTrouble?.(error.message);
            }
          }}
          className="rounded-full border border-[#e6e8ec] px-5 py-2.5 font-ui text-sm font-bold text-[#1b2233] transition hover:bg-[#f1f2f5] disabled:opacity-50"
        >
          Send me a test copy
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={openConfirm}
          className="rounded-full bg-primary px-5 py-2.5 font-ui text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          Send to everybody
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            await discardAnnouncement(row.id);
            onChanged();
          }}
          className="rounded-full px-5 py-2.5 font-ui text-sm text-[#677181] transition hover:text-[#1b2233] disabled:opacity-50"
        >
          Discard
        </button>
      </div>

      {preview?.html && (
        <details className="mt-6">
          <summary className="cursor-pointer font-ui text-sm font-bold text-[#39435a]">
            What it will look like
          </summary>
          <iframe
            title="Preview"
            srcDoc={preview.html}
            className="mt-3 h-[420px] w-full rounded-xl border border-[#e6e8ec] bg-white"
          />
        </details>
      )}

      {confirming && audience && (
        <div className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/10 p-5">
          <p className="font-ui text-base font-bold text-[#1b2233]">
            Send to {audience.total} {audience.total === 1 ?"person" :"people"}?
          </p>
          <p className="mt-2 font-ui text-sm leading-relaxed text-[#39435a]">
            {chosen?.note} This cannot be taken back once it starts.
          </p>
          {audience.waiting !== audience.total && (
            <p className="mt-2 font-ui text-sm text-[#39435a]">
              {audience.waiting} have not been written to yet. The rest already have.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={reallySend}
              className="rounded-full bg-primary px-6 py-2.5 font-ui text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Yes, send it
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-[#e6e8ec] px-6 py-2.5 font-ui text-sm font-bold text-[#1b2233] transition hover:bg-[#f1f2f5]"
            >
              Not yet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnnouncementsPanel({ onTrouble }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const answer = await loadAnnouncements();
      setData(answer);
      setEditing(null);
    } catch (error) {
      onTrouble?.(error.message);
    }
  }, [onTrouble]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!data) return <p className="mt-5 font-ui text-base text-[#677181]">Loading…</p>;

  const drafts = data.broadcasts.filter((b) => b.status !=="sent");
  const gone = data.broadcasts.filter((b) => b.status ==="sent");

  return (
    <section className="mt-5">
      <p className="font-ui text-base leading-relaxed text-[#39435a]">
        For things people cannot opt out of: a change to the terms, a change to the privacy
        policy, a security notice. Everything else belongs in the newsletter.
      </p>

      {!editing && (
        <button
          type="button"
          onClick={async () => {
            try {
              setEditing(await startAnnouncement({}));
            } catch (error) {
              onTrouble?.(error.message);
            }
          }}
          className="mt-5 rounded-full bg-primary px-6 py-3 font-ui text-sm font-bold text-white transition hover:opacity-90"
        >
          Write one
        </button>
      )}

      {editing && (
        <div className="mt-5">
          <Editor
            key={editing.id}
            row={editing}
            versions={data.termsVersions}
            onChanged={refresh}
            onTrouble={onTrouble}
          />
        </div>
      )}

      {drafts.length > 0 && !editing && (
        <div className="mt-8">
          <h3 className="font-ui text-lg font-bold text-[#1b2233]">Not sent yet</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {drafts.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setEditing(row)}
                  className="w-full rounded-xl border border-[#e6e8ec] bg-[#f6f7f9] px-4 py-3 text-left font-ui text-sm text-[#1b2233] transition hover:bg-[#f6f7f9]"
                >
                  {row.subject ||"Untitled"}
                  <span className="ml-2 text-[#677181]">
                    {row.status ==="sending" ?"going out now" :"draft"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {gone.length > 0 && (
        <div className="mt-8">
          <h3 className="font-ui text-lg font-bold text-[#1b2233]">Already sent</h3>
          <p className="mt-1 font-ui text-sm text-[#677181]">
            Kept as the record of what was said, to whom, and by whom. These cannot be edited or
            removed.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {gone.map((row) => (
              <Sent key={row.id} row={row} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
