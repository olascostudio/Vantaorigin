// A creator's books, built to the mockup canvas.
//
// One card per book: cover, what it is, what it is waiting for, what it
// sells for, and the one action that moves it forward. The status line is
// a sentence rather than a word, because "draft" tells nobody what to do
// and "Needs a price before it can sell" does.
//
// Adding a book is its own screen in the design. It is not built yet, so
// the form opens here in the same visual language rather than sending
// somebody to a route that does not exist.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePrivatePage } from "../data/pageMeta";
import { Skeleton } from "../components/Loading.jsx";
import { createBook, listBooks, loadFormats, money } from "../data/books";
import StudioShell, { BTN, BTN_QUIET, CARD, FIELD, LABEL } from "../components/StudioShell.jsx";

// A tick, a warning or a down arrow, matching the three states a book can
// be in. Colour alone never carries it: each has its own glyph and its own
// sentence.
function StatusMark({ tone }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  if (tone === "good")
    return (
      <svg {...common}>
        <path d="m4 12 5 5L20 7" />
      </svg>
    );
  if (tone === "warn")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16.5v.01" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M4 19h16" />
    </svg>
  );
}

// What stands between this book and a reader, said as the next thing to do.
function standing(book) {
  if (book.status === "on_sale") {
    const where = book.prices.length;
    return {
      tone: "good",
      say: `On sale in ${where} ${where === 1 ? "country" : "countries"}`,
      cta: null,
    };
  }
  if (!book.prices.length) {
    return { tone: "warn", say: "Needs a price before it can sell", cta: "Set a price" };
  }
  if (!book.rightsAccepted) {
    return { tone: "warn", say: "Needs the rights warranty signed", cta: "Sign it" };
  }
  return { tone: "draft", say: "Priced and signed, ready to go on sale", cta: "Put it on sale" };
}

