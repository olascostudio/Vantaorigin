import "@testing-library/jest-dom/vitest";

// Two things a browser has and jsdom does not.
//
// Anything that measures itself needs them, and the beta banner does: it
// watches its own width to decide whether the words have to scroll, and asks
// whether the reader wants less movement. Without these, every test that
// renders a navbar throws before it gets to whatever it was testing.
//
// Both are the quiet, do-nothing versions. A test that cares about either
// replaces it with one that answers the way that test needs.

if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
}
