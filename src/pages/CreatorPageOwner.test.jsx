import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// The way back into the hub, on the page a creator shares.
//
// This button said "Visit Profile" and went to /discover, so anybody who
// pressed it landed on the site's character list. Worse than useless: it
// made this page look like a preview of some fuller profile elsewhere, when
// it is the only public page a creator has. It belongs to the person whose
// page it is, and to nobody else.

const auth = { user: null };
vi.mock("../data/AuthContext.jsx", () => ({ useAuth: () => auth }));
vi.mock("../data/pageMeta", () => ({ usePageMeta: () => {} }));
vi.mock("../components/SubscribeButton.jsx", () => ({ default: () => null }));
vi.mock("../components/ReportCreator.jsx", () => ({ default: () => null }));
vi.mock("../components/JoinPrompt.jsx", () => ({
  default: () => null,
  useJoinPrompt: () => ({ ask: () => {}, asking: false, close: () => {} }),
}));
vi.mock("../data/api", () => ({ api: { get: vi.fn() } }));

const { api } = await import("../data/api");
const { default: CreatorPage } = await import("./CreatorPage.jsx");

const page = {
  creator: {
    username: "@Heartline",
    name: "Heartline Comics",
    bio: "CEO of Heartline Comics",
    avatarUrl: null,
    bannerUrl: null,
  },
  characters: [],
  highlights: [],
};

const show = () =>
  render(
    <MemoryRouter initialEntries={["/creator/Heartline"]}>
      <Routes>
        <Route path="/creator/:username" element={<CreatorPage />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = null;
  api.get.mockResolvedValue(page);
});

describe("the way back to the hub", () => {
  it("is not offered to a visitor", async () => {
    show();
    await screen.findByText("Heartline Comics");
    expect(screen.queryByRole("link", { name: /Visit Profile/ })).not.toBeInTheDocument();
  });

  it("takes the creator to their hub, not to the character list", async () => {
    auth.user = { username: "@Heartline" };
    show();
    await screen.findByText("Heartline Comics");
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Visit Profile/ })).toHaveAttribute(
        "href",
        "/creators-hub"
      )
    );
  });

  it("knows the handle however it was typed", async () => {
    // Stored with an @ and in whatever capitals somebody used; the same
    // account can arrive here by any spelling of it.
    auth.user = { username: "heartline" };
    show();
    await screen.findByText("Heartline Comics");
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Visit Profile/ })).toBeInTheDocument()
    );
  });

  it("is not shown to a different creator", async () => {
    auth.user = { username: "@Vtgshadowscribe" };
    show();
    await screen.findByText("Heartline Comics");
    expect(screen.queryByRole("link", { name: /Visit Profile/ })).not.toBeInTheDocument();
  });
});

// The public page is the hub as a visitor sees it, so characters sit under
// the categories the creator filed them in rather than in one flat grid.
describe("characters grouped by category", () => {
  const grouped = {
    creator: { username: "@Vtgshadowscribe", name: "Ola Oriola", bio: "", avatarUrl: null, bannerUrl: null },
    categories: [
      { id: "c1", name: "The Vantaverse", position: 0 },
      { id: "c2", name: "Side stories", position: 1 },
    ],
    characters: [
      { id: "ch1", name: "Urokojin", slug: "urokojin", categoryId: "c1", coverUrl: null, tagline: "" },
      { id: "ch2", name: "Atlas Veyron", slug: "atlas-veyron", categoryId: "c1", coverUrl: null, tagline: "" },
      { id: "ch3", name: "A one off", slug: "a-one-off", categoryId: "c2", coverUrl: null, tagline: "" },
    ],
    highlights: [],
  };

  const open = () =>
    render(
      <MemoryRouter initialEntries={["/creator/Vtgshadowscribe"]}>
        <Routes>
          <Route path="/creator/:username" element={<CreatorPage />} />
        </Routes>
      </MemoryRouter>
    );

  it("names each group and puts the right characters in it", async () => {
    api.get.mockResolvedValue(grouped);
    open();
    await screen.findByText("Ola Oriola");

    const first = await screen.findByRole("region", { name: "The Vantaverse" });
    expect(within(first).getByRole("link", { name: /Urokojin/ })).toBeInTheDocument();
    expect(within(first).getByRole("link", { name: /Atlas Veyron/ })).toBeInTheDocument();
    expect(within(first).queryByRole("link", { name: /A one off/ })).not.toBeInTheDocument();

    const second = screen.getByRole("region", { name: "Side stories" });
    expect(within(second).getByRole("link", { name: /A one off/ })).toBeInTheDocument();
  });

  // A category can be deleted while its characters live on, and the API may
  // send none at all. Either way nothing may vanish off the page.
  it("still shows a character whose category is gone", async () => {
    api.get.mockResolvedValue({
      ...grouped,
      categories: [],
      characters: [{ id: "ch9", name: "Orphan", slug: "orphan", categoryId: null, coverUrl: null, tagline: "" }],
    });
    open();
    await screen.findByText("Ola Oriola");
    expect(await screen.findByRole("link", { name: /Orphan/ })).toBeInTheDocument();
  });

  // The hub shows the handle under the name; this page did not, so the page
  // somebody shares never said who it belonged to in a searchable form.
  it("shows the handle under the name", async () => {
    api.get.mockResolvedValue(grouped);
    open();
    expect(await screen.findByText("@Vtgshadowscribe")).toBeInTheDocument();
  });
});
