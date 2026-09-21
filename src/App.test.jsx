import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

describe("App routing", () => {
  it("renders every landing page section in design order at /", () => {
    const { container } = renderAt("/");
    const ids = [...container.querySelectorAll("section[id]")].map((section) => section.id);
    expect(ids).toEqual([
      "realms",
      "explore",
      "how-it-works",
      "characters",
      "share",
      "features",
      "start",
    ]);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders the auth screen at /auth", () => {
    renderAt("/auth");
    expect(
      screen.getByRole("heading", { name: /Welcome to VantaOrigin - Where Stories Awaken/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("does not reference remote Figma asset URLs anywhere", () => {
    const { container } = renderAt("/");
    expect(container.innerHTML).not.toMatch(/figma\.com/);
  });
});
