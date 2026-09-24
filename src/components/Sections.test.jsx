import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Realms from "./Realms";
import CommunityWorlds from "./CommunityWorlds";
import HowItWorks from "./HowItWorks";
import CharacterShowcase from "./CharacterShowcase";
import ShareLink from "./ShareLink";
import Features from "./Features";
import FinalCta from "./FinalCta";
import Footer from "./Footer";

const renderPage = (ui) => render(ui, { wrapper: MemoryRouter });

describe("Realms", () => {
  it("presents example creator Realms, not communities to join", () => {
    renderPage(<Realms />);
    expect(screen.getByRole("heading", { name: "Create Your Realm" })).toBeInTheDocument();
    expect(screen.getByText(/Your Realm is your personal space for your characters/i)).toBeInTheDocument();

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(4);
    cards.forEach((card) => {
      expect(within(card).getByRole("link", { name: "View Realm" })).toBeInTheDocument();
    });

    // membership numbers were invented, so they should be gone
    expect(screen.queryByText(/members/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open" })).not.toBeInTheDocument();
  });
});

describe("CommunityWorlds", () => {
  it("lists creator Realms with their character counts", () => {
    renderPage(<CommunityWorlds />);
    expect(screen.getByRole("heading", { name: "Explore Creator Realms" })).toBeInTheDocument();
    expect(screen.getAllByTestId("realm-card")).toHaveLength(4);
    expect(screen.getByText("12 Characters")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /View Realm/ })).toHaveLength(4);
  });

  it("scrolls the carousel one card at a time", () => {
    renderPage(<CommunityWorlds />);
    const track = screen.getAllByTestId("realm-card")[0].parentElement;
    track.scrollBy = vi.fn();

    fireEvent.click(screen.getByRole("button", { name: "Next realms" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous realms" }));

    expect(track.scrollBy).toHaveBeenNthCalledWith(1, { left: 530, behavior: "smooth" });
    expect(track.scrollBy).toHaveBeenNthCalledWith(2, { left: -530, behavior: "smooth" });
  });
});

describe("HowItWorks", () => {
  it("walks through create, add, organize, share", () => {
    renderPage(<HowItWorks />);
    expect(screen.getByRole("heading", { name: "How Your Realm Works" })).toBeInTheDocument();
    const steps = within(screen.getByRole("list")).getAllByRole("heading");
    expect(steps.map((step) => step.textContent)).toEqual([
      "Create Your Realm",
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
  it("shows the public Realm link", () => {
    renderPage(<ShareLink />);
    expect(screen.getByRole("heading", { name: "One Link For Your Characters" })).toBeInTheDocument();
    expect(screen.getByText(/vantaorigin\.com\/realm\//)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Claim your link/i })).toHaveAttribute("href", "/auth");
  });
});

describe("Features", () => {
  it("lists the product features rather than worldbuilding promises", () => {
    renderPage(<Features />);
    expect(
      screen.getByRole("heading", { name: "Everything You Need To Showcase Your Characters" })
    ).toBeInTheDocument();
    ["Character Profiles", "Your Realm", "One Shareable Link", "Easy Character Management"].forEach(
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
      screen.getByRole("heading", { name: "Your Characters. Your Realm. One Link." })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Your Realm" })).toHaveAttribute("href", "/auth");
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