// formats defaults to empty: a missing catalogue should cost the card its
// readable format name, not take the whole page down with it.
function BookCard({ book, formats = [] }) {
  const state = standing(book);
  // The API returns the slug, which is a key and not a thing to read. The
  // catalogue is already loaded for the add form, so the readable name is
  // one lookup away: "6 x 9in B&W paperback", not "pb-6x9-bw".
  const format = formats.find((row) => row.slug === book.formatSlug);
  const tone =
    state.tone === "good"
      ? "text-studio-good"
      : state.tone === "warn"
        ? "text-studio-warn"
        : "text-studio-muted";

  return (
    <article className={`${CARD} flex flex-wrap items-center gap-[18px] p-[18px]`}>
      <div
        className="h-20 w-[58px] shrink-0 rounded-md border border-studio-line bg-studio-shelf"
        aria-hidden="true"
      />

      <div className="min-w-0 flex-[999_1_240px]">
        <h2 className="font-ui text-base font-semibold text-studio-ink">{book.title}</h2>
        <p className="mt-[5px] font-ui text-[13px] text-studio-muted">
          {format?.name ?? book.formatSlug} &middot; {book.pageCount} pages
        </p>
        <p className={`mt-2 flex items-center gap-1.5 font-ui text-[13px] font-medium ${tone}`}>
          <StatusMark tone={state.tone} />
          {state.say}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-ui text-xs text-studio-muted">Retail</p>
        {book.prices.length ? (
          <p className="mt-1 font-ui text-lg font-semibold tabular-nums text-studio-ink">
            {money(book.prices[0].retailMinor, book.prices[0].currency)}
          </p>
        ) : (
          <p className="mt-1 font-ui text-lg font-semibold text-studio-muted">Not set</p>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <Link to={`/studio/books/${book.publicId}`} className={state.cta ? BTN : BTN_QUIET}>
          {state.cta ?? "Open"}
        </Link>
      </div>
    </article>
  );
}

function NewBook({ formats, onMade, onClose }) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [form, setForm] = useState({ title: "", formatSlug: "", pageCount: "" });

  useEffect(() => {
    if (formats.length && !form.formatSlug) setForm((f) => ({ ...f, formatSlug: formats[0].slug }));
  }, [formats, form.formatSlug]);

  const chosen = formats.find((format) => format.slug === form.formatSlug);

  const send = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem("");
    try {
      const made = await createBook({
        title: form.title,
        formatSlug: form.formatSlug,
        pageCount: Number(form.pageCount),
      });
      onMade(made);
      onClose();
    } catch (error) {
      // The server knows the real rule: a comic stops at 64 pages, a saddle
      // stitched book folds in fours. Its sentence beats anything guessed
      // here, so it is shown as written.
      setProblem(error.message || "That did not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={send} className={`${CARD} p-5`}>
      <h2 className="font-ui text-base font-semibold text-studio-ink">A new book</h2>
      <p className="mt-1 font-ui text-[13px] text-studio-muted">
        A title, a format and a page count. Everything else can wait.
      </p>

      <div className="mt-5 flex flex-wrap gap-4">
        <div className="min-w-0 flex-[2_1_240px]">
          <label className={LABEL} htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className={FIELD}
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </div>
        <div className="min-w-0 flex-[2_1_200px]">
          <label className={LABEL} htmlFor="format">
            Format
          </label>
          <select
            id="format"
            className={FIELD}
            value={form.formatSlug}
            onChange={(event) => setForm({ ...form, formatSlug: event.target.value })}
          >
            {formats.map((format) => (
              <option key={format.slug} value={format.slug}>
                {format.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-[1_1_120px]">
          <label className={LABEL} htmlFor="pages">
            Pages
          </label>
          <input
            id="pages"
            className={FIELD}
            type="number"
            required
            min="1"
            value={form.pageCount}
            onChange={(event) => setForm({ ...form, pageCount: event.target.value })}
          />
        </div>
      </div>

      {chosen && (
        <p className="mt-3 font-ui text-xs text-studio-muted">
          {chosen.name} takes {chosen.minPages} to {chosen.maxPages} pages
          {chosen.binding === "saddle" && ", in multiples of four, because it folds down the middle"}
          .
        </p>
      )}

      {problem && (
        <p
          role="alert"
          className="mt-4 rounded-[10px] border border-studio-warn/30 bg-[#fdf3e3] px-4 py-3 font-ui text-sm text-studio-warn"
        >
          {problem}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={BTN}>
          {busy ? "Saving..." : "Make it"}
        </button>
        <button type="button" onClick={onClose} className={BTN_QUIET}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function StudioBooks() {
  const [books, setBooks] = useState(null);
  const [formats, setFormats] = useState([]);
  const [problem, setProblem] = useState("");
  const [adding, setAdding] = useState(false);

  usePrivatePage();

  useEffect(() => {
    let cancelled = false;
    Promise.all([listBooks(), loadFormats()])
      .then(([list, shapes]) => {
        if (cancelled) return;
        setBooks(list.books);
        setFormats(shapes.formats);
      })
      .catch((error) => !cancelled && setProblem(error.message || "We could not load your books."));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StudioShell
      title="Your books"
      lead="Everything you have listed, and where each one stands."
      action={
        !adding && (
          <button type="button" onClick={() => setAdding(true)} className={BTN}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add a book
          </button>
        )
      }
    >
      {problem && (
        <p
          role="alert"
          className="mt-6 rounded-[10px] border border-studio-warn/30 bg-[#fdf3e3] px-4 py-3 font-ui text-sm text-studio-warn"
        >
          {problem}
        </p>
      )}

      {adding && (
        <div className="mt-[26px]">
          <NewBook
            formats={formats}
            onMade={(made) => setBooks((current) => [made, ...(current ?? [])])}
            onClose={() => setAdding(false)}
          />
        </div>
      )}

      {books === null ? (
        <div className="mt-[26px] flex flex-col gap-3.5">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : books.length === 0 && !adding ? (
        <div
          className={`${CARD} mt-[26px] border-dashed px-6 py-14 text-center`}
        >
          <p className="font-ui text-base text-studio-body">Nothing here yet.</p>
          <p className="mx-auto mt-1.5 max-w-[380px] font-ui text-sm text-studio-muted">
            Add a book and we will work out what it costs to print and deliver, and what you would
            keep at any price.
          </p>
          <button type="button" onClick={() => setAdding(true)} className={`${BTN} mt-5`}>
            Add your first book
          </button>
        </div>
      ) : (
        <section aria-label="Books" className="mt-[26px] flex flex-col gap-3.5">
          {books.map((book) => (
            <BookCard key={book.publicId} book={book} formats={formats} />
          ))}
        </section>
      )}
    </StudioShell>
  );
}
