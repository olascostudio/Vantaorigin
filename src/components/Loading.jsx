import logoMark from "../assets/landing/hero/logo-mark.svg";

// The VantaOrigin mark, breathing. Used wherever something is being fetched,
// in place of the word "Loading".
export function LoadingMark({ size = 56, label = "Loading" }) {
  return (
    <span role="status" aria-label={label} className="relative inline-flex items-center justify-center">
      {/* the glow behind it, slightly out of step with the mark itself */}
      <span
        aria-hidden="true"
        className="absolute animate-ping rounded-full bg-[#c2185b]/30 blur-md"
        style={{ width: size, height: size }}
      />
      <img
        src={logoMark}
        alt=""
        className="relative animate-logo-pulse"
        style={{ width: size * 0.8, height: "auto" }}
      />
    </span>
  );
}

// A whole page waiting on its first load.
export default function Loading({ label = "Loading", className = "" }) {
  return (
    <div className={`flex min-h-[50vh] flex-col items-center justify-center gap-4 ${className}`}>
      <LoadingMark label={label} />
      <p className="font-ui text-sm text-neutral-400">{label}…</p>
    </div>
  );
}

// Grey blocks in the shape of the content that is coming, so the page keeps
// its layout instead of jumping when the data lands.
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}
