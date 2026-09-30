import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorPages from "./CreatorPages";
import CommunityWorlds, { byCreator } from "./CommunityWorlds";
import HowItWorks from "./HowItWorks";
import CharacterShowcase from "./CharacterShowcase";
import ShareLink from "./ShareLink";
import Features from "./Features";
import FinalCta from "./FinalCta";
import Footer from "./Footer";

vi.mock("../data/character", () => ({ loadPublicCharacters: vi.fn(async () => []) }));
const { loadPublicCharacters } = await import("../data/character");

const renderPage = (ui) => render(ui, { wrapper: MemoryRouter });

beforeEach(() => {
  loadPublicCharacters.mockReset();
  loadPublicCharacters.mockResolvedValue([]);
});

describe("Creator pages", () => {
  it("shows real characters, each linking to the page it is showing", () => {
    renderPage(<CreatorPages />);
    expect(screen.getByRole("heading", { name: "Create your page" })).toBeInTheDocument();
    expect(screen.getByText(/Your page is your personal space for your characters/i)).toBeInTheDocument();

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(2);

    expect(within(cards[0]).getByRole("heading", { name: "Hope Breaker" })).toBeInTheDocument();
    expect(within(cards[1]).getByRole("heading", { name: "Atlas Veyron" })).toBeInTheDocument();
    cards.forEach((card) => {
      // The artwork is named, not decorative: it is the character.
      expect(within(card).getByRole("img")).toHaveAccessibleName(/Artwork of/);
    });

    // Each character is credited to whoever made it. Hope Breaker belongs to
    // Heartline Comics, not to the person running the site, and putting the
    // wrong name under it would be taking somebody else's work.
    expect(within(cards[0]).getByText("Spif Nation")).toBeInTheDocument();
    expect(within(cards[0]).queryByText("@Vtgshadowscribe")).not.toBeInTheDocument();
    expect(within(cards[1]).getByText("@Vtgshadowscribe")).toBeInTheDocument();

    // A published character opens on its own page. One whose creator has no
    // page here has none to open, and offers none.
    expect(within(cards[1]).getByRole("link", { name: "View page" })).toHaveAttribute(
      "href",
      "/character/atlas-veyron"
    );
    expect(within(cards[0]).queryByRole("link", { name: "View page" })).not.toBeInTheDocument();
    expect(within(cards[0]).getByText("Page coming soon")).toBeInTheDocument();

    // membership numbers were invented, so they should be gone
    expect(screen.queryByText(/members/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open" })).not.toBeInTheDocument();
  });
});

describe("CommunityWorlds", () => {
  // Real creators, read from the site. Nobody appears here who has not
  // published, and the count is what they have actually published.
  // The shape loadPublicCharacters really returns: flattened, with the
  // creator as a handle and the artwork as `cover`.
  const published = [
    {
      id: "1",
      alias: "Atlas Veyron",
      slug: "atlas-veyron",
      universe: "The Vantaverse",
      cover: "https://pictures.test/atlas.webp",
      creator: "@Vtgshadowscribe",
    },
    {
      id: "2",
      alias: "Urokojin",
      slug: "urokojin",
      universe: "The Vantaverse",
      cover: null,
      creator: "@Vtgshadowscribe",
    },
    {
      id: "3",
      alias: "Somebody else's",
      slug: "another",
      universe: "Elsewhere",
      cover: null,
      creator: "@another",
    },
  ];

  it("gathers each creator's published characters into one page", () => {
    const pages = byCreator(published);

    expect(pages.map((page) => page.username)).toEqual(["@Vtgshadowscribe", "@another"]);
    expect(pages[0].characters).toHaveLength(2);
    // The first character with artwork stands for the page.
    expect(pages[0].cover).toBe("https://pictures.test/atlas.webp");
    // What they write about, in their own words.
    expect(pages[0].tags).toBe("The Vantaverse");
  });

  it("does not list one universe twice for being typed twice", () => {
    const [page] = byCreator([
      { ...published[0], universe: "The Vantaverse" },
      { ...published[1], universe: "The vantaverse" },
    ]);
    // Kept in the spelling it was first given.
    expect(page.tags).toBe("The Vantaverse");
  });

  it("counts one character as a character, not as characters", () => {
    expect(byCreator([published[2]])[0].characters).toHaveLength(1);
  });

  it("waits rather than inventing anybody", async () => {
    let answer;
    loadPublicCharacters.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
    renderPage(<CommunityWorlds />);

    // Nothing claimed before the site has said who is there.
    expect(screen.queryAllByTestId("creator-card")).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Explore creator pages" })).toBeInTheDocument();

    await act(async () => {
      answer(published);
    });

    const cards = screen.getAllByTestId("creator-card");
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText("@Vtgshadowscribe")).toBeInTheDocument();
    expect(within(cards[0]).getByText("2 characters")).toBeInTheDocument();
    expect(within(cards[1]).getByText("1 character")).toBeInTheDocument();
    // Each card opens the page it is showing.
    expect(within(cards[0]).getByRole("link", { name: /View page/ })).toHaveAttribute(
      "href",
      "/creator/Vtgshadowscribe"
    );
  });

  it("says nothing at all when nobody has published", async () => {
    loadPublicCharacters.mockResolvedValue([]);
    const { container } = renderPage(<CommunityWorlds />);
    await act(async () => {});

    // Better an absent section than a row of empty promises.
    expect(container.querySelector("#explore")).toBeNull();
  });
});

describe("HowItWorks", () => {
  it("walks through create, add, organize, share", () => {
    renderPage(<HowItWorks />);
    expect(screen.getByRole("heading", { name: "How It Works" })).toBeInTheDocument();
    const steps = within(screen.getByRole("list")).getAllByRole("heading");
    expect(steps.map((step) => step.textContent)).toEqual([
      "Create your page",
      "Add Your Characters",
      "Organize Your Characters",
      "Share Your Link",
    ]);
  });
});

describe("CharacterShowcase", () => {
  it("shows what a character profile holds", () => {
    renderPage(<CharacterShowcase />);
    expect(screen.getByRole("heading", { name: "Give Every Character A Home" })).toBeInTheDocument();
    expect(screen.getByText("Core Ability")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See a character profile/i })).toHaveAttribute(
      "href",
      "/character"
    );
  });
});

