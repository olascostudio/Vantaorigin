import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PageSkeleton, {
  CardGridSkeleton,
  CharacterSkeleton,
  CreatorSkeleton,
  Skeleton,
} from "./Loading.jsx";

// Waiting is shown as the shape of what is coming, never as something going
// round. These check the promise rather than the pixels: every waiting state
// announces itself to a screen reader, and none of them spins.

const spins = (container) =>
  container.querySelectorAll('[class*="animate-spin"], [class*="animate-ping"]').length;

describe("Waiting states", () => {
  const shapes = {
    "a whole page": <PageSkeleton />,
    "a character": <CharacterSkeleton />,
    "a creator's page": <CreatorSkeleton />,
    "a grid of cards": <CardGridSkeleton />,
  };

  for (const [what, element] of Object.entries(shapes)) {
    it(`says it is loading while ${what} is on its way`, () => {
      const { container, unmount } = render(element);
      expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
      // The shape is made of blocks that breathe, not anything that turns.
      expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
      expect(spins(container)).toBe(0);
      unmount();
    });
  }

  it("keeps the shape of the page rather than a single blob", () => {
    const { container } = render(<CreatorSkeleton />);
    // Banner, picture, name, lines, tabs and their work: several pieces, not
    // one grey rectangle standing in for everything.
    expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(8);
  });

  it("offers a plain block for anywhere with its own shape", () => {
    const { container } = render(<Skeleton className="h-10 w-10" />);
    expect(container.firstChild.className).toContain("animate-pulse");
  });
});
