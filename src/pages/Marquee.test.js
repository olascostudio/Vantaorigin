import { describe, it, expect } from "vitest";
import { nextPosition } from "./Discover.jsx";

// The drifting rails on Discover, tested as arithmetic.
//
// Everything that has gone wrong with them has gone wrong in this one step,
// and while it lived inside a requestAnimationFrame callback nothing could
// reach it: a browser is needed to run the loop, and a hidden tab does not
// run it at all. So the step itself is a function now.

const frame = (over) => ({ at: 0, wrote: 0, actual: 0, elapsed: 16, speed: 0.05, half: 1000, ...over });

describe("nextPosition", () => {
  // The original stutter. scrollLeft is rounded to whole pixels, so a frame
  // worth of drift (0.05px/ms x 16ms = 0.8px) written into it and read back
  // came out as 1 or as 0, and the remainder was lost every time. Carrying
  // the fraction is the whole point.
  it("keeps the part of a frame that is smaller than a pixel", () => {
    let at = 0;
    for (let i = 0; i < 10; i += 1) {
      at = nextPosition(frame({ at, wrote: Math.round(at), actual: Math.round(at) }));
    }
    // Ten frames at 0.8px is 8px. Rounding each frame away would have left
    // this at a whole number well short of it.
    expect(at).toBeCloseTo(8, 5);
  });

  // The regression the checker found: writing an absolute position threw
  // away a swipe or a focus scroll on the very next frame.
  it("takes movement that came from somewhere else", () => {
    // The loop left the rail at 252. A finger has dragged it to 1152.
    // half is well past that, so nothing here is the wrap: if this came back
    // near 252 the swipe would have been thrown away, which is the bug.
    const at = nextPosition(frame({ at: 252, wrote: 252, actual: 1152, half: 4000 }));
    expect(at).toBeGreaterThan(1152);
    expect(at).toBeLessThan(1153);
  });

  it("does not mistake the browser's own rounding for somebody else", () => {
    // The loop asked for 252.4 and the browser stored 252. That one pixel
    // is ours, not a reader's, and adopting it would drop the fraction.
    const at = nextPosition(frame({ at: 252.4, wrote: 252, actual: 252 }));
    expect(at).toBeCloseTo(253.2, 5);
  });

  it("loops without a seam", () => {
    const at = nextPosition(frame({ at: 999.5, wrote: 999, actual: 999, half: 1000 }));
    expect(at).toBeCloseTo(0.3, 5);
    expect(at).toBeGreaterThanOrEqual(0);
  });

  it("does not wrap before it has been measured", () => {
    // half is 0 until the rails have been laid out. Wrapping against that
    // would pin the rail at zero.
    const at = nextPosition(frame({ at: 40, wrote: 40, actual: 40, half: 0 }));
    expect(at).toBeCloseTo(40.8, 5);
  });

  it("moves further when a frame took longer", () => {
    const quick = nextPosition(frame({ elapsed: 16 }));
    const slow = nextPosition(frame({ elapsed: 48 }));
    expect(slow).toBeCloseTo(quick * 3, 5);
  });
});
