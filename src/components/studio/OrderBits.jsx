// The pieces the dashboard and the orders screen both draw.
//
// Shared because the mockup draws the same status chip and the same money
// column on both, and two spellings of a status is how one screen starts
// saying "In production" while the other says "in_production".
import { money } from "../../data/books";
import { stateOf } from "../../data/sales";

const TONE = {
  good: "text-studio-good",
  warn: "text-studio-warn",
  info: "text-studio-info",
  muted: "text-studio-muted",
};

// A glyph per state as well as a colour, because colour alone is not a
// distinction for everybody reading this.
function Mark({ tone }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "shrink-0",
    "aria-hidden": "true",
  };
  if (tone === "good")
    return (
      <svg {...common}>
        <path d="m4 12 5 5L20 7" />
      </svg>
    );
  if (tone === "warn")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  if (tone === "info")
    return (
      <svg {...common}>
        <path d="M3 7h11v9H3z" />
        <path d="M14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17" cy="18" r="1.6" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function OrderStatus({ status }) {
  const state = stateOf(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-ui text-[13px] font-medium ${TONE[state.tone]}`}
    >
      <Mark tone={state.tone} />
      {state.say}
    </span>
  );
}

// Several currencies, kept apart. Adding naira to pounds makes a number
// that is true of nothing, so they are listed instead of summed.
export function Held({ byCurrency }) {
  const entries = Object.entries(byCurrency ?? {}).filter(([, amount]) => amount);
  if (!entries.length) {
    return <span className="tabular-nums">{money(0, "NGN")}</span>;
  }
  return (
    <span className="flex flex-col gap-0.5">
      {entries.map(([currency, amount]) => (
        <span key={currency} className="tabular-nums">
          {money(amount, currency)}
        </span>
      ))}
    </span>
  );
}
