import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The browse page exists because the landing section can only ever hold the
// two characters somebody wrote into it by hand. What matters here is that
// every creator the API returns gets a card, that each card opens that
// creator rather than one of their characters, and that a handle with an @
// in it still makes a working address.

vi.mock("../data/pageMeta", () => ({ usePageMeta: () => {} }));
vi.mock("../components/DashboardNav", () => ({ default: () => null }));
vi.mock("../data/creators", async () => {
  const actual = await vi.importActual("../data/creators");
  return { ...actual, loadPublicCreators: vi.fn() };
});

const { loadPublicCreators, handleOf } = await import("../data/creators");
const { default: Creators } = await import("./Creators.jsx");

const creator = (username, extra = {}) => ({
  username,
  handle: handleOf(username),
  name: extra.name ?? username,
  bio: extra.bio ?? "",
  avatarUrl: extra.avatarUrl ?? null,
  published: extra.published ?? 1,
  characters: extra.characters ?? [{ id: `${username}-1`, alias: "Someone", coverUrl: null }],
});

const show = () => render(<Creators />, { wrapper: MemoryRouter });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Creators", () => {
  it("gives every creator a card that opens their page", async () => {
    loadPublicCreators.mockResolvedValue([
      creator("@Heartline", { name: "Heartline Comics", bio: "CEO of Heartline Comics", published: 1 }),
      creator("@Vtgshadowscribe", { name: "Ola Oriola", published: 2 }),
    ]);
    show();

    const cards = await screen.findAllByRole("article");
    expect(cards).toHaveLength(2);

    // The @ belongs in the name and not in the address.
    expect(within(cards[0]).getByRole("link")).toHaveAttribute("href", "/creator/Heartline");
    expect(within(cards[1]).getByRole("link")).toHaveAttribute("href", "/creator/Vtgshadowscribe");

    expect(screen.getByText("Heartline Comics")).toBeInTheDocument();
    expect(screen.getByText("@Heartline")).toBeInTheDocument();
    expect(screen.getByText("1 character")).toBeInTheDocument();
    expect(screen.getByText("2 characters")).toBeInTheDocument();
  });

  it("does not print a name twice when it is only the handle again", async () => {
    loadPublicCreators.mockResolvedValue([creator("@kingvlad22", { name: "@kingvlad22" })]);
    show();

    await screen.findByRole("article");
    expect(screen.getAllByText("@kingvlad22")).toHaveLength(1);
  });

  it("searches by name, handle and bio", async () => {
    loadPublicCreators.mockResolvedValue([
      creator("@Heartline", { name: "Heartline Comics", bio: "Comics from Lagos" }),
      creator("@Umbra_Adept", { name: "Umbra", bio: "Shadow work" }),
    ]);
    show();
    await screen.findAllByRole("article");

    fireEvent.change(screen.getByPlaceholderText("Search creators..."), {
      target: { value: "shadow" },
    });
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
    expect(screen.getByText("Umbra")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search creators..."), {
      target: { value: "nobody at all" },
    });
    await waitFor(() =>
      expect(screen.getByText(/No creators match/)).toBeInTheDocument()
    );
  });

  it("asks for the first page rather than showing an empty grid", async () => {
    loadPublicCreators.mockResolvedValue([]);
    show();
    expect(
      await screen.findByText(/No creators have published anything yet/)
    ).toBeInTheDocument();
  });

  // A page that fails silently looks the same as a site with nobody on it.
  it("says so when the list cannot be loaded, and does not also claim nobody is here", async () => {
    loadPublicCreators.mockRejectedValue(new Error("offline"));
    show();
    expect(await screen.findByText(/could not load the creators/i)).toBeInTheDocument();
    // The empty list after a failure is an empty list we never received, not
    // a site with nobody on it. Printing both told the reader two different
    // things, one of them false.
    expect(screen.queryByText(/No creators have published anything yet/)).not.toBeInTheDocument();
  });

  // The ring is drawn inside the link, because the card clips to its corners
  // and anything offset outward is cut away.
  it("keeps the focus ring inside the card that clips it", async () => {
    loadPublicCreators.mockResolvedValue([creator("@Heartline", { name: "Heartline Comics" })]);
    show();
    const card = await screen.findByRole("article");
    const link = within(card).getByRole("link");
    expect(link.className).toContain("focus-visible:outline-offset-[-3px]");
    expect(link.className).not.toContain("focus-visible:outline-offset-2");
  });
});
