// Buying a printed copy.
//
// The person here has no account and does not want one. They followed a link
// somebody shared, and every field between them and the book is a chance to
// lose them, so this asks for the four things a parcel needs and nothing
// else: who it is for, where it goes, how to reach them, how many.
//
// The total is never worked out in the browser. It comes from the same
// engine the order will be written against, so what somebody is shown and
// what they are charged cannot drift apart. That means a round trip on every
// change of country or quantity, which is the right trade: a wrong number
// here is a refund and an apology.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import { Art, Skeleton } from "../components/Loading.jsx";
import { usePageMeta } from "../data/pageMeta";
import { loadBook, money, placeOrder, quoteOrder } from "../data/checkout";

const FIELD =
  "w-full box-border min-h-[48px] rounded-xl border border-white/20 bg-[#222b3c] px-4 py-3 font-ui text-base text-white outline-none placeholder:text-neutral-500 focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/40";
const LABEL = "block font-ui text-sm font-bold text-white mb-1.5";

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={`font-ui text-sm ${strong ? "font-bold text-white" : "text-neutral-400"}`}>
        {label}
      </span>
      <span
        className={`font-ui tabular-nums ${strong ? "text-lg font-bold text-white" : "text-sm text-neutral-200"}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function Checkout() {
  const { publicId } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [problem, setProblem] = useState("");
  const [country, setCountry] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [totals, setTotals] = useState(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    buyerName: "",
    buyerEmail: "",
    buyerPhone: "",
    region: "",
    line1: "",
    line2: "",
    city: "",
    postcode: "",
  });

  usePageMeta({
    title: book ? `Buy ${book.title} | VantaOrigin` : "Buy a book | VantaOrigin",
    description: book?.description || "Order a printed copy.",
    canonicalPath: `/book/${publicId}`,
  });

  useEffect(() => {
    let cancelled = false;
    loadBook(publicId)
      .then((row) => {
        if (cancelled) return;
        setBook(row);
        // Preselect the first country we can actually deliver to, rather
        // than the first in the list, which may be one we cannot.
        setCountry(row.countries.find((c) => c.available)?.countryCode ?? "");
      })
      .catch((error) => !cancelled && setProblem(error.message || "We could not find that book."));
    return () => {
      cancelled = true;
    };
  }, [publicId]);

  // Every total comes from the server. The browser adds nothing up.
  useEffect(() => {
    if (!book || !country) return undefined;
    let cancelled = false;
    setTotals(null);
    quoteOrder({ bookId: publicId, countryCode: country, quantity })
      .then((row) => !cancelled && setTotals(row))
      .catch((error) => !cancelled && setProblem(error.message || "We could not price that."));
    return () => {
      cancelled = true;
    };
  }, [book, country, quantity, publicId]);

  const place = useMemo(
    () => book?.countries.find((c) => c.countryCode === country) ?? null,
    [book, country]
  );

  const send = async (event) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setProblem("");

    try {
      const order = await placeOrder({
        bookId: publicId,
        countryCode: country,
        quantity,
        buyerName: form.buyerName,
        buyerEmail: form.buyerEmail,
        ...(form.buyerPhone ? { buyerPhone: form.buyerPhone } : {}),
        ...(form.region ? { region: form.region } : {}),
        address: {
          line1: form.line1,
          ...(form.line2 ? { line2: form.line2 } : {}),
          city: form.city,
          ...(form.postcode ? { postcode: form.postcode } : {}),
        },
      });

      // The token is the only thing that opens this order again, and it is
      // returned once. Into the address, so a refresh does not lose it and
      // the page can be bookmarked.
      navigate(`/order/${order.publicId}?token=${encodeURIComponent(order.statusToken)}`);
    } catch (error) {
      setProblem(error.message || "That did not go through. Nothing has been charged.");
      setSending(false);
    }
  };

  if (problem && !book) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="mx-auto max-w-[640px] px-5 py-20 text-center">
          <h1 className="font-ui text-2xl font-bold text-white">We could not find that book</h1>
          <p className="mt-3 font-ui text-base text-neutral-300">{problem}</p>
        </main>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="mx-auto max-w-[1100px] px-5 py-12">
          <Skeleton className="h-[320px] w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  const nowhere = book.countries.every((c) => !c.available);

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="mx-auto max-w-[1100px] px-5 pb-24 pt-10 sm:px-8">
        <h1 className="font-ui text-3xl font-bold text-white sm:text-[40px]">{book.title}</h1>
        <p className="mt-2 font-ui text-base text-neutral-400">
          by {book.creator.name}
          {book.format && ` · ${book.format.name} · ${book.pageCount} pages`}
        </p>

        {nowhere ? (
          <div className="mt-8 rounded-2xl border border-dashed border-white/20 px-6 py-12 text-center">
            <p className="font-ui text-lg font-bold text-white">Not on sale yet</p>
            <p className="mx-auto mt-2 max-w-[460px] font-ui text-base leading-relaxed text-neutral-300">
              {book.countries[0]?.why ||
                "We are still working out what this costs to print and deliver."}
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
            {/* What they are buying, and what it comes to. First on a phone,
                because somebody scrolling past a form wants to know the
                price before they decide to fill it in. */}
            <aside className="rounded-2xl border border-white/10 bg-[#222b3c] p-5 lg:order-2 lg:w-[360px] lg:shrink-0 sm:p-6">
              {book.coverImageUrl && (
                <Art
                  src={book.coverImageUrl}
                  alt=""
                  className="mb-5 aspect-[3/4] w-full rounded-xl object-cover"
                />
              )}

              <div className="flex flex-wrap gap-4">
                <div className="min-w-0 flex-1">
                  <label className={LABEL} htmlFor="country">
                    Deliver to
                  </label>
                  <select
                    id="country"
                    className={FIELD}
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                  >
                    {book.countries.map((option) => (
                      <option
                        key={option.countryCode}
                        value={option.countryCode}
                        disabled={!option.available}
                      >
                        {option.name}
                        {option.available ? "" : " (not yet)"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-[110px] shrink-0">
                  <label className={LABEL} htmlFor="quantity">
                    Copies
                  </label>
                  <input
                    id="quantity"
                    className={FIELD}
                    type="number"
                    min="1"
                    max={book.maxCopies}
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(Math.max(1, Math.min(book.maxCopies, Number(event.target.value) || 1)))
                    }
                  />
                </div>
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                {totals ? (
                  <>
                    <Row
                      label={`Book${quantity > 1 ? ` x ${quantity}` : ""}`}
                      value={money(totals.retailMinor, totals.currency)}
                    />
                    <Row label="Delivery" value={money(totals.deliveryMinor, totals.currency)} />
                    <div className="mt-2 border-t border-white/10 pt-2">
                      <Row strong label="Total" value={money(totals.totalMinor, totals.currency)} />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                )}

                {place?.available && place.estDaysMin != null && (
                  <p className="mt-3 font-ui text-sm text-neutral-400">
                    Usually {place.estDaysMin} to {place.estDaysMax} days
                    {place.courier ? ` with ${place.courier}` : ""}.
                  </p>
                )}
              </div>
            </aside>

            {/* Where it goes. */}
            <form onSubmit={send} className="min-w-0 flex-1 lg:order-1">
              <h2 className="font-ui text-xl font-bold text-white">Where should it go?</h2>
              <p className="mt-1 font-ui text-sm text-neutral-400">
                No account needed. We will email you a link to follow your order.
              </p>

              <div className="mt-5 flex flex-col gap-4">
                <div className="flex flex-wrap gap-4">
                  <div className="min-w-0 flex-[1_1_220px]">
                    <label className={LABEL} htmlFor="buyerName">
                      Your name
                    </label>
                    <input
                      id="buyerName"
                      className={FIELD}
                      required
                      autoComplete="name"
                      value={form.buyerName}
                      onChange={(event) => setForm({ ...form, buyerName: event.target.value })}
                    />
                  </div>
                  <div className="min-w-0 flex-[1_1_220px]">
                    <label className={LABEL} htmlFor="buyerEmail">
                      Email
                    </label>
                    <input
                      id="buyerEmail"
                      className={FIELD}
                      type="email"
                      required
                      autoComplete="email"
                      value={form.buyerEmail}
                      onChange={(event) => setForm({ ...form, buyerEmail: event.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL} htmlFor="line1">
                    Address
                  </label>
                  <input
                    id="line1"
                    className={FIELD}
                    required
                    autoComplete="address-line1"
                    placeholder="Street and number"
                    value={form.line1}
                    onChange={(event) => setForm({ ...form, line1: event.target.value })}
                  />
                </div>

                <input
                  className={FIELD}
                  autoComplete="address-line2"
                  aria-label="Address line two"
                  placeholder="Flat, floor or landmark (optional)"
                  value={form.line2}
                  onChange={(event) => setForm({ ...form, line2: event.target.value })}
                />

                <div className="flex flex-wrap gap-4">
                  <div className="min-w-0 flex-[1_1_180px]">
                    <label className={LABEL} htmlFor="city">
                      City
                    </label>
                    <input
                      id="city"
                      className={FIELD}
                      required
                      autoComplete="address-level2"
                      value={form.city}
                      onChange={(event) => setForm({ ...form, city: event.target.value })}
                    />
                  </div>
                  <div className="min-w-0 flex-[1_1_160px]">
                    <label className={LABEL} htmlFor="region">
                      State or region
                    </label>
                    <input
                      id="region"
                      className={FIELD}
                      autoComplete="address-level1"
                      value={form.region}
                      onChange={(event) => setForm({ ...form, region: event.target.value })}
                    />
                  </div>
                  <div className="min-w-0 flex-[1_1_140px]">
                    <label className={LABEL} htmlFor="postcode">
                      Postcode
                    </label>
                    <input
                      id="postcode"
                      className={FIELD}
                      autoComplete="postal-code"
                      value={form.postcode}
                      onChange={(event) => setForm({ ...form, postcode: event.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL} htmlFor="buyerPhone">
                    Phone
                  </label>
                  <input
                    id="buyerPhone"
                    className={FIELD}
                    type="tel"
                    autoComplete="tel"
                    value={form.buyerPhone}
                    onChange={(event) => setForm({ ...form, buyerPhone: event.target.value })}
                  />
                  <p className="mt-1.5 font-ui text-xs text-neutral-500">
                    For the courier, if they cannot find the address.
                  </p>
                </div>
              </div>

              {problem && (
                <p
                  role="alert"
                  className="mt-5 rounded-xl border border-[#f3a0b8]/40 bg-[#3a2030] px-4 py-3 font-ui text-sm text-[#ffb4c4]"
                >
                  {problem}
                </p>
              )}

              <button
                type="submit"
                disabled={sending || !totals}
                className="mt-6 min-h-[52px] w-full rounded-full bg-[#a855f7] px-8 font-ui text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
              >
                {sending
                  ? "Placing your order..."
                  : totals
                    ? `Continue to payment, ${money(totals.totalMinor, totals.currency)}`
                    : "Working out the total..."}
              </button>

              {/* Said before they commit, not after. */}
              <p className="mt-3 font-ui text-xs leading-relaxed text-neutral-500">
                Nothing is charged yet. Your copy is printed to order, so give it a few days
                before it ships.
              </p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
