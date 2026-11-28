// Every order containing one of this creator's books.
//
// Deliberately not a money screen beyond their own line of it. A creator
// sees what sold, where it went, where it has got to, and their own share.
// What the printer charged and what the platform took are not on it: those
// are real numbers and they are not this person's business.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePrivatePage } from "../data/pageMeta";
import { Skeleton } from "../components/Loading.jsx";
import { money } from "../data/books";
import { loadStudioOrders } from "../data/sales";
import { OrderStatus } from "../components/studio/OrderBits.jsx";
import StudioShell, { BTN, CARD } from "../components/StudioShell.jsx";

const TH = "border-b border-studio-line px-5 py-2.5 text-left font-ui text-xs font-semibold text-studio-muted";
const TD = "border-b border-studio-line px-5 py-[13px] font-ui text-sm text-studio-body";

const when = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export default function StudioOrders() {
  const [orders, setOrders] = useState(null);
  const [problem, setProblem] = useState("");

  usePrivatePage();

  useEffect(() => {
    let cancelled = false;
    loadStudioOrders()
      .then((list) => !cancelled && setOrders(list.orders))
      .catch((error) => !cancelled && setProblem(error.message || "We could not load your orders."));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <StudioShell
      title="Orders"
      lead="Everything somebody has bought, and what you earned on it."
    >
      {problem && (
        <p
          role="alert"
          className="mt-6 rounded-[10px] border border-studio-warn/30 bg-[#fdf3e3] px-4 py-3 font-ui text-sm text-studio-warn"
        >
          {problem}
        </p>
      )}

      {!orders ? (
        <Skeleton className="mt-[26px] h-64 w-full rounded-xl" />
      ) : orders.length === 0 ? (
        <div className={`${CARD} mt-[26px] border-dashed px-6 py-14 text-center`}>
          <p className="font-ui text-base text-studio-body">No orders yet.</p>
          <p className="mx-auto mt-1.5 max-w-[420px] font-ui text-sm text-studio-muted">
            An order appears here the moment somebody buys a printed copy through your link. Your
            share is recorded at that moment, and held until the order completes.
          </p>
          <Link to="/studio/books" className={`${BTN} mt-5`}>
            Open your books
          </Link>
        </div>
      ) : (
        <section aria-label="Orders" className={`${CARD} mt-[26px] overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Order
                  </th>
                  <th scope="col" className={TH}>
                    Placed
                  </th>
                  <th scope="col" className={TH}>
                    Book
                  </th>
                  <th scope="col" className={TH}>
                    Where
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
                {orders.map((order) => (
                  <tr key={order.publicId}>
                    <td className={`${TD} tabular-nums`}>{order.publicId}</td>
                    <td className={TD}>{when(order.placedAt)}</td>
                    <td className={`${TD} font-medium text-studio-ink`}>
                      {order.titles.join(", ")}
                      {order.quantity > 1 && (
                        <span className="font-normal text-studio-muted">
                          {" "}
                          &times; {order.quantity}
                        </span>
                      )}
                    </td>
                    <td className={TD}>{order.countryCode}</td>
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
        </section>
      )}

      {orders && orders.length > 0 && (
        <p className="mt-5 max-w-[640px] font-ui text-[13px] leading-relaxed text-studio-muted">
          Your share is written the moment an order is placed, and held until the order completes.
          Payouts are not connected yet, so nothing has been paid out: the figures above are what
          is owed, not what has moved.
        </p>
      )}
    </StudioShell>
  );
}
