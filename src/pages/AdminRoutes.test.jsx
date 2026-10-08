import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Who can open an admin screen, tested through the routes themselves.
//
// The blog editor shipped behind RequireAuth alone, which only asks whether
// somebody is signed in. Any creator with an account could open it, type a
// whole article and find that nothing saved, because the API was refusing
// every request behind it. These tests are about the ordinary creator who
// wanders in, not about keeping an attacker out: the API is what does that.

vi.mock("../data/admin", async () => {
  const actual = await vi.importActual("../data/admin");
  return { ...actual, amIAdmin: vi.fn(async () => false) };
});

// Signed in, as an ordinary creator.
vi.mock("../data/AuthContext.jsx", () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { id: "u1", username: "@creator" }, loading: false }),
}));

const { amIAdmin } = await import("../data/admin");
const { default: App } = await import("../App.jsx");

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

const ADMIN_PATHS = ["/admin", "/admin/blog/new", "/admin/blog/some-id"];

describe("Admin screens, opened by somebody who is not an admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    amIAdmin.mockResolvedValue(false);
  });

  for (const path of ADMIN_PATHS) {
    it(`turns an ordinary creator away from ${path}`, async () => {
      renderAt(path);
      expect(await screen.findByText("Page not found")).toBeInTheDocument();
    });
  }

  it("never shows the editor to somebody who could not save from it", async () => {
    renderAt("/admin/blog/new");
    await screen.findByText("Page not found");

    expect(screen.queryByLabelText("Post title")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
    expect(screen.queryByText(/SEO & search appearance/)).not.toBeInTheDocument();
  });

  it("asks the API before showing any of them", async () => {
    renderAt("/admin/blog/new");
    await screen.findByText("Page not found");
    expect(amIAdmin).toHaveBeenCalled();
  });
});
