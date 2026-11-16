// Content arriving as you reach it.
//
// Eight pixels up and a fade, once, when a section first comes into view.
// Not on a timer and not on scroll position: an IntersectionObserver, so a
// section that is already on screen when the page loads does not sit
// invisible waiting for a scroll that never comes. That is the usual bug
// with this pattern and it is worse than having no animation at all.
//
// Everything about this is motion-safe. Somebody who has asked their
// system for less movement gets the content immediately and in place,
// which is why the hidden state is applied by the observer rather than
// baked into the markup: if the observer never runs, the content is
// visible. Nothing here can leave a reader with a blank page.
import { useEffect, useRef, useState } from "react";

const wantsStillness = () => {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
};

export default function Reveal({ children, delay = 0, as: Tag = "div", className = "" }) {
  const ref = useRef(null);
  // Starts true so that anything which goes wrong leaves the content on
  // screen. Only an observer that actually runs can hide it.
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || wantsStillness() || typeof IntersectionObserver !== "function") return;

    // Already in view on load: leave it alone rather than fading in
    // something the reader is looking at.
    const box = node.getBoundingClientRect();
    if (box.top < window.innerHeight * 0.9) return;

    setShown(false);
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        watcher.disconnect();
      },
      // A little before the edge, so it has finished by the time the
      // reader's eye arrives rather than starting then.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 }
    );

    watcher.observe(node);
    return () => watcher.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${shown ? "motion-safe:animate-rise" : "opacity-0"} ${className}`}
      style={shown && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
