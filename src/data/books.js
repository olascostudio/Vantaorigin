// A creator's books, from the browser's side.
import { api } from "./api";

export const listBooks = () => api.get("/me/books");
export const loadFormats = () => api.get("/me/books/formats");
export const createBook = (book) => api.post("/me/books", book);
export const loadBook = (publicId) => api.get(`/me/books/${encodeURIComponent(publicId)}`);
export const saveBook = (publicId, changes) =>
  api.patch(`/me/books/${encodeURIComponent(publicId)}`, changes);
export const deleteBook = (publicId) => api.delete(`/me/books/${encodeURIComponent(publicId)}`);

export const quoteBook = (publicId, retailMinor) =>
  api.get(
    `/me/books/${encodeURIComponent(publicId)}/quote${
      retailMinor ? `?retailMinor=${encodeURIComponent(retailMinor)}` : ""
    }`
  );

export const priceBook = (publicId, countryCode, retailMinor) =>
  api.put(`/me/books/${encodeURIComponent(publicId)}/price`, { countryCode, retailMinor });

export const acceptRights = (publicId, version) =>
  api.post(`/me/books/${encodeURIComponent(publicId)}/rights`, { accepted: true, version });

// Typed money to the whole minor units the API speaks. Returns null for
// anything that is not a price, so a caller can tell "nothing typed yet"
// from "typed something that is not a number".
export function toMinor(typed) {
  const clean = String(typed ?? "").replace(/[\s,]/g, "");
  if (!/^\d*(\.\d{0,2})?$/.test(clean) || clean === "" || clean === ".") return null;
  const [whole, part = ""] = clean.split(".");
  return `${whole || "0"}${part.padEnd(2, "0")}`;
}

// The other direction, for putting a saved price back in a field.
export const fromMinor = (minor) =>
  typeof minor === "number" ? String(minor / 100) : "";

export function money(minor, currency) {
  if (typeof minor !== "number" || !Number.isFinite(minor)) return "";
  const symbol = currency === "NGN" ? "₦" : currency === "GBP" ? "£" : "";
  const units = minor / 100;
  return `${symbol}${units.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(units) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
