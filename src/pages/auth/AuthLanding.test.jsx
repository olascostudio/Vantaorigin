import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthLanding from "./AuthLanding";

const renderScreen = () => render(<AuthLanding />, { wrapper: MemoryRouter });

describe("AuthLanding", () => {
  it("renders the heading and supporting copy", () => {
    renderScreen();
    expect(
      screen.getByRole("heading", { name: "Welcome to VantaOrigin" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Create your Realm, showcase your characters/i)).toBeInTheDocument();
  });

  it("links Sign Up, Sign In and Back home to their routes", () => {
    renderScreen();
    expect(screen.getByRole("link", { name: "Sign Up" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/signin");
    expect(screen.getByRole("link", { name: /Back home/i })).toHaveAttribute("href", "/");
  });

  it("offers the Google and Apple options and the terms link", () => {
    renderScreen();
    expect(screen.getByRole("button", { name: /Sign up with Google/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign up with Apple/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
  });
});
