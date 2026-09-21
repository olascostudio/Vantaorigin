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
    ["Explore", "Characters", "Marketplace", "My Realm"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "My Realm" })).toHaveAttribute("href", "/creators-hub");
  });

  it("renders the Create Your Realm CTA", () => {
    render(<Navbar />, { wrapper: MemoryRouter });
    expect(screen.getByRole("link", { name: "Create Your Realm" })).toHaveAttribute("href", "/auth");
  });
});
