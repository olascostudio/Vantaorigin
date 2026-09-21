import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Hero from "./Hero";

describe("Hero", () => {
  it("renders the headline", () => {
    render(<Hero />, { wrapper: MemoryRouter });
    expect(
      screen.getByRole("heading", { level: 1, name: /build your own fantasy universe/i })
    ).toBeInTheDocument();
  });

  it("renders both primary CTAs with in-page targets", () => {
    render(<Hero />, { wrapper: MemoryRouter });
    expect(screen.getByRole("link", { name: "Start Creating" })).toHaveAttribute("href", "/auth");
    expect(screen.getByRole("link", { name: "Explore Worlds" })).toHaveAttribute("href", "#explore");
  });

  it("renders the announcement badge", () => {
    render(<Hero />, { wrapper: MemoryRouter });
    expect(screen.getByText(/Obaalu - The Iron Law/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /read now/i })).toBeInTheDocument();
  });

  it("renders the character showcase with 5 cards in design paint order", () => {
    render(<Hero />, { wrapper: MemoryRouter });
    const cards = screen.getAllByTestId("showcase-card");
    expect(cards.map((card) => card.dataset.card)).toEqual([
      "ashake",
      "obaalu",
      "urukojin",
      "eganon",
      "iyanu",
    ]);
  });

  it("uses bundled assets rather than remote Figma URLs", () => {
    const { container } = render(<Hero />, { wrapper: MemoryRouter });
    const sources = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(sources.length).toBeGreaterThan(0);
    sources.forEach((src) => expect(src).not.toMatch(/figma\.com/));
  });
});
