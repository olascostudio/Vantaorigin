// A creator's books.
//
// The one part of Distribution a creator was expected to use and the only
// one with no screen: a book could be made with curl and in no other way.
//
// The list says what each book is waiting for, in the order it is waiting,
// because "draft" on its own tells nobody what to do next. A book needs a
// price that covers its costs and a signed warranty before it can be sold,
// and either of those missing is a sentence rather than a status.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePrivatePage } from "../data/pageMeta";
import { Skeleton } from "../components/Loading.jsx";
import { createBook, listBooks, loadFormats, money } from "../data/books";
import logoMark from "../assets/landing/hero/logo-mark.svg";

const CARD = "rounded-2xl border border-white/10 bg-[#222b3c] p-5 sm:p-6";
const FIELD =
  "w-full box-border min-h-[44px] rounded-xl border border-white/20 bg-[#1b2233] px-4 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#a855f7]";
const LABEL = "mb-1.5 block font-ui text-sm font-bold text-white";

// What is between this book and being sold, said as a thing to do.
function waitingOn(book) {
  if (!book.prices.length) return "No price yet";
  if (!book.rightsAccepted) return "Rights warranty not signed";
  if (book.status === "draft") return "Ready to publish";
  return null;
}

function BookRow({ book }) {
  const todo = waitingOn(book);

  return (
    <Link
      to={`/studio/books/${book.publicId}`}
      className="flex flex-wrap items-center gap-4 border-t border-white/10 py-4 transition-colors first:border-t-0 hover:bg-white/[0.03]"
    >
      <div className="min-w-0 flex-1">
        <p className="font-ui text-base font-bold text-white">{book.title}</p>
        <p className="mt-0.5 font-ui text-sm text-neutral-400">
          {book.formatSlug} · {book.pageCount} pages
        </p>
      </div>

      {book.prices.length > 0 && (
        <span className="font-ui text-sm tabular-nums text-neutral-300">
          {book.prices.map((price) => money(price.retailMinor, price.currency)).join(" · ")}
        </span>
      )}

      <span
        className={`shrink-0 rounded-full px-3 py-1 font-ui text-xs font-bold ${
          todo === "Ready to publish"
            ? "bg-[#1d4030] text-[#5fdc8a]"
            : todo
              ? "bg-[#3a3320] text-[#f5af32]"
              : "bg-[#1d4030] text-[#5fdc8a]"
        }`}
      >
        {todo ?? "On sale"}
      </span>
    </Link>
  );
}

function NewBook({ formats, onMade }) {
  const [open, setOpen] = useState(false);
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
      setForm({ title: "", formatSlug: formats[0]?.slug ?? "", pageCount: "" });
      setOpen(false);
      onMade(made);
    } catch (error) {
      // The server knows the real rule: a comic stops at 64 pages, a saddle
      // stitched book folds in fours. Its sentence is better than anything
      // guessed here, so it is shown as written.
      setProblem(error.message || "That did not save.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[48px] rounded-full bg-[#a855f7] px-7 font-ui text-base font-bold text-white transition-opacity hover:opacity-90"
      >
        Add a book
      </button>
    );
  }

  return (
    <form onSubmit={send} className={CARD}>
      <h2 className="font-ui text-lg font-bold text-white">A new book</h2>
      <p className="mt-1 font-ui text-sm text-neutral-400">
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

      {/* The rule, before they break it rather than after. */}
      {chosen && (
        <p className="mt-3 font-ui text-xs text-neutral-500">
          {chosen.name} takes {chosen.minPages} to {chosen.maxPages} pages
          {chosen.binding === "saddle" && ", in multiples of four, because it folds down the middle"}
          .
        </p>
      )}

      {problem && (
        <p role="alert" className="mt-4 font-ui text-sm text-[#ffb4c4]">
          {problem}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="min-h-[44px] rounded-full bg-[#a855f7] px-6 font-ui text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Saving..." : "Make it"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setProblem("");
          }}
          className="font-ui text-sm text-neutral-400 hover:text-white"
        >
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10 px-5 py-4 sm:px-8">
        <Link to="/studio" className="flex items-center gap-2.5">
          <img src={logoMark} alt="" className="h-7 w-auto" aria-hidden="true" />
          <span className="font-ui text-base font-bold text-white">
            VantaOrigin <span className="text-neutral-400">Creator Studio</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-[820px] px-5 pb-24 pt-10 sm:px-8">
        <h1 className="font-ui text-3xl font-bold text-white sm:text-[40px]">Your books</h1>
        <p className="mt-3 font-ui text-base leading-relaxed text-neutral-300">
          Printed copies, made to order. A book needs a price that covers what it costs and a
          signed warranty that the work is yours before anybody can buy it.
        </p>

        {problem && (
          <p role="alert" className="mt-6 font-ui text-sm text-[#ffb4c4]">
            {problem}
          </p>
        )}

        {books === null ? (
          <div className="mt-8 flex flex-col gap-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {books.length > 0 && (
              <section className={`${CARD} mt-8`} aria-label="Your books">
                {books.map((book) => (
                  <BookRow key={book.publicId} book={book} />
                ))}
              </section>
            )}

            {books.length === 0 && (
              <p className="mt-8 rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center font-ui text-base text-neutral-400">
                No books yet.
              </p>
            )}

            <div className="mt-6">
              <NewBook
                formats={formats}
                onMade={(made) => setBooks((current) => [made, ...current])}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
