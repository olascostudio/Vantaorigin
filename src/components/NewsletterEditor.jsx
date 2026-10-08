import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "./Loading.jsx";

// The same editor the blog uses, and the same reason for loading it late:
// it is heavy, and only this screen needs it.
const RichText = lazy(() => import("./RichText.jsx"));
import {
  countWaiting,
  discardIssue,
  forgetTemplate,
  loadTemplates,
  saveTemplate,
  startFromTemplate,
  loadIssue,
  loadIssues,
  previewIssue,
  saveIssue,
  sendIssue,
  sendTestCopy,
  startIssue,
} from "../data/admin";
import { api } from "../data/api";

// Writing the newsletter.
//
// A letter is a stack of blocks -- a heading, some words, a picture, a button
// -- rather than a page of HTML, so it cannot be broken by typing, and the
// preview on the right is built by the API exactly the way the real email will
// be built. What is on screen is what will arrive.

const KINDS = [
  { type: "heading", label: "Heading" },
  { type: "text", label: "Words" },
  { type: "image", label: "Picture" },
  { type: "button", label: "Button" },
  { type: "divider", label: "Divider" },
  { type: "html", label: "Code" },
];

// Blocks are stored as what they say, with no id of their own. The editor
// gives each one a key for as long as it is on screen, and takes it off again
// before saving: it is React's business, not the letter's.
let nextKey = 0;
const withKey = (block) => ({ ...block, _key: `b${(nextKey += 1)}` });
const withoutKeys = (blocks) => blocks.map(({ _key, ...block }) => block);

const emptyBlock = (type) => {
  if (type === "image") return { type, url: "", alt: "", href: "" };
  if (type === "button") return { type, text: "", href: "" };
  if (type === "divider") return { type };
  if (type === "html") return { type, code: "" };
  return { type, text: "" };
};

const day = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "Not yet";

const field =
  "w-full rounded-xl border border-white/15 bg-black/25 px-4 py-2.5 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#6b8ff5]";

