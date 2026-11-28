// Regional pricing, built to the mockup canvas.
//
// One row per country: what printing costs, what delivery costs, the fees,
// the floor those three make, what the creator charges, and what they keep.
// The whole argument for the screen is that those six numbers sit on one
// line, so a price is set against its costs rather than against a hunch.
//
// Every figure comes from the server's own pricing engine, re-asked on each
// keystroke. None of it is recomputed here: a floor worked out in the
// browser is a floor that can disagree with the checkout, and a price that
// disagrees with the checkout is worse than no price at all.
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePrivatePage } from "../data/pageMeta";
import { Skeleton } from "../components/Loading.jsx";
import { fromMinor, listBooks, loadBook, money, priceBook, quoteBook, toMinor } from "../data/books";
import StudioShell, { BTN, CARD, FIELD } from "../components/StudioShell.jsx";

const TH = "border-b border-studio-line px-4 py-[11px] text-left font-ui text-xs font-semibold text-studio-muted";
const TD = "border-b border-studio-line px-4 py-[15px] font-ui text-sm text-studio-body";
const NUM = "text-right tabular-nums";

// A country we cannot print or deliver to yet. The design gives it a row of
// its own rather than hiding it: a creator should see that Ghana exists and
// is waiting, not wonder why it is missing.
function ClosedRow({ place }) {
  return (
    <tr>
      <td className={`${TD} border-b-0`}>
        <span className="font-medium text-studio-muted">{place.name ?? place.countryCode}</span>
        <span className="block font-ui text-xs text-studio-muted">No printer yet</span>
      </td>
      <td className={`${TD} border-b-0 text-studio-muted`} colSpan={6}>
        {place.unavailable ?? "Readers here join a waiting list instead of ordering."}
      </td>
    </tr>
  );
}

