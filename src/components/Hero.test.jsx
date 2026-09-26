import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Hero from "./Hero";

describe("Hero", () => {
  it("leads with creating a character Realm", () => {
    render(<Hero />, { wrapper: MemoryRouter });
    expect(
      screen.getByRole("heading", { level: 1, name: /create your character realm/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Create a home for your characters, organize their profiles/i)
    ).toBeInTheDocument();
  });

  it("renders both primary CTAs", () => {
    render(<Hero />, { wrapper: MemoryRouter });
    // the navbar lives inside the hero, so its CTA matches the same name
    const signUp = screen.getAllByRole("link", { name: "Create Your Realm" });
    expect(signUp.length).toBeGreaterThan(0);
    signUp.forEach((link) => expect(link).toHaveAttribute("href", "/auth"));
    expect(screen.getByRole("link", { name: "Explore Realms" })).toHaveAttribute("href", "#explore");
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
