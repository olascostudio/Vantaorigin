import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// What a card has to do when somebody points at it.
//
// There are two things on a card worth opening: the character it is showing,
// and the person who made it. The whole card opens the character, which is
// what anybody expects of a card, and the credit line opens the creator. An
// anchor cannot hold another anchor, so the card's hit area is a stretched
// pseudo element and the credit sits above it. That arrangement is easy to
// break by accident, which is why it is held still here.

vi.mock("../data/pageMeta", () => ({ usePageMeta: () => {} }));
vi.mock("../components/DashboardNav", () => ({ default: () => null }));
vi.mock("../data/character", () => ({ loadPublicCharacters: vi.fn() }));

const { loadPublicCharacters } = await import("../data/character");
const { default: Discover } = await import("./Discover.jsx");

const published = [
  {
    id: "c1",
    alias: "Hope Breaker",
    slug: "hope-breaker",
    universe: "The Heartline Universe",
    tagline: "Marcus Sinclair",
    backstory: "Conjures weapons out of Nether energy.",
    creator: "@Heartline",
    cover: null,
    accent: "#fc187b",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  loadPublicCharacters.mockResolvedValue(published);
});

describe("Discover", () => {
  it("opens the character from anywhere on the card, and the creator from the credit", async () => {
    render(<Discover />, { wrapper: MemoryRouter });

    const cards = await screen.findAllByTestId("character-card");
    // Each row is doubled so the loop has no seam, so the same character
    // appears more than once. The first one is enough.
    const card = cards[0];

    const toCharacter = within(card).getByRole("link", { name: /Read More/ });
    expect(toCharacter).toHaveAttribute("href", "/character/hope-breaker");
    // The stretched pseudo element is what makes the rest of the card
    // clickable, and the card has to be positioned for it to stretch to.
    expect(toCharacter.className).toContain("after:inset-0");
    expect(card.className).toContain("relative");

    // The @ reads well and does not belong in the address.
    expect(within(card).getByRole("link", { name: "By: @Heartline" })).toHaveAttribute(
      "href",
      "/creator/Heartline"
    );
  });

  it("offers the creators page to somebody who wants the people", async () => {
    render(<Discover />, { wrapper: MemoryRouter });
    await screen.findAllByTestId("character-card");

    expect(screen.getByRole("link", { name: "Browse creators" })).toHaveAttribute(
      "href",
      "/creators"
    );
  });
});
