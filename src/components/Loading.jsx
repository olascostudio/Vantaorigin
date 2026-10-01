import { useState } from "react";

// Waiting, shown as the shape of what is coming.
//
// Nothing here spins. A spinner says "something is happening" and nothing
// else; a page in the shape of its own content says what is on its way, holds
// the layout so nothing jumps when the real thing lands, and reads as faster
// for it. Each of these is a rough tracing of the page it stands in for.

// A picture that holds its own place while it arrives.
//
// An <img> with nothing behind it is an empty hole until the last byte
// lands, and then the artwork appears all at once. This keeps the same
// breathing grey as everything else in its place, in the exact shape the
// picture will take, and stops as soon as it paints -- or fails, since a
// block pulsing for ever says the wrong thing.
//
// One element, so it drops in wherever an <img> already is without changing
// a single thing about the layout.
export function Art({ className = "", ...rest }) {
  const [settled, setSettled] = useState(false);

  return (
    <img
      {...rest}
      // A picture already in the browser's cache is complete before React
      // hears about it, and would otherwise pulse for ever.
      ref={(node) => {
        if (node?.complete) setSettled(true);
      }}
      onLoad={() => setSettled(true)}
      onError={() => setSettled(true)}
      className={`${className} ${settled ? "" : "animate-pulse bg-white/[0.06]"}`}
    />
  );
}

// One grey block. The parts below are built from these.
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.06] ${className}`} />;
}

// A line of text, narrowed to look like writing rather than a bar.
export function TextLine({ className = "w-full" }) {
  return <Skeleton className={`h-3.5 rounded-md ${className}`} />;
}

// A character card in a grid, while the real one is on its way.
export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
      <TextLine className="w-3/4" />
      <TextLine className="w-1/2" />
    </div>
  );
}

// Several of them, for a grid that has not arrived yet.
//
// `announce` is turned off when this sits inside a larger waiting page: one
// "loading" is what a screen reader should hear, not one per region.
export function CardGridSkeleton({ count = 6, className = "", announce = true }) {
  return (
    <div
      {...(announce ? { role: "status", "aria-label": "Loading" } : {})}
      className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${className}`}
    >
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

// A character's own page: the artwork, its name, and what is written about it.
export function CharacterSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="px-4 py-5 sm:px-6 sm:py-6 lg:px-10">
      <div className="mx-auto w-full max-w-[640px] lg:max-w-[1100px]">
        <Skeleton className="h-9 w-32 rounded-full" />

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* the artwork */}
          <Skeleton className="aspect-[3/4] w-full rounded-3xl" />

          {/* who they are */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-2/3 rounded-lg" />
              <TextLine className="w-1/3" />
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 p-5">
              <TextLine className="w-1/4" />
              <TextLine />
              <TextLine />
              <TextLine className="w-4/5" />
            </div>

            {/* what they can do */}
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 p-5">
              <TextLine className="w-1/3" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <TextLine className="w-24" />
                  <Skeleton className="h-2.5 flex-1 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// A creator's page: banner, their picture over its lower edge, their name,
// then their work.
export function CreatorSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-[680px]">
      <div className="relative">
        <Skeleton className="h-[170px] w-full rounded-none sm:rounded-b-3xl" />
        <Skeleton className="absolute -bottom-10 left-6 size-[88px] rounded-full border-4 border-[#0e1320]" />
      </div>

      <div className="mt-14 flex flex-col gap-3 px-6">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <TextLine className="w-32" />
        <TextLine className="mt-2 w-full" />
        <TextLine className="w-5/6" />
      </div>

      <div className="mt-7 flex gap-3 px-6">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>

      <div className="mt-6 px-6">
        <CardGridSkeleton count={4} announce={false} className="grid-cols-2 sm:grid-cols-2 lg:grid-cols-2" />
      </div>
    </div>
  );
}

// Anything else that takes over a whole page: a heading, and a few lines
// under it.
export default function PageSkeleton({ className = "" }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6 ${className}`}
    >
      <Skeleton className="h-8 w-56 rounded-lg" />
      <TextLine className="mt-4 w-80 max-w-full" />

      <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-2xl" />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