function BlockCard({ block, index, count, onChange, onMove, onRemove, onTrouble }) {
  const [uploading, setUploading] = useState(false);

  const set = (patch) => onChange({ ...block, ...patch });

  const choosePicture = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.upload("/uploads?folder=newsletter", file);
      set({ url });
    } catch (error) {
      onTrouble(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <li className="rounded-2xl border border-white/10 bg-[#222b3c] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-ui text-xs font-bold uppercase tracking-wide text-neutral-500">
          {KINDS.find((kind) => kind.type === block.type)?.label || block.type}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label="Move up"
            className="size-8 rounded-lg font-ui text-sm text-neutral-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === count - 1}
            aria-label="Move down"
            className="size-8 rounded-lg font-ui text-sm text-neutral-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label="Remove this block"
            className="size-8 rounded-lg font-ui text-sm text-neutral-500 hover:bg-white/10 hover:text-[#ffb4c4]"
          >
            ✕
          </button>
        </div>
      </div>

      {block.type === "heading" && (
        <input
          value={block.text || ""}
          onChange={(event) => set({ text: event.target.value })}
          placeholder="What this part is about"
          className={`${field} text-base font-bold`}
        />
      )}

      {block.type === "text" && (
        <>
          <textarea
            value={block.text || ""}
            onChange={(event) => set({ text: event.target.value })}
            rows={6}
            placeholder="Write to them the way you would write to one person."
            className={`${field} resize-y leading-relaxed`}
          />
          <p className="mt-2 font-ui text-xs text-neutral-500">
            Leave a blank line for a new paragraph. **stars** make bold, and [words](https://…) make a
            link.
          </p>
        </>
      )}

      {block.type === "image" && (
        <div className="flex flex-col gap-2">
          {block.url && (
            <img
              src={block.url}
              alt=""
              className="max-h-40 w-full rounded-xl object-cover"
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={block.url || ""}
              onChange={(event) => set({ url: event.target.value })}
              placeholder="Paste a picture address…"
              className={`${field} flex-1`}
            />
            <label className="shrink-0 cursor-pointer rounded-xl border border-white/25 px-4 py-2.5 font-ui text-sm text-white hover:bg-white/10">
              {uploading ? "Sending…" : "Choose a file"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="hidden"
                onChange={(event) => choosePicture(event.target.files?.[0])}
              />
            </label>
          </div>
          <input
            value={block.alt || ""}
            onChange={(event) => set({ alt: event.target.value })}
            placeholder="What the picture shows, for anyone whose mail app won't load it"
            className={field}
          />
          <input
            value={block.href || ""}
            onChange={(event) => set({ href: event.target.value })}
            placeholder="Where it leads, if anywhere (optional)"
            className={field}
          />
        </div>
      )}

      {block.type === "button" && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={block.text || ""}
            onChange={(event) => set({ text: event.target.value })}
            placeholder="See them"
            className={`${field} sm:w-[180px]`}
          />
          <input
            value={block.href || ""}
            onChange={(event) => set({ href: event.target.value })}
            placeholder="https://www.vantaorigin.com/discover"
            className={`${field} flex-1`}
          />
        </div>
      )}

      {block.type === "divider" && (
        <div className="h-px w-full bg-white/15" aria-hidden="true" />
      )}

      {block.type === "html" && (
        <>
          <textarea
            value={block.code || ""}
            onChange={(event) => set({ code: event.target.value })}
            rows={10}
            spellCheck={false}
            placeholder={'<table width="100%"><tr><td style="padding:24px">…</td></tr></table>'}
            className={`${field} resize-y whitespace-pre font-mono text-[12.5px] leading-relaxed`}
          />
          <p className="mt-2 font-ui text-xs text-neutral-500">
            Paste an email you have already built. It goes in as written, inside the VantaOrigin
            shell, so it keeps the banner and the unsubscribe line. Style the elements themselves.
            a style tag is ignored by Gmail, so it is dropped rather than left to look right here
            and wrong there.
          </p>
        </>
      )}
    </li>
  );
}

// What happened when a letter went out.
//
// The number that failed is kept with the addresses it failed for: a count on
// its own cannot be acted on, and a bad address that is never named goes on
// failing on every letter.
function Record({ issue }) {
  const failures = Array.isArray(issue.failures) ? issue.failures : [];
  const when = issue.sentAt
    ? new Date(issue.sentAt).toLocaleString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not yet";

  return (
    <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#222b3c] p-5">
      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
        <div>
          <p className="font-ui text-xs font-bold uppercase tracking-wide text-neutral-500">Sent</p>
          <p className="mt-1 font-ui text-base text-white">{when}</p>
        </div>
        <div>
          <p className="font-ui text-xs font-bold uppercase tracking-wide text-neutral-500">
            Reached
          </p>
          <p className="mt-1 font-ui text-base text-white">
            {issue.sentCount} {issue.sentCount === 1 ? "person" : "people"}
          </p>
        </div>
        {issue.failedCount > 0 && (
          <div>
            <p className="font-ui text-xs font-bold uppercase tracking-wide text-neutral-500">
              Did not arrive
            </p>
            <p className="mt-1 font-ui text-base text-[#ffb4c4]">{issue.failedCount}</p>
          </div>
        )}
      </div>

      {failures.length > 0 && (
        <div className="rounded-xl bg-black/25 p-4">
          <p className="font-ui text-sm text-neutral-400">
            These addresses did not take it. Worth checking, or taking off the list.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {failures.map((failure, index) => (
              <li key={index} className="font-ui text-sm">
                <span className="text-white">{failure.email}</span>
                <span className="text-neutral-500">: {failure.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="font-ui text-sm text-neutral-400">
        This one has gone out, so it is kept exactly as it was sent.
      </p>
    </div>
  );
}

// Sending, once it reads the way it should.
//
// A test copy first, because the only honest preview of an email is an email.
// Then the real send, which answers at once and works through the list behind
// the scenes, so this watches the count climb rather than holding still.
function SendBar({ issue, saved, onChanged, onTrouble }) {
  const [waiting, setWaiting] = useState(null);
  // Whether the server is actually working through the list right now, as
  // opposed to an issue left marked "sending" by a server that stopped.
  const [running, setRunning] = useState(true);
  const [testTo, setTestTo] = useState("");
  const [testState, setTestState] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);

  const going = issue.status === "sending";
  // A send nobody is working on. Without this the screen would show "going
  // out now" for ever after a restart, and the rest of the list would never
  // be written to.
  const stopped = going && !running;

  const ask = useCallback(async () => {
    try {
      const answer = await countWaiting(issue.id);
      setWaiting(answer.waiting);
      setRunning(Boolean(answer.sending));
    } catch {
      // A failed count changes nothing on screen.
    }
  }, [issue.id]);

  useEffect(() => {
    ask();
  }, [ask, issue.status, issue.sentCount]);

  // While it is going out, ask again every couple of seconds -- both for the
  // counts and for whether anybody is still sending them.
  useEffect(() => {
    if (!going) return undefined;
    const timer = setInterval(() => {
      loadIssue(issue.id).then(onChanged).catch(() => {});
      ask();
    }, 2000);
    return () => clearInterval(timer);
  }, [going, issue.id, onChanged, ask]);

  const test = async () => {
    setTestState("Sending…");
    try {
      const answer = await sendTestCopy(issue.id, testTo.trim() || undefined);
      setTestState(`Sent to ${answer.to}`);
    } catch (error) {
      setTestState("");
      onTrouble(error.message);
    }
  };

  const send = async () => {
    setStarting(true);
    try {
      await sendIssue(issue.id);
      setConfirming(false);
      onChanged(await loadIssue(issue.id));
    } catch (error) {
      setConfirming(false);
      onTrouble(error.message);
    } finally {
      setStarting(false);
    }
  };

  if (issue.status === "sent") return null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#222b3c] p-5">
      {/* A copy to read in a real inbox */}
      <div className="flex flex-col gap-2">
        <p className="font-ui text-sm font-bold text-white">Read it in your own inbox first</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={testTo}
            onChange={(event) => setTestTo(event.target.value)}
            placeholder="Your address, unless you name another"
            className={`${field} min-w-[200px] flex-1`}
          />
          <button
            type="button"
            onClick={test}
            // The copy is built from what is stored, so testing before the
            // last keystroke has been saved would post the version before it.
            disabled={going || saved !== "Saved"}
            title={saved !== "Saved" ? "Saving what you just typed…" : undefined}
            className="shrink-0 rounded-full border border-white/25 px-5 py-2.5 font-ui text-sm text-white hover:bg-white/10 disabled:opacity-50"
          >
            Send a test copy
          </button>
        </div>
        {testState && <p className="font-ui text-sm text-neutral-400">{testState}</p>}
      </div>

      <div className="h-px w-full bg-white/10" aria-hidden="true" />

      {/* The real thing */}
      {stopped ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-ui text-base font-bold text-[#ffb4c4]">This send stopped partway.</p>
            <p className="mt-1 font-ui text-sm text-neutral-400">
              {issue.sentCount} went out
              {waiting ? `, ${waiting} still to go` : ", and everybody has been reached"}. Picking it
              up carries on from where it stopped, so nobody is written to twice.
            </p>
          </div>
          <button
            type="button"
            onClick={send}
            disabled={starting}
            className="rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-6 py-2.5 font-ui text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {starting ? "Picking it up…" : "Carry on sending"}
          </button>
        </div>
      ) : going ? (
        <div>
          <p className="font-ui text-base font-bold text-white">Going out now…</p>
          <p className="mt-1 font-ui text-sm text-neutral-400">
            {issue.sentCount} sent{waiting ? `, ${waiting} to go` : ""}. You can leave this page; it
            carries on without you.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-ui text-base font-bold text-white">
              {waiting === null
                ? "Counting who is waiting…"
                : waiting === 0
                  ? "Nobody is waiting for this one."
                  : `Ready for ${waiting} ${waiting === 1 ? "person" : "people"}`}
            </p>
            <p className="mt-1 font-ui text-sm text-neutral-400">
              Only people still on the list, each with their own way out.
            </p>
          </div>

          {confirming ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={send}
                disabled={starting}
                className="rounded-full bg-[#c2185b] px-6 py-2.5 font-ui text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {starting ? "Starting…" : `Yes, send it to ${waiting}`}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-full px-4 py-2.5 font-ui text-sm text-neutral-400 hover:text-white"
              >
                Not yet
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!waiting || saved !== "Saved"}
              title={saved !== "Saved" ? "Saving what you just typed…" : undefined}
              className="rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-6 py-2.5 font-ui text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
            >
              Send it
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Editor({ id, onClose, onTrouble }) {
  const [issue, setIssue] = useState(null);
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [saved, setSaved] = useState("Saved");
  const [preview, setPreview] = useState("");
  const [keeping, setKeeping] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [kept, setKept] = useState("");

  // Nothing is saved until something is typed: opening a letter must not
  // stamp it as changed.
  const touched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadIssue(id)
      .then((next) => {
        if (cancelled) return;
        setIssue(next);
        setSubject(next.subject);
        setPreheader(next.preheader);
        setBlocks((next.blocks || []).map(withKey));
      })
      .catch((error) => !cancelled && onTrouble(error.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const writing = useMemo(
    () => ({ subject, preheader, blocks: withoutKeys(blocks) }),
    [subject, preheader, blocks]
  );
  const sent = issue?.status === "sent";
  const going = issue?.status === "sending";
  // Nothing can be rewritten once it has started leaving.
  const closed = sent || going;

  // Saving follows typing rather than a button: a letter half written and then
  // abandoned should still be there tomorrow.
  useEffect(() => {
    if (!issue || closed || !touched.current) return undefined;
    setSaved("Saving…");
    const timer = setTimeout(async () => {
      try {
        await saveIssue(id, writing);
        setSaved("Saved");
      } catch (error) {
        setSaved("Not saved");
        onTrouble(error.message);
      }
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writing, issue, closed]);

  // The preview is rendered by the API, by the same code that will build the
  // real email. Asking on every keystroke would be one request per letter.
  useEffect(() => {
    if (!issue) return undefined;
    const timer = setTimeout(() => {
      previewIssue(writing)
        .then((made) => setPreview(made.html))
        .catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writing, issue]);

  const change = useCallback((work) => {
    touched.current = true;
    work();
  }, []);

  const keep = async () => {
    try {
      await saveTemplate(templateName.trim(), id);
      setKept(`Kept as "${templateName.trim()}"`);
      setTemplateName("");
      setKeeping(false);
    } catch (error) {
      onTrouble(error.message);
    }
  };

  const setBlock = (target, next) =>
    change(() =>
      setBlocks((current) => current.map((block) => (block._key === target._key ? next : block)))
    );

  const moveBlock = (index, by) =>
    change(() =>
      setBlocks((current) => {
        const next = [...current];
        const target = index + by;
        if (target < 0 || target >= next.length) return current;
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      })
    );

  const removeBlock = (index) =>
    change(() => setBlocks((current) => current.filter((_, i) => i !== index)));

  const addBlock = (type) =>
    change(() => setBlocks((current) => [...current, withKey(emptyBlock(type))]));

  // A letter is written in one go when it is empty or already one piece of
  // writing. Anything else was assembled out of blocks before this editor
  // existed, and keeps those.
  const written = blocks.length === 0 || (blocks.length === 1 && blocks[0].type === "rich");

  const setWriting = (html) =>
    change(() => setBlocks([withKey({ type: "rich", html })]));

  if (!issue) return <Skeleton className="mt-5 h-[420px] rounded-2xl" />;

  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/25 px-4 py-2 font-ui text-sm text-white hover:bg-white/10"
          >
            ← All letters
          </button>

          {/* A letter worth sending twice is a template. */}
          {keeping ? (
            <span className="flex items-center gap-2">
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Call it something"
                className="h-9 w-[180px] rounded-full border border-white/15 bg-black/25 px-4 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#6b8ff5]"
              />
              <button
                type="button"
                onClick={keep}
                disabled={!templateName.trim()}
                className="rounded-full bg-secondary px-4 py-2 font-ui text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
              >
                Keep it
              </button>
              <button
                type="button"
                onClick={() => setKeeping(false)}
                className="rounded-full px-3 py-2 font-ui text-sm text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setKeeping(true)}
              className="rounded-full border border-white/25 px-4 py-2 font-ui text-sm text-neutral-300 hover:bg-white/10 hover:text-white"
            >
              {kept || "Save as template"}
            </button>
          )}
        </div>

        <p className="font-ui text-sm text-neutral-400">
          {sent
            ? `Sent ${day(issue.sentAt)} to ${issue.sentCount} ${issue.sentCount === 1 ? "person" : "people"}`
            : going
              ? `Going out now · ${issue.sentCount} sent`
              : saved}
        </p>
      </div>

      {sent && <Record issue={issue} />}

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        {/* What it says */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#222b3c] p-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-xs font-bold uppercase tracking-wide text-neutral-500">
                Subject
              </span>
              <input
                value={subject}
                disabled={closed}
                onChange={(event) => change(() => setSubject(event.target.value))}
                placeholder="What they see in their inbox"
                className={`${field} text-base disabled:opacity-60`}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-xs font-bold uppercase tracking-wide text-neutral-500">
                Preview line
              </span>
              <input
                value={preheader}
                disabled={closed}
                onChange={(event) => change(() => setPreheader(event.target.value))}
                placeholder="The grey line beside the subject"
                className={`${field} disabled:opacity-60`}
              />
            </label>
          </div>

          {!closed && written && (
            <section className="rounded-2xl border border-white/10 bg-[#0f1420] p-1.5">
              <Suspense
                fallback={
                  <div className="flex h-[520px] items-center justify-center font-ui text-sm text-neutral-400">
                    Getting the editor ready…
                  </div>
                }
              >
                <RichText
                  value={blocks[0]?.html || ""}
                  onChange={setWriting}
                  folder="newsletter"
                  height={520}
                  placeholder="Write to them the way you would write to one person."
                />
              </Suspense>
            </section>
          )}

          {/* A letter from before this editor existed. It keeps the controls
              it was made with rather than being thrown away. */}
          {!closed && !written && (
            <>
              <ul className="flex flex-col gap-3">
                {blocks.map((block, index) => (
                  <BlockCard
                    key={block._key}
                    block={block}
                    index={index}
                    count={blocks.length}
                    onChange={(next) => setBlock(block, next)}
                    onMove={moveBlock}
                    onRemove={removeBlock}
                    onTrouble={onTrouble}
                  />
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/15 p-3">
                <span className="px-2 font-ui text-sm text-neutral-500">Add</span>
                {KINDS.map((kind) => (
                  <button
                    key={kind.type}
                    type="button"
                    onClick={() => addBlock(kind.type)}
                    className="rounded-full bg-white/5 px-4 py-2 font-ui text-sm text-neutral-300 hover:bg-white/10 hover:text-white"
                  >
                    {kind.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <SendBar issue={issue} saved={saved} onChanged={setIssue} onTrouble={onTrouble} />
        </div>

        {/* What it will look like */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 font-ui text-xs font-bold uppercase tracking-wide text-neutral-500">
            What arrives
          </p>
          <iframe
            title="What this letter will look like"
            srcDoc={preview}
            className="h-[560px] w-full rounded-2xl border border-white/10 bg-[#0e1320]"
          />
        </div>
      </div>
    </section>
  );
}

export default function NewsletterLetters({ onTrouble }) {
  const [issues, setIssues] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [openId, setOpenId] = useState("");
  const [confirming, setConfirming] = useState("");

  const refresh = useCallback(() => {
    loadIssues()
      .then(setIssues)
      .catch((error) => onTrouble(error.message));
    loadTemplates()
      .then(setTemplates)
      .catch(() => {});
  }, [onTrouble]);

  useEffect(refresh, [refresh]);

  const begin = async (fromTemplate) => {
    try {
      const issue = fromTemplate ? await startFromTemplate(fromTemplate) : await startIssue();
      setOpenId(issue.id);
    } catch (error) {
      onTrouble(error.message);
    }
  };

  const dropTemplate = async (id) => {
    try {
      await forgetTemplate(id);
      refresh();
    } catch (error) {
      onTrouble(error.message);
    }
  };

  const discard = async (id) => {
    try {
      await discardIssue(id);
      setConfirming("");
      refresh();
    } catch (error) {
      onTrouble(error.message);
    }
  };

  const being = (issues || []).filter((issue) => issue.status !== "sent");
  const gone = (issues || []).filter((issue) => issue.status === "sent");

  if (openId) {
    return (
      <Editor
        id={openId}
        onTrouble={onTrouble}
        onClose={() => {
          setOpenId("");
          refresh();
        }}
      />
    );
  }

  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#222b3c] p-5">
        <div>
          <p className="font-ui text-base font-bold text-white">Letters</p>
          <p className="mt-1 font-ui text-sm text-neutral-400">
            Write now, send when it is ready. Nothing leaves until you say so.
          </p>
        </div>
        <button
          type="button"
          onClick={() => begin()}
          className="rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-6 py-2.5 font-ui text-sm font-bold text-white hover:opacity-90"
        >
          Start a letter
        </button>
      </div>

      {/* The shapes you have kept, each one a letter already built. */}
      {templates.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-white/15 p-3">
          <span className="px-2 font-ui text-sm text-neutral-500">Or start from</span>
          {templates.map((template) => (
            <span key={template.id} className="flex items-center overflow-hidden rounded-full bg-white/5">
              <button
                type="button"
                onClick={() => begin(template.id)}
                className="py-2 pl-4 pr-3 font-ui text-sm text-neutral-200 hover:bg-white/10 hover:text-white"
              >
                {template.name}
              </button>
              <button
                type="button"
                onClick={() => dropTemplate(template.id)}
                aria-label={`Forget the ${template.name} template`}
                className="py-2 pr-3 font-ui text-sm text-neutral-600 hover:text-[#ffb4c4]"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {!issues && <Skeleton className="mt-4 h-[180px] rounded-2xl" />}

      {issues?.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center font-ui text-base text-neutral-400">
          No letters yet.
        </p>
      )}

      {/* Being written, and then what has gone out. The two are different
          things: one is work, the other is a record. */}
      {being.length > 0 && (
        <>
          <h3 className="mt-6 font-ui text-sm font-bold uppercase tracking-wide text-neutral-500">
            Being written
          </h3>
          <ul className="mt-3 flex flex-col gap-3">
            {being.map((issue) => (
              <li
                key={issue.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-[#222b3c] p-4"
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setOpenId(issue.id)}
                    className="block max-w-full truncate text-left font-ui text-base font-bold text-white hover:text-[#6b8ff5]"
                  >
                    {issue.subject || "Untitled letter"}
                  </button>
                  <p className="mt-1 font-ui text-sm text-neutral-400">
                    {issue.status === "sending"
                      ? `Going out now · ${issue.sentCount} sent`
                      : `Draft · last touched ${day(issue.updatedAt)}`}
                    {issue.author ? ` · ${issue.author}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(issue.id)}
                    className="rounded-full border border-white/25 px-4 py-2 font-ui text-sm text-white hover:bg-white/10"
                  >
                    Open
                  </button>

                  {issue.status === "draft" &&
                    (confirming === issue.id ? (
                      <button
                        type="button"
                        onClick={() => discard(issue.id)}
                        className="rounded-full bg-[#c2185b] px-4 py-2 font-ui text-sm font-bold text-white hover:opacity-90"
                      >
                        Throw it away?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(issue.id)}
                        className="rounded-full px-3 py-2 font-ui text-sm text-neutral-500 hover:text-[#ffb4c4]"
                      >
                        Discard
                      </button>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {gone.length > 0 && (
        <>
          <h3 className="mt-8 font-ui text-sm font-bold uppercase tracking-wide text-neutral-500">
            Already sent
          </h3>
          <ol className="mt-3 flex flex-col gap-3">
            {gone.map((issue) => (
              <li
                key={issue.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-[#1e2637] p-4"
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setOpenId(issue.id)}
                    className="block max-w-full truncate text-left font-ui text-base font-bold text-white hover:text-[#6b8ff5]"
                  >
                    {issue.subject || "Untitled letter"}
                  </button>
                  <p className="mt-1 font-ui text-sm text-neutral-400">
                    {day(issue.sentAt)} · reached {issue.sentCount}{" "}
                    {issue.sentCount === 1 ? "person" : "people"}
                    {issue.author ? ` · ${issue.author}` : ""}
                  </p>
                </div>

                {issue.failedCount > 0 && (
                  <span className="shrink-0 rounded-full bg-[#3a2030] px-3 py-1 font-ui text-xs font-bold text-[#ffb4c4]">
                    {issue.failedCount} did not arrive
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setOpenId(issue.id)}
                  className="shrink-0 rounded-full border border-white/25 px-4 py-2 font-ui text-sm text-white hover:bg-white/10"
                >
                  Read it
                </button>
              </li>
            ))}
          </ol>
        </>
      )}

    </section>
  );
}
