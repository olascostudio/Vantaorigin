import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Hero from "./Hero";

describe("Hero", () => {
  it("leads with creating character cards", () => {
    render(<Hero />, { wrapper: MemoryRouter });
    expect(
      screen.getByRole("heading", { level: 1, name: /create your character cards/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Create a home for your characters, organize their profiles/i)
    ).toBeInTheDocument();
  });

  it("renders both primary CTAs", () => {
    render(<Hero />, { wrapper: MemoryRouter });
    // The navbar lives inside the hero, so both say the same two things.
    const signUp = screen.getAllByRole("link", { name: "Sign up" });
    expect(signUp.length).toBeGreaterThan(0);
    signUp.forEach((link) => expect(link).toHaveAttribute("href", "/signup"));

    const signIn = screen.getAllByRole("link", { name: "Sign in" });
    expect(signIn.length).toBeGreaterThan(0);
    signIn.forEach((link) => expect(link).toHaveAttribute("href", "/signin"));
    // Both of them, the navbar's and the hero's, go to the characters
    // themselves rather than scrolling to a section about them.
    const explore = screen.getAllByRole("link", { name: "Explore characters" });
    expect(explore.length).toBeGreaterThan(0);
    explore.forEach((link) => expect(link).toHaveAttribute("href", "/discover"));
  });

  it("announces the character hub rather than a story chapter", () => {
    render(<Hero />, { wrapper: MemoryRouter });
    expect(screen.getByText(/Create your character hub/i)).toBeInTheDocument();
    expect(screen.queryByText(/Iron Law/i)).not.toBeInTheDocument();
  });

  it("renders the character showcase with 5 cards in design paint order", () => {
    render(<Hero />, { wrapper: MemoryRouter });
    const cards = screen.getAllByTestId("showcase-card");
    expect(cards.map((card) => card.dataset.card)).toEqual([
      "vtuber",
      "knife-dancer",
      "ink-centaur",
      "hooded-gunman",
      "winged-wolf",
    ]);
  });

  it("uses bundled assets rather than remote Figma URLs", () => {
    const { container } = render(<Hero />, { wrapper: MemoryRouter });
    const sources = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(sources.length).toBeGreaterThan(0);
    sources.forEach((src) => expect(src).not.toMatch(/figma\.com/));
  });
});

describe("The hero on a phone", () => {
  it("holds itself to one screen only where there is content to fill one", () => {
    const { container } = render(<Hero />, { wrapper: MemoryRouter });
    const header = container.querySelector("header");

    // On a phone there is not enough above the cards to fill a screen, so
    // forcing one left a gap of empty background between the buttons and
    // the artwork. A phone scrolls anyway.
    expect(header.className).toContain("lg:min-h-svh");
    expect(header.className).not.toMatch(/(^|\s)min-h-svh/);

    const showcase = container.querySelector('[data-testid="showcase"]').closest("div.-mx-4");
    expect(showcase.className).toContain("lg:mt-auto");
    expect(showcase.className).not.toMatch(/(^|\s)mt-auto/);
  });
});

// The fan advances rather than the cards bobbing in place.
//
// The five positions come straight from Figma, each with its own size, tilt
// and badge placement, and moving the cards themselves would mean giving all
// of that up. So the slots hold still and the artwork steps between them.
describe("the showcase advances", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const artOf = () =>
    screen
      .getAllByTestId("showcase-card")
      .map((card) => card.querySelector("img")?.getAttribute("src"));

  const slotsOf = () =>
    screen.getAllByTestId("showcase-card").map((card) => card.getAttribute("style"));

  it("deals a different character into each slot, leaving the slots alone", () => {
    render(<Hero />, { wrapper: MemoryRouter });

    const before = artOf();
    const slotsBefore = slotsOf();
    expect(before.filter(Boolean)).toHaveLength(5);

    act(() => {
      vi.advanceTimersByTime(4200);
    });

    const after = artOf();
    expect(after).not.toEqual(before);
    // Everybody moved along by one, so the card that was second is now first.
    expect(after[0]).toBe(before[1]);
    expect(after[4]).toBe(before[0]);
    // And the fan itself has not shifted a pixel.
    expect(slotsOf()).toEqual(slotsBefore);
  });

  it("comes back round to where it started", () => {
    render(<Hero />, { wrapper: MemoryRouter });
    const before = artOf();

    act(() => {
      vi.advanceTimersByTime(4200 * 5);
    });
    expect(artOf()).toEqual(before);
  });

  it("holds still for somebody who asked for less movement", () => {
    const real = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    try {
      render(<Hero />, { wrapper: MemoryRouter });
      const before = artOf();
      act(() => {
        vi.advanceTimersByTime(4200 * 3);
      });
      expect(artOf()).toEqual(before);
    } finally {
      window.matchMedia = real;
    }
  });
});
