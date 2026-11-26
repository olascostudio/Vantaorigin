// One book: what it costs, what it earns, and what it is waiting for.
//
// This is where the pricing engine stops being a thing in the API and
// becomes the answer to a creator's actual question, which is "what do I
// get". So the floor is not presented as a rule they are being held to but
// as the number underneath their own: here is what it costs to make and
// move, here is what the card company and we take, here is yours.
//
// Nothing is worked out in this browser. Every figure comes from the engine
// the checkout will use, so what a creator is promised and what they are
// paid cannot drift apart.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePrivatePage } from "../data/pageMeta";
import { Skeleton } from "../components/Loading.jsx";
import {
  acceptRights,
  deleteBook,
  fromMinor,
  loadBook,
  money,
  priceBook,
  quoteBook,
  saveBook,
  toMinor,
} from "../data/books";
import logoMark from "../assets/landing/hero/logo-mark.svg";

// Matches RIGHTS_WARRANTY_VERSION in api/src/routes/books.js. The server
// refuses a version it does not recognise, so a mismatch here is caught
// rather than silently recorded as agreement to the wrong words.
const RIGHTS_VERSION = "2026-11-24";

const CARD = "rounded-2xl border border-white/10 bg-[#222b3c] p-5 sm:p-6";
const FIELD =
  "w-full box-border min-h-[44px] rounded-xl border border-white/20 bg-[#1b2233] px-4 font-ui text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#a855f7]";

