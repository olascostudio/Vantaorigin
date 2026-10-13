import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The bar at the top of every public page, seen by somebody who has no
// account.
//
// The blog, discover, a character and the marketplace all wear this bar, and
// all four are open to anyone. It had one face: a profile bubble reading "A"
// that led to a sign-in screen, and no sign-in or sign-up link anywhere on
// the page. So a reader arriving from a search result or a shared link, which
// is the entire point of having those pages open, had nothing to do next.

vi.mock("../data/admin", () => ({ amIAdmin: vi.fn(async () => false) }));

const auth = { user: null, loading: false, signOut: vi.fn() };
vi.mock("../data/AuthContext.jsx", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => auth,
}));

const { default: DashboardNav } = await import("./DashboardNav.jsx");

const show = (active) =>
  render(<DashboardNav active={active} />, { wrapper: MemoryRouter });

describe("The top bar, with nobody signed in", () => {
  it("offers a way in and a way to start", () => {
    auth.user = null;
    show("Blog");

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
    expect(screen.getByRole("link", { name: "Create your page" })).toHaveAttribute("href", "/auth");
  });

  it("does not show a profile that belongs to nobody", () => {
    auth.user = null;
    show("Blog");

    // It read "A", the first letter of the fallback name, and led to a screen
    // that turns you straight back to sign-in.
    expect(screen.queryByLabelText("Your profile and settings")).not.toBeInTheDocument();
  });

  it("sends the logo to what the site is, not into a workspace", () => {
    auth.user = null;
    show("Blog");

    expect(screen.getByLabelText("VantaOrigin home")).toHaveAttribute("href", "/");
  });

  it("still reaches the blog, which was a signed-in link only", () => {
    auth.user = null;
    show("Blog");

    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
  });
});

describe("The top bar, signed in", () => {
  it("keeps the profile and the workspace", () => {
    auth.user = { id: "u1", username: "@ola", firstName: "Ola" };
    show("Blog");

    expect(screen.getByLabelText("Your profile and settings")).toHaveAttribute("href", "/settings");
    expect(screen.getByLabelText("VantaOrigin home")).toHaveAttribute("href", "/discover");
    expect(screen.queryByRole("link", { name: "Create your page" })).not.toBeInTheDocument();
  });
});