function PriceRow({ book, place, onPriced }) {
  const saved = book.prices.find((price) => price.countryCode === place.countryCode);
  const [typed, setTyped] = useState(() => fromMinor(saved?.retailMinor));
  const [tried, setTried] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [said, setSaid] = useState("");

  // What this price would mean, asked of the engine rather than guessed.
  const ask = async (value) => {
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
          ? "Saved."
          : `Saved, but not sellable: the ${(result.waitingOn ?? []).join(" and the ")} is still a guess.`
      );
      onPriced();
    } catch (error) {
      setProblem(error.message || "That did not save.");
    } finally {
      setBusy(false);
    }
  };

  // A saved price has to be re-asked on arrival. The table's own quote is
  // fetched with no price at all, so its fee and creator columns come back
  // as zero, and a row that shows a saved price next to "you keep nothing"
  // is worse than one that shows nothing at all.
  useEffect(() => {
    if (saved && !place.unavailable) ask(fromMinor(saved.retailMinor));
    // Once per book and country; ask() is recreated every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.publicId, place.countryCode]);

  if (place.unavailable) return <ClosedRow place={place} />;

  const below = tried?.belowFloor || tried?.losesMoney;
  const keeps = tried?.creatorMinor ?? null;
  const fees = (tried ?? place).gatewayFeeMinor + (tried ?? place).platformFeeMinor;

  return (
    <>
      <tr>
        <td className={TD}>
          <span className="font-medium text-studio-ink">{place.name ?? place.countryCode}</span>
          <span className="block font-ui text-xs text-studio-muted">
            {place.currency}
            {place.estDaysMin ? ` · ${place.estDaysMin} to ${place.estDaysMax} days` : ""}
          </span>
        </td>
        <td className={`${TD} ${NUM}`}>{money(place.printingMinor, place.currency)}</td>
        <td className={`${TD} ${NUM}`}>{money(place.deliveryMinor, place.currency)}</td>
        <td className={`${TD} ${NUM}`}>{money(fees, place.currency)}</td>
        <td className={`${TD} ${NUM} font-semibold text-studio-ink`}>
          {money(place.floorMinor, place.currency)}
        </td>
        <td className={`${TD} ${NUM}`}>
          <label className="sr-only" htmlFor={`price-${place.countryCode}`}>
            Your price for {place.name ?? place.countryCode}
          </label>
          <input
            id={`price-${place.countryCode}`}
            className={`${FIELD} w-[118px] text-right tabular-nums ${
              below ? "border-[#b91c1c] outline outline-2 outline-[#b91c1c] outline-offset-[-1px]" : ""
            }`}
            type="text"
            inputMode="decimal"
            value={typed}
            onChange={(event) => ask(event.target.value)}
            onBlur={() => typed && save()}
          />
        </td>
        <td className={`${TD} ${NUM} font-semibold ${below ? "text-studio-muted" : "text-studio-good"}`}>
          {below || keeps == null ? "—" : money(keeps, place.currency)}
        </td>
      </tr>

      {(below || problem || said) && (
        <tr>
          <td colSpan={7} className="border-b border-studio-line px-4 pb-[15px] pt-0">
            {below && (
              <p role="alert" className="flex items-center gap-2 font-ui text-[13px] font-medium text-[#b91c1c]">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5" />
                  <path d="M12 16.5v.01" />
                </svg>
                {money(toMinor(typed), place.currency)} is below the{" "}
                {money(place.floorMinor, place.currency)} floor. At this price every sale loses
                money, so it cannot be saved.
              </p>
            )}
            {problem && !below && (
              <p role="alert" className="font-ui text-[13px] font-medium text-[#b91c1c]">
                {problem}
              </p>
            )}
            {said && !below && !problem && (
              <p className="font-ui text-[13px] text-studio-good">{said}</p>
            )}
            {busy && <p className="font-ui text-[13px] text-studio-muted">Saving...</p>}
          </td>
        </tr>
      )}
    </>
  );
}

export default function StudioPricing() {
  const { publicId } = useParams();
  const [books, setBooks] = useState(null);
  const [chosen, setChosen] = useState(publicId ?? null);
  const [book, setBook] = useState(null);
  const [quote, setQuote] = useState(null);
  const [problem, setProblem] = useState("");

  usePrivatePage();

  useEffect(() => {
    let cancelled = false;
    listBooks()
      .then((list) => {
        if (cancelled) return;
        setBooks(list.books);
        if (!chosen && list.books.length) setChosen(list.books[0].publicId);
      })
      .catch((error) => !cancelled && setProblem(error.message || "We could not load your books."));
    return () => {
      cancelled = true;
    };
    // Only on mount: picking a book afterwards must not refetch the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async (id) => {
    const [one, prices] = await Promise.all([loadBook(id), quoteBook(id)]);
    setBook(one);
    setQuote(prices);
  }, []);

  useEffect(() => {
    if (!chosen) return;
    let cancelled = false;
    load(chosen).catch((error) => !cancelled && setProblem(error.message || "We could not load it."));
    return () => {
      cancelled = true;
    };
  }, [chosen, load]);

  const guessed = quote?.countries?.some((place) => (place.placeholders ?? []).length);

  return (
    <StudioShell
      title="Regional pricing"
      lead={
        book
          ? `${book.title} · ${book.pageCount} pages`
          : "What a book costs in each country, and what you would keep."
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

      {books && books.length > 1 && (
        <div className="mt-[22px] flex flex-wrap items-center gap-3">
          <label className="font-ui text-sm font-semibold text-studio-ink" htmlFor="which">
            Book
          </label>
          <select
            id="which"
            className={`${FIELD} w-auto min-w-[260px]`}
            value={chosen ?? ""}
            onChange={(event) => setChosen(event.target.value)}
          >
            {books.map((row) => (
              <option key={row.publicId} value={row.publicId}>
                {row.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {books && books.length === 0 && (
        <div className={`${CARD} mt-[26px] border-dashed px-6 py-14 text-center`}>
          <p className="font-ui text-base text-studio-body">No books to price yet.</p>
          <Link to="/studio/books" className={`${BTN} mt-5`}>
            Add a book first
          </Link>
        </div>
      )}

      {/* The warning the mockup puts above the table, shown only when it is
          true rather than always: a standing banner stops being read. */}
      {guessed && (
        <div
          role="note"
          className="mt-[22px] flex items-start gap-3 rounded-[10px] border border-[#e3cba8] border-l-4 border-l-studio-warn bg-[#fdf6ec] px-4 py-3.5"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#92400e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-px shrink-0"
            aria-hidden="true"
          >
            <path d="M12 8v5" />
            <path d="M12 16.5v.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <p className="font-ui text-[13px] leading-relaxed text-[#6b4418]">
            <strong className="text-studio-warn">Some costs below are still a guess.</strong> No
            real printer quote exists for them, so the floor cannot be trusted and the book cannot
            go on sale in those countries however it is priced.
          </p>
        </div>
      )}

      {chosen && !quote ? (
        <Skeleton className="mt-5 h-64 w-full rounded-xl" />
      ) : quote ? (
        <section
          aria-label="Prices by country"
          className={`${CARD} mt-5 overflow-hidden`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Country
                  </th>
                  <th scope="col" className={`${TH} ${NUM}`}>
                    Printing
                  </th>
                  <th scope="col" className={`${TH} ${NUM}`}>
                    Delivery
                  </th>
                  <th scope="col" className={`${TH} ${NUM}`}>
                    Fees
                  </th>
                  <th scope="col" className={`${TH} ${NUM}`}>
                    Floor
                  </th>
                  <th scope="col" className={`${TH} ${NUM}`}>
                    Your price
                  </th>
                  <th scope="col" className={`${TH} ${NUM}`}>
                    You keep
                  </th>
                </tr>
              </thead>
              <tbody>
                {quote.countries.map((place) => (
                  <PriceRow
                    key={place.countryCode}
                    book={book}
                    place={place}
                    onPriced={() => load(chosen)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {quote && (
        <p className="mt-5 max-w-[640px] font-ui text-[13px] leading-relaxed text-studio-muted">
          A price saves when you leave the field. The floor is printing, delivery, the card fee and
          the platform fee added together. Every figure is worked out on our side and asked again
          at checkout, so what you see here and what a reader is charged cannot drift apart.
        </p>
      )}
    </StudioShell>
  );
}
