import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// The embed snippet, rendered for real.
//
// A missing import is invisible to the build and to the type of test that
// only checks a button exists. It becomes a blank screen the moment somebody
// presses the thing. This opens the panel, which is the only way to find out.

vi.mock("../data/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: "u1", username: "@maker" }, loading: false }),
}));

// The real blank character as the base, so this test is about the embed
// panel and not about keeping a hand written character shape in step with
// the one the app actually uses.
vi.mock("../data/character", async () => {
  const actual = await vi.importActual("../data/character");
  return {
    ...actual,
    likeCharacter: vi.fn(),
    loadCharacter: vi.fn(),
    loadPublicCharacter: vi.fn(async () => ({
      ...actual.DEFAULT_CHARACTER,
      id: "c1",
      slug: "urokojin",
      alias: "Urokojin",
      universe: "The Vantaverse",
      tagline: "The Thunder Judge",
      visibility: "public",
      creator: "@maker",
    })),
  };
});

const { default: CharacterView } = await import("./CharacterView.jsx");

// Rendered through a real route: the page reads the slug from the URL, and
// without one it falls back to the sample character and never asks the API.
const open = async () => {
  render(
    <MemoryRouter initialEntries={["/character/urokojin"]}>
      <Routes>
        <Route path="/character/:slug" element={<CharacterView />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByRole("button", { name: /Embed/ });
};

describe("Putting a character on somebody else's site", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers the snippet on a published character", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /Embed/ }));

    expect(await screen.findByText(/Put this card on your site/)).toBeInTheDocument();
    // The snippet itself, pointing at the API rather than at the app.
    expect(screen.getByText(/<iframe src=/)).toHaveTextContent("/embed/character/urokojin");
  });

  it("copies the snippet", async () => {
    const written = [];
    Object.assign(navigator, { clipboard: { writeText: async (text) => written.push(text) } });

    await open();
    fireEvent.click(screen.getByRole("button", { name: /Embed/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Copy the snippet" }));

    await waitFor(() => expect(written).toHaveLength(1));
    expect(written[0]).toMatch(/^<iframe src="[^"]*\/embed\/character\/urokojin"/);
    expect(written[0]).toMatch(/loading="lazy"/);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("offers a light version for a page that is not dark", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /Embed/ }));
    fireEvent.click(await screen.findByRole("button", { name: "light" }));

    expect(screen.getByText(/<iframe src=/)).toHaveTextContent("theme=light");
  });
});
