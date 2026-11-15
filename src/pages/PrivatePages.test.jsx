import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Pages that should never be a search result.
//
// None of these set any meta of their own, so they inherited the site
// default from index.html, which says "index, follow". Harmless while none
// of them is prerendered, because a crawler gets the same empty shell from
// every one. The reason to fix it is the day that stops being true: the
// tag would already be wrong and nobody would be looking at it.
//
// In their own file rather than App.test.jsx, which renders App without a
// provider on purpose. These pages ask who is signed in, so they need one.

vi.mock("../data/AuthContext.jsx", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { id: "u1", username: "@creator" }, loading: false }),
}));

// An admin, so the admin page itself renders. With a non admin,
// RequireAdmin shows its own not found screen and the page under test
// never mounts, which would make this pass for the wrong reason.
vi.mock("../data/admin", async () => {
  const actual = await vi.importActual("../data/admin");
  return { ...actual, amIAdmin: vi.fn(async () => true), loadOverview: vi.fn(async () => ({})) };
});

const { default: App } = await import("../App.jsx");

const at = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

const robots = () => document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null;

describe("private pages ask not to be indexed", () => {
  for (const path of [
    "/signin",
    "/signup",
    "/signup/verify",
    "/forgot-password",
    "/auth",
    "/settings",
    "/creators-hub",
    "/creators-hub/subscribers",
    "/admin",
  ]) {
    it(`${path}`, async () => {
      at(path);
      await waitFor(() => expect(robots()).toMatch(/noindex/));
    });
  }
});

describe("public pages do not", () => {
  for (const path of ["/about", "/help", "/privacy"]) {
    it(`${path} stays findable`, async () => {
      at(path);

      // Absent rather than set to "index": a page that says nothing is
      // indexable already, and the tag is added only where it is meant.
      await new Promise((r) => setTimeout(r, 60));
      expect(robots()).toBeNull();
    });
  }
});
