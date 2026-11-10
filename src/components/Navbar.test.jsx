import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";

describe("Navbar", () => {
  it("renders the VantaOrigin logo link", () => {
    render(<Navbar />, { wrapper: MemoryRouter });
    expect(screen.getByLabelText("VantaOrigin home")).toHaveAttribute("href", "/");
  });

  it("navigates around the current product", () => {
    render(<Navbar />, { wrapper: MemoryRouter });
    ["Explore characters", "Creators’ Hub", "Marketplace", "Community", "Blog"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Creators’ Hub" })).toHaveAttribute("href", "/creators-hub");
    // Reachable without an account: it was a dashboard link only, so neither a
    // reader nor anything following links could get to it.
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
  });

  it("offers a way in and a way to start, rather than one door for both", () => {
    // It said "Create your page", which is what the site wanted rather than
    // what the visitor wanted, and somebody who already had an account had
    // to work out that it was also the way back in.
    render(<Navbar />, { wrapper: MemoryRouter });

    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
    expect(screen.queryByRole("link", { name: "Create your page" })).not.toBeInTheDocument();
  });
});
