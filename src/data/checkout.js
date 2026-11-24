// Buying a printed copy, from the browser's side.
import { api } from "./api";

export const loadBook = (publicId) => api.get(`/public/books/${encodeURIComponent(publicId)}`);

export const quoteOrder = ({ bookId, countryCode, quantity }) =>
  api.post("/checkout/quote", { bookId, countryCode, quantity });

export const placeOrder = (order) => api.post("/orders", order);

export const loadOrder = (publicId, token) =>
  api.get(`/orders/${encodeURIComponent(publicId)}?token=${encodeURIComponent(token)}`);

// Minor units are what the API speaks, because a JSON number is a float and
// these are kobo. This is the only place that turns them into something to
// read, and it shows a fraction only where there is one: a GBP parcel of 290
// is 2.90, and rounding that to 3 loses real money on the screen where
// somebody decides whether to pay it.
export function money(minor, currency) {
  if (typeof minor !== "number" || !Number.isFinite(minor)) return "";
  const symbol = currency === "NGN" ? "₦" : currency === "GBP" ? "£" : "";
  const units = minor / 100;
  return `${symbol}${units.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(units) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
