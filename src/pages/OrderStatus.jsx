// Where somebody's order got to.
//
// Reached by a link with a token in it, which is the only thing that opens
// it: the buyer has no account, so there is nothing else to prove the order
// is theirs. The same link goes in the email we send them, so this page is
// the one they come back to rather than a reply they have to keep.
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import DashboardNav from "../components/DashboardNav";
import { Skeleton } from "../components/Loading.jsx";
import { usePrivatePage } from "../data/pageMeta";
import { loadOrder, money } from "../data/checkout";

// What each state means, in a sentence, rather than a word somebody has to
// work out. "pending_payment" tells a buyer nothing.
const PLAIN = {
  pending_payment: ["Waiting for payment", "Nothing has been charged yet."],
  paid: ["Paid", "We are sending it to the printer."],
  with_printer: ["Being printed", "Your copy is being made."],
  shipped: ["On its way", "It has left the printer."],
  delivered: ["Delivered", "Let us know if anything is wrong with it."],
  cancelled: ["Cancelled", "If you were charged, the refund is on its way."],
};

export default function OrderStatus() {
  const { publicId } = useParams();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [order, setOrder] = useState(null);
  const [problem, setProblem] = useState("");

  // Never indexed: the address carries the key that opens this order, so a
  // crawler following it would put somebody's order into a search result.
  usePrivatePage();

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setProblem("That link is missing its key. Use the link from your email.");
      return undefined;
    }
    loadOrder(publicId, token)
      .then((row) => !cancelled && setOrder(row))
      .catch(() => !cancelled && setProblem("We could not find that order."));
    return () => {
      cancelled = true;
    };
  }, [publicId, token]);

  const [heading, note] = PLAIN[order?.status] ?? ["Placed", "We have your order."];

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="mx-auto max-w-[640px] px-5 pb-24 pt-12 sm:px-8">
        {problem ? (
          <>
            <h1 className="font-ui text-2xl font-bold text-white">We could not find that order</h1>
            <p className="mt-3 font-ui text-base leading-relaxed text-neutral-300">{problem}</p>
          </>
        ) : !order ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <p className="font-ui text-sm font-bold uppercase tracking-wider text-neutral-400">
              Order {order.publicId}
            </p>
            <h1 className="mt-2 font-ui text-3xl font-bold text-white sm:text-[40px]">{heading}</h1>
            <p className="mt-3 font-ui text-base leading-relaxed text-neutral-300">{note}</p>

            <section className="mt-8 rounded-2xl border border-white/10 bg-[#222b3c] p-5 sm:p-6">
              {order.items.map((item) => (
                <div key={item.title} className="flex items-baseline justify-between gap-4 py-1.5">
                  <span className="font-ui text-base text-white">
                    {item.title}
                    {item.quantity > 1 && (
                      <span className="text-neutral-400"> x {item.quantity}</span>
                    )}
                  </span>
                </div>
              ))}

              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-baseline justify-between gap-4 py-1">
                  <span className="font-ui text-sm text-neutral-400">Book</span>
                  <span className="font-ui text-sm tabular-nums text-neutral-200">
                    {money(order.retailMinor, order.currency)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-1">
                  <span className="font-ui text-sm text-neutral-400">Delivery</span>
                  <span className="font-ui text-sm tabular-nums text-neutral-200">
                    {money(order.deliveryMinor, order.currency)}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-white/10 pt-3">
                  <span className="font-ui text-base font-bold text-white">Total</span>
                  <span className="font-ui text-lg font-bold tabular-nums text-white">
                    {money(order.totalMinor, order.currency)}
                  </span>
                </div>
              </div>
            </section>

            {order.trackingNumber && (
              <p className="mt-5 font-ui text-base text-neutral-300">
                {order.courier ? `${order.courier}: ` : "Tracking: "}
                <span className="font-bold text-white">{order.trackingNumber}</span>
              </p>
            )}

            <p className="mt-8 font-ui text-sm leading-relaxed text-neutral-500">
              Keep this link. It is the only way back to this page, and we have emailed it to you
              as well.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
