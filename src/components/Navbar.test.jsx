import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "./Navbar";

describe("Navbar", () => {
  it("renders the VantaOrigin logo link", () => {
    render(<Navbar />, { wrapper: MemoryRouter });
    expect(screen.getByLabelText("VantaOrigin home")).toHaveAttribute("href", "/");
  });

  it("renders all primary nav links", () => {
    render(<Navbar />, { wrapper: MemoryRouter });
    ["Discover", "Creators’ Hub", "Marketplace", "Community"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
  });

  it("renders the Join VantaOrigin CTA", () => {
    render(<Navbar />, { wrapper: MemoryRouter });
    expect(screen.getByRole("link", { name: "Join VantaOrigin" })).toBeInTheDocument();
  });
});
