// A creator's own sales, from the browser's side.
import { api } from "./api";

export const loadStudioSummary = () => api.get("/me/studio/summary");
export const loadStudioOrders = () => api.get("/me/studio/orders");

// What each order status means to the person who made the book, rather than
// to the system. "pending_payment" is a state machine's word.
export const ORDER_STATES = {
  pending_payment: { say: "Waiting on payment", tone: "muted" },
  paid: { say: "Paid, not yet with a printer", tone: "info" },
  in_production: { say: "In production", tone: "warn" },
  shipped: { say: "Shipped", tone: "info" },
  completed: { say: "Completed", tone: "good" },
  refunded: { say: "Refunded", tone: "muted" },
  cancelled: { say: "Cancelled", tone: "muted" },
};

export const stateOf = (status) =>
  ORDER_STATES[status] ?? { say: status.replace(/_/g, " "), tone: "muted" };
