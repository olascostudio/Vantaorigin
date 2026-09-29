import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "./Loading.jsx";
import {
  discardIssue,
  loadIssue,
  loadIssues,
  previewIssue,
  saveIssue,
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
];

const emptyBlock = (type) => {
  if (type === "image") return { type, url: "", alt: "", href: "" };
  if (type === "button") return { type, text: "", href: "" };
  if (type === "divider") return { type };
  return { type, text: "" };
};

const day = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "—";

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
    </li>
  );
}

function Editor({ id, onClose, onTrouble }) {
  const [issue, setIssue] = useState(null);
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [saved, setSaved] = useState("Saved");
  const [preview, setPreview] = useState("");

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
        setBlocks(next.blocks || []);
      })
      .catch((error) => !cancelled && onTrouble(error.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const writing = useMemo(() => ({ subject, preheader, blocks }), [subject, preheader, blocks]);
  const sent = issue && issue.status !== "draft";

  // Saving follows typing rather than a button: a letter half written and then
  // abandoned should still be there tomorrow.
  useEffect(() => {
    if (!issue || sent || !touched.current) return undefined;
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
  }, [writing, issue, sent]);

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

  const setBlock = (index, next) =>
    change(() => setBlocks((current) => current.map((block, i) => (i === index ? next : block))));

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

  const addBlock = (type) => change(() => setBlocks((current) => [...current, emptyBlock(type)]));

  if (!issue) return <Skeleton className="mt-5 h-[420px] rounded-2xl" />;

  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/25 px-4 py-2 font-ui text-sm text-white hover:bg-white/10"
        >
          ← All letters
        </button>

        <p className="font-ui text-sm text-neutral-400">
          {sent ? `Sent ${day(issue.sentAt)} to ${issue.sentCount} people` : saved}
        </p>
      </div>

      {sent && (
        <p className="mt-4 rounded-xl bg-[#2b3547] px-5 py-3 font-ui text-sm text-neutral-300">
          This one has gone out, so it is kept as it was sent.
        </p>
      )}

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
                disabled={sent}
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
                disabled={sent}
                onChange={(event) => change(() => setPreheader(event.target.value))}
                placeholder="The grey line beside the subject"
                className={`${field} disabled:opacity-60`}
              />
            </label>
          </div>

          {!sent && (
            <ul className="flex flex-col gap-3">
              {blocks.map((block, index) => (
                <BlockCard
                  key={index}
                  block={block}
                  index={index}
                  count={blocks.length}
                  onChange={(next) => setBlock(index, next)}
                  onMove={moveBlock}
                  onRemove={removeBlock}
                  onTrouble={onTrouble}
                />
              ))}
            </ul>
          )}

          {!sent && (
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
          )}
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
  const [openId, setOpenId] = useState("");
  const [confirming, setConfirming] = useState("");

  const refresh = useCallback(() => {
    loadIssues()
      .then(setIssues)
      .catch((error) => onTrouble(error.message));
  }, [onTrouble]);

  useEffect(refresh, [refresh]);

  const begin = async () => {
    try {
      const issue = await startIssue();
      setOpenId(issue.id);
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
          onClick={begin}
          className="rounded-full bg-gradient-to-r from-[#c2185b] to-[#a855f7] px-6 py-2.5 font-ui text-sm font-bold text-white hover:opacity-90"
        >
          Start a letter
        </button>
      </div>

      {!issues && <Skeleton className="mt-4 h-[180px] rounded-2xl" />}

      {issues?.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center font-ui text-base text-neutral-400">
          No letters yet.
        </p>
      )}

      {issues && issues.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {issues.map((issue) => (
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
                  {issue.status === "sent"
                    ? `Sent ${day(issue.sentAt)} to ${issue.sentCount} people`
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
                  {issue.status === "sent" ? "Read it" : "Open"}
                </button>

                {issue.status !== "sent" &&
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
      )}
    </section>
  );
}
