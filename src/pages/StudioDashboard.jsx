// The Creator Studio dashboard, built to the mockup canvas.
//
// Four figures, the last five orders, and what is left to do before a
// reader can buy. The mockup's checklist was drawn with invented items; the
// one here is computed, so a creator is never told to do something they
// have done, or told everything is ready when it is not.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePrivatePage } from "../data/pageMeta";
import { Skeleton } from "../components/Loading.jsx";
import { listBooks, money } from "../data/books";
import { loadStudioSummary } from "../data/sales";
import { Held, OrderStatus } from "../components/studio/OrderBits.jsx";
import StudioShell, { BTN, CARD } from "../components/StudioShell.jsx";

const TH = "border-b border-studio-line px-5 py-2.5 text-left font-ui text-xs font-semibold text-studio-muted";
const TD = "border-b border-studio-line px-5 py-[13px] font-ui text-sm text-studio-body";

function Figure({ label, value, note }) {
  return (
    <div className={`${CARD} p-[18px]`}>
      <p className="font-ui text-xs font-semibold text-studio-muted">{label}</p>
      <div className="mt-2.5 font-ui text-[30px] font-semibold leading-none text-studio-ink">
        {value}
      </div>
      {note && <p className="mt-1.5 font-ui text-xs text-studio-muted">{note}</p>}
    </div>
  );
}

function Task({ done, children, to, cta }) {
  return (
    <div className="flex items-start gap-2.5 border-t border-studio-line py-3">
      {done ? (
        <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-studio-good">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m4 12 5 5L20 7" />
          </svg>
        </span>
      ) : (
        <span className="mt-px size-5 shrink-0 rounded-full border-[1.5px] border-studio-edge" />
      )}
      <div className="min-w-0">
        <p
          className={`font-ui text-sm ${
            done ? "text-studio-muted line-through" : "font-medium text-studio-ink"
          }`}
        >
          {children}
        </p>
        {!done && to && (
          <Link
            to={to}
            className="mt-1 inline-block font-ui text-[13px] font-medium text-studio-brand hover:text-studio-brand-dark"
          >
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function StudioDashboard() {
  const [summary, setSummary] = useState(null);
  const [books, setBooks] = useState(null);
  const [problem, setProblem] = useState("");

  usePrivatePage();

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadStudioSummary(), listBooks()])
      .then(([figures, list]) => {
        if (cancelled) return;
        setSummary(figures);
        setBooks(list.books);
      })
      .catch((error) => !cancelled && setProblem(error.message || "We could not load your studio."));
    return () => {
      cancelled = true;
    };
  }, []);

  const hasBook = Boolean(books?.length);
  const hasPrice = Boolean(books?.some((book) => book.prices.length));
  const onSale = Boolean(books?.some((book) => book.status === "on_sale"));

  return (
    <StudioShell
      title="Dashboard"
      lead="Your books, your orders, and what you are owed."
      action={
        <Link to="/studio/books" className={BTN}>
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
        </Link>
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

      {!summary ? (
        <div className="mt-[26px] grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-[104px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <section
            aria-label="Summary"
            className="mt-[26px] grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Figure
              label="Books published"
              value={summary.booksPublished}
              note={
                summary.booksTotal > summary.booksPublished
                  ? `of ${summary.booksTotal} you have made`
                  : null
              }
            />
            <Figure label="Orders this month" value={summary.ordersThisMonth} />
            <Figure label="Awaiting fulfilment" value={summary.awaitingFulfilment} />
            <Figure
              label="Owed to you"
              value={<Held byCurrency={summary.heldMinor} />}
              note="Held until each order completes"
            />
          </section>

          <div className="mt-[22px] flex flex-wrap items-start gap-5">
            <section
              aria-label="Recent orders"
              className={`${CARD} min-w-0 flex-[999_1_420px]`}
            >
              <div className="flex items-center justify-between gap-3 border-b border-studio-line px-5 py-4">
                <h2 className="font-ui text-base font-semibold text-studio-ink">Recent orders</h2>
                <Link
                  to="/studio/orders"
                  className="font-ui text-[13px] font-medium text-studio-brand hover:text-studio-brand-dark"
                >
                  All orders
                </Link>
              </div>

              {summary.recent.length === 0 ? (
                <p className="px-5 py-10 text-center font-ui text-sm text-studio-muted">
                  No orders yet. They appear here the moment somebody buys a printed copy.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th scope="col" className={TH}>
                          Order
                        </th>
                        <th scope="col" className={TH}>
                          Book
                        </th>
                        <th scope="col" className={TH}>
                          Status
                        </th>
                        <th scope="col" className={`${TH} text-right`}>
                          Your share
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recent.map((order) => (
                        <tr key={order.publicId}>
                          <td className={`${TD} tabular-nums`}>{order.publicId}</td>
                          <td className={`${TD} font-medium text-studio-ink`}>
                            {order.titles.join(", ")}
                          </td>
                          <td className={TD}>
                            <OrderStatus status={order.status} />
                          </td>
                          <td className={`${TD} text-right tabular-nums`}>
                            {money(order.yourShareMinor, order.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section aria-label="Set-up" className={`${CARD} min-w-0 flex-[1_1_300px] p-5`}>
              <h2 className="font-ui text-base font-semibold text-studio-ink">Finish setting up</h2>
              <p className="mb-4 mt-1.5 font-ui text-[13px] text-studio-muted">
                {onSale
                  ? "You are selling. Anything below is still worth doing."
                  : "What is left before a reader can buy."}
              </p>

              <Task done={hasBook} to="/studio/books" cta="Add one">
                Add a book
              </Task>
              <Task done={hasPrice} to="/studio/pricing" cta="Open pricing">
                Set a price for each country
              </Task>
              <Task done={onSale} to="/studio/books" cta="Open your books">
                Put it on sale
              </Task>
            </section>
          </div>
        </>
      )}
    </StudioShell>
  );
}