function Line({ label, value, strong, tint }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={`font-ui text-sm ${strong ? "font-bold text-white" : "text-neutral-400"}`}>
        {label}
      </span>
      <span
        className={`font-ui tabular-nums ${
          strong ? `text-base font-bold ${tint ?? "text-white"}` : "text-sm text-neutral-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// One country: what it costs, and what a price would leave.
function Country({ book, place, onPriced }) {
  const saved = book.prices.find((price) => price.countryCode === place.countryCode);
  const [typed, setTyped] = useState(() => fromMinor(saved?.retailMinor));
  const [tried, setTried] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [said, setSaid] = useState("");

  if (place.unavailable) {
    return (
      <div className="border-t border-white/10 py-5 first:border-t-0 first:pt-0">
        <h3 className="font-ui text-base font-bold text-white">{place.countryCode}</h3>
        <p className="mt-1.5 font-ui text-sm text-neutral-400">{place.unavailable}</p>
      </div>
    );
  }

  // What the typed price would mean, asked of the engine rather than
  // guessed. Only once they have typed a whole number of minor units.
  const askWhatItMeans = async (value) => {
    setTyped(value);
    setProblem("");
    setSaid("");
    const minor = toMinor(value);
    if (!minor || Number(minor) === 0) {
      setTried(null);
      return;
    }
    try {
      const answer = await quoteBook(book.publicId, minor);
      setTried(answer.countries.find((row) => row.countryCode === place.countryCode) ?? null);
    } catch {
      setTried(null);
    }
  };

  const save = async () => {
    const minor = toMinor(typed);
    if (!minor) {
      setProblem("Give a price in whole naira or pence.");
      return;
    }
    setBusy(true);
    setProblem("");
    setSaid("");
    try {
      const result = await priceBook(book.publicId, place.countryCode, minor);
      setSaid(
        result.sellable
          ? "Saved. This book can be sold here."
          : `Saved, but not on sale yet: the ${(result.waitingOn ?? []).join(" and the ")} is still a guess.`
      );
      onPriced();
    } catch (error) {
      setProblem(error.message || "That did not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-white/10 py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-ui text-base font-bold text-white">{place.countryCode}</h3>
        {saved && (
          <span className="font-ui text-sm text-neutral-400">
            Priced at {money(saved.retailMinor, saved.currency)}
          </span>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-[#1b2233] p-4">
        <Line label="Printing" value={money(place.printingMinor, place.currency)} />
        <Line label="Delivery, paid by the reader" value={money(place.deliveryMinor, place.currency)} />
        <div className="mt-1 border-t border-white/10 pt-1">
          <Line
            strong
            label="Lowest it can sell for"
            value={money(place.floorMinor, place.currency)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-[1_1_180px]">
          <label
            className="mb-1.5 block font-ui text-sm font-bold text-white"
            htmlFor={`price-${place.countryCode}`}
          >
            Your price
          </label>
          <input
            id={`price-${place.countryCode}`}
            className={FIELD}
            inputMode="decimal"
            placeholder={fromMinor(place.floorMinor)}
            value={typed}
            onChange={(event) => askWhatItMeans(event.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy || !toMinor(typed)}
          className="min-h-[44px] rounded-full bg-[#a855f7] px-6 font-ui text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Saving..." : saved ? "Change it" : "Set this price"}
        </button>
      </div>

      {/* What that price leaves, the moment it is typed. The point of the
          whole engine, put where the decision is made. */}
      {tried && typeof tried.creatorMinor === "number" && (
        <div className="mt-4 rounded-xl bg-[#1b2233] p-4">
          <Line label="Card fee" value={money(tried.gatewayFeeMinor, tried.currency)} />
          <Line label="Our cut" value={money(tried.platformFeeMinor, tried.currency)} />
          <div className="mt-1 border-t border-white/10 pt-1">
            <Line
              strong
              label="You keep"
              value={money(tried.creatorMinor, tried.currency)}
              tint={tried.creatorMinor > 0 ? "text-[#5fdc8a]" : "text-[#ffb4c4]"}
            />
          </div>
          {(tried.belowFloor || tried.losesMoney) && (
            <p className="mt-2 font-ui text-xs text-[#ffb4c4]">
              {tried.belowFloor
                ? "Below the floor: this does not cover what the book costs."
                : "Above the floor and still losing money, because a fee steps up at this price. Try a little more."}
            </p>
          )}
        </div>
      )}

      {said && (
        <p role="status" className="mt-3 font-ui text-sm text-[#5fdc8a]">
          {said}
        </p>
      )}
      {problem && (
        <p role="alert" className="mt-3 font-ui text-sm text-[#ffb4c4]">
          {problem}
        </p>
      )}
    </div>
  );
}

export default function StudioBook() {
  const { publicId } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [quote, setQuote] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  usePrivatePage();

  const refresh = async () => {
    const [one, prices] = await Promise.all([loadBook(publicId), quoteBook(publicId)]);
    setBook(one);
    setQuote(prices);
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadBook(publicId), quoteBook(publicId)])
      .then(([one, prices]) => {
        if (cancelled) return;
        setBook(one);
        setQuote(prices);
      })
      .catch((error) => !cancelled && setProblem(error.message || "We could not find that book."));
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  const sign = async () => {
    setBusy(true);
    setProblem("");
    try {
      setBook(await acceptRights(publicId, RIGHTS_VERSION));
    } catch (error) {
      setProblem(error.message || "That did not save.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setProblem("");
    try {
      await deleteBook(publicId);
      navigate("/studio/books");
    } catch (error) {
      setProblem(error.message || "That could not be deleted.");
      setBusy(false);
    }
  };

  if (problem && !book) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-[640px] px-5 py-20 text-center">
          <h1 className="font-ui text-2xl font-bold text-white">We could not find that book</h1>
          <p className="mt-3 font-ui text-base text-neutral-300">{problem}</p>
          <Link to="/studio/books" className="mt-6 inline-block font-ui text-base text-[#4ea1ff]">
            Back to your books
          </Link>
        </main>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-[820px] px-5 py-12">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/10 px-5 py-4 sm:px-8">
        <Link to="/studio/books" className="flex items-center gap-2.5">
          <img src={logoMark} alt="" className="h-7 w-auto" aria-hidden="true" />
          <span className="font-ui text-base font-bold text-white">
            VantaOrigin <span className="text-neutral-400">Creator Studio</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-[820px] px-5 pb-24 pt-10 sm:px-8">
        <Link to="/studio/books" className="font-ui text-sm text-neutral-400 hover:text-white">
          Your books
        </Link>
        <h1 className="mt-3 font-ui text-3xl font-bold text-white sm:text-[40px]">{book.title}</h1>
        <p className="mt-2 font-ui text-base text-neutral-400">
          {book.formatSlug} · {book.pageCount} pages · {book.status}
        </p>

        {/* What it costs and what it earns, per country. */}
        <section className={`${CARD} mt-8`} aria-label="What it costs and earns">
          <h2 className="font-ui text-xl font-bold text-white">What it earns</h2>
          <p className="mt-1.5 font-ui text-sm leading-relaxed text-neutral-400">
            Worked out by the same engine the checkout uses, so what you are shown here and what
            you are paid cannot disagree.
          </p>

          <div className="mt-5">
            {quote === null ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : quote.countries.length === 0 ? (
              <p className="font-ui text-sm text-neutral-400">
                No country is open for selling yet.
              </p>
            ) : (
              quote.countries.map((place) => (
                <Country
                  key={place.countryCode}
                  book={book}
                  place={place}
                  onPriced={() => refresh().catch(() => {})}
                />
              ))
            )}
          </div>
        </section>

        {/* The warranty. */}
        <section className={`${CARD} mt-6`} aria-label="Rights">
          <h2 className="font-ui text-xl font-bold text-white">Is this yours to sell?</h2>
          {book.rightsAccepted ? (
            <p className="mt-2 font-ui text-sm text-[#5fdc8a]">
              Signed, version {book.rightsWarrantyVersion}.
            </p>
          ) : (
            <>
              <p className="mt-2 font-ui text-base leading-relaxed text-neutral-300">
                Before this can be sold, you have to tell us the work is yours: that you made it or
                hold the rights to it, that selling printed copies is yours to allow, and that
                nothing in it belongs to somebody who has not agreed.
              </p>
              <p className="mt-3 font-ui text-sm text-neutral-400">
                We print what you send us. If that turns out not to be yours, it is you who sold
                it.
              </p>
              <button
                type="button"
                onClick={sign}
                disabled={busy}
                className="mt-5 min-h-[44px] rounded-full bg-[#a855f7] px-6 font-ui text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "Saving..." : "This work is mine to sell"}
              </button>
            </>
          )}
        </section>

        {problem && (
          <p role="alert" className="mt-6 font-ui text-sm text-[#ffb4c4]">
            {problem}
          </p>
        )}

        {book.status === "draft" && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="mt-10 font-ui text-sm text-neutral-500 hover:text-[#ffb4c4] disabled:opacity-40"
          >
            Delete this book
          </button>
        )}
      </main>
    </div>
  );
}
