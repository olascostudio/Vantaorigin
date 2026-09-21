import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import Realms from "./Realms";
import CommunityWorlds from "./CommunityWorlds";
import HowItWorks from "./HowItWorks";
import Features from "./Features";
import CreateTogether from "./CreateTogether";
import Footer from "./Footer";

describe("Realms", () => {
  it("renders the four realm cards with an Open action each", () => {
    render(<Realms />);
    expect(screen.getByRole("heading", { name: "Create Your Realm" })).toBeInTheDocument();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(4);
    ["Obaalu", "Iyanu", "Urukojin", "Eganon"].forEach((realm, i) => {
      expect(within(cards[i]).getByRole("heading", { name: new RegExp(realm) })).toBeInTheDocument();
      expect(within(cards[i]).getByRole("link", { name: "Open" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "See More" })).toBeInTheDocument();
  });
});

describe("CommunityWorlds", () => {
  it("renders four world cards", () => {
    render(<CommunityWorlds />);
    expect(screen.getAllByTestId("world-card")).toHaveLength(4);
    expect(screen.getByRole("heading", { name: /Iyanu-Etere/ })).toBeInTheDocument();
  });

  it("scrolls the carousel one card at a time", () => {
    render(<CommunityWorlds />);
    const track = screen.getAllByTestId("world-card")[0].parentElement;
    track.scrollBy = vi.fn();

    fireEvent.click(screen.getByRole("button", { name: "Next worlds" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous worlds" }));

    expect(track.scrollBy).toHaveBeenNthCalledWith(1, { left: 530, behavior: "smooth" });
    expect(track.scrollBy).toHaveBeenNthCalledWith(2, { left: -530, behavior: "smooth" });
  });
});

describe("HowItWorks", () => {
  it("lists the four steps in order", () => {
    render(<HowItWorks />);
    const steps = within(screen.getByRole("list")).getAllByRole("heading");
    expect(steps.map((step) => step.textContent)).toEqual([
      "Create",
      "Publish",
      "Build a Community",
      "Grow Your Legacy",
    ]);
  });
});

describe("Features", () => {
  it("renders the builder cards and the featured creators panel", () => {
    render(<Features />);
    ["Character Builder", "World Builder", "Story Builder"].forEach((name) => {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Featured Creators" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Join Creators" })).toBeInTheDocument();
    expect(screen.getAllByTestId("creator-tile")).toHaveLength(19);
  });
});

describe("CreateTogether", () => {
  it("renders the call to action", () => {
    render(<CreateTogether />);
    expect(screen.getByRole("heading", { name: "Create Together" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Community" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Join Discord" })).toBeInTheDocument();
  });
});

describe("Footer", () => {
  it("renders the link columns", () => {
    render(<Footer />);
    const nav = screen.getByRole("navigation", { name: "Footer" });
    ["Platform", "Community", "Support", "Socials"].forEach((name) => {
      expect(within(nav).getByRole("heading", { name })).toBeInTheDocument();
    });
    expect(within(nav).getByRole("link", { name: "Privacy Policy" })).toBeInTheDocument();
  });

  it("renders a newsletter form that does not navigate on submit", () => {
    render(<Footer />);
    const input = screen.getByRole("textbox", { name: "Email address" });
    expect(input).toHaveAttribute("type", "email");

    const submit = screen.getByRole("button", { name: "Send Email" });
    const event = new Event("submit", { bubbles: true, cancelable: true });
    submit.form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
