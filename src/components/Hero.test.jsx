import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
    // the navbar lives inside the hero, so its CTA matches the same name
    const signUp = screen.getAllByRole("link", { name: "Create your page" });
    expect(signUp.length).toBeGreaterThan(0);
    signUp.forEach((link) => expect(link).toHaveAttribute("href", "/auth"));
    // Both of them — the navbar's and the hero's — go to the characters
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
