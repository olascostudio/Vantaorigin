import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// What somebody sees the moment they finish signing up.
//
// Verifying an email lands them on the hub with nothing in it. That screen
// used to be one sentence telling them to make a category: a filing decision
// about work that did not exist yet, with nothing to press. It is the step
// between making an account and making a character, and it is where people
// were being lost.

vi.mock("../data/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: { id: "u1", username: "@newcomer", firstName: "", lastName: "" },
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("../data/character", async () => {
  const actual = await vi.importActual("../data/character");
  return {
    ...actual,
    // A creator who has just arrived: no categories, no characters.
    loadLibrary: vi.fn(async () => ({ categories: [], characters: [] })),
    addCategory: vi.fn(),
  };
});

vi.mock("../data/highlights", () => ({
  loadHighlights: vi.fn(async () => []),
  createHighlight: vi.fn(),
  updateHighlight: vi.fn(),
  deleteHighlight: vi.fn(),
  loadMyHighlights: vi.fn(async () => []),
}));

const { default: CreatorHub } = await import("./CreatorHub.jsx");

const arrive = async () => {
  render(
    <MemoryRouter initialEntries={["/creators-hub"]}>
      <Routes>
        <Route path="/creators-hub" element={<CreatorHub />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByText("Make your first character");
};

describe("A creator who has just arrived", () => {
  it("is given something to press, not something to read", async () => {
    await arrive();

    const start = screen.getByRole("link", { name: /Start with a name and a picture/ });
    expect(start).toHaveAttribute("href", "/creators-hub/character/new");
  });

  it("is not asked to make a category first", async () => {
    await arrive();

    // The old screen. A category is a decision about work that does not exist
    // yet, and it was the only thing on offer.
    expect(
      screen.queryByText(/Start with a category for each comic, book or project/)
    ).not.toBeInTheDocument();
  });

  it("is told what it actually takes, which is two things", async () => {
    await arrive();
    expect(screen.getByText(/A name and a picture is all it takes/)).toBeInTheDocument();
    expect(screen.getByText(/link to share/)).toBeInTheDocument();
  });

  it("can still organise by project if that is how they think", async () => {
    await arrive();
    expect(screen.getByRole("button", { name: /Add Category/ })).toBeInTheDocument();
  });
});
