import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The gate in front of every admin screen.
//
// The blog editor shipped without one: any signed-in creator could open it
// and meet an editor that looked ordinary and silently could not save,
// because the API was refusing every request behind it. What a person is not
// allowed to use, they should not be shown.

vi.mock("../data/admin", () => ({ amIAdmin: vi.fn() }));
vi.mock("./DashboardNav", () => ({ default: () => <nav /> }));

const { amIAdmin } = await import("../data/admin");
const { default: RequireAdmin } = await import("./RequireAdmin.jsx");

const show = () =>
  render(
    <RequireAdmin>
      <p>The dashboard</p>
    </RequireAdmin>,
    { wrapper: MemoryRouter }
  );

describe("Getting into an admin screen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lets an admin through", async () => {
    amIAdmin.mockResolvedValue(true);
    show();
    expect(await screen.findByText("The dashboard")).toBeInTheDocument();
  });

  it("turns anybody else away, without saying what is behind it", async () => {
    amIAdmin.mockResolvedValue(false);
    show();

    expect(await screen.findByText("Page not found")).toBeInTheDocument();
    expect(screen.queryByText("The dashboard")).not.toBeInTheDocument();
    // The API answers 404 rather than 403 on purpose. The screen agrees, so
    // the pair of them do not between them confirm the page exists.
    expect(screen.queryByText(/not allowed|permission|admin/i)).not.toBeInTheDocument();
  });

  it("shows nothing of the screen while it is still asking", async () => {
    let answer;
    amIAdmin.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    show();

    // The moment that matters: not yet refused, and not yet admitted.
    expect(screen.queryByText("The dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument();

    answer(true);
    await waitFor(() => expect(screen.getByText("The dashboard")).toBeInTheDocument());
  });

  it("asks the API rather than trusting the browser", async () => {
    amIAdmin.mockResolvedValue(true);
    show();
    await screen.findByText("The dashboard");
    expect(amIAdmin).toHaveBeenCalled();
  });
});