describe("ShareLink", () => {
  it("shows the public page link", () => {
    renderPage(<ShareLink />);
    expect(screen.getByRole("heading", { name: "One Link For Your Characters" })).toBeInTheDocument();
    expect(screen.getByText(/vantaorigin\.com\/creator\//)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Claim your link/i })).toHaveAttribute("href", "/auth");
  });
});

describe("Features", () => {
  it("lists the product features rather than worldbuilding promises", () => {
    renderPage(<Features />);
    expect(
      screen.getByRole("heading", { name: "Everything You Need To Showcase Your Characters" })
    ).toBeInTheDocument();
    ["Character Profiles", "Your page", "One Shareable Link", "Easy Character Management"].forEach(
      (name) => {
        expect(screen.getByRole("heading", { name })).toBeInTheDocument();
      }
    );
    expect(screen.getByRole("heading", { name: "Discover Creators" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore Creators" })).toHaveAttribute("href", "/discover");
  });
});

describe("FinalCta", () => {
  it("closes with the product promise", () => {
    renderPage(<FinalCta />);
    expect(
      screen.getByRole("heading", { name: "Your characters. One link." })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create your page" })).toHaveAttribute("href", "/auth");
  });
});

describe("Footer", () => {
  it("renders the link columns", () => {
    renderPage(<Footer />);
    const nav = screen.getByRole("navigation", { name: "Footer" });
    ["Platform", "Community", "Support", "Socials"].forEach((name) => {
      expect(within(nav).getByRole("heading", { name })).toBeInTheDocument();
    });
    expect(within(nav).getByRole("link", { name: "Privacy Policy" })).toBeInTheDocument();
  });

  it("renders a newsletter form that does not navigate on submit", () => {
    renderPage(<Footer />);
    const input = screen.getByRole("textbox", { name: "Email address" });
    expect(input).toHaveAttribute("type", "email");

    const submit = screen.getByRole("button", { name: "Get Creator Updates" });
    const event = new Event("submit", { bubbles: true, cancelable: true });
    submit.form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
