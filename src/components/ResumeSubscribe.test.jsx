import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Finishing a subscribe that somebody started before they had an account.
//
// Every one of these is here because the end to end run caught something a
// mocked test had missed. The first version read `emailVerifiedAt`, which
// exists on the server and never reaches the browser, so the resume never
// fired; the unit test passed because the test itself invented that field.
// So these use the shape the API actually sends.

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const real = await vi.importActual("react-router-dom");
  return { ...real, useNavigate: () => navigate };
});

let currentUser = null;
vi.mock("../data/AuthContext", () => ({ useAuth: () => ({ user: currentUser }) }));

vi.mock("../data/subscriptions", () => ({
  subscribeTo: vi.fn(),
  readIntent: vi.fn(),
  forgetIntent: vi.fn(),
}));

const { subscribeTo, readIntent, forgetIntent } = await import("../data/subscriptions");
const { default: ResumeSubscribe } = await import("./ResumeSubscribe.jsx");

// Exactly what GET /auth/me returns: a boolean named emailVerified, and no
// timestamp anywhere.
const signedIn = (emailVerified = true) => ({
  id: "reader-1",
  email: "reader@example.com",
  username: "@reader",
  emailVerified,
});

const show = () =>
  render(
    <MemoryRouter>
      <ResumeSubscribe />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = signedIn();
  readIntent.mockReturnValue("demoartist");
  subscribeTo.mockResolvedValue({ subscribed: true, creatorName: "demoartist" });
});

describe("when somebody comes back", () => {
  it("finishes the subscription and returns them to the page they started on", async () => {
    show();

    await waitFor(() => expect(subscribeTo).toHaveBeenCalledWith("demoartist"));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/creator/demoartist", {
        replace: true,
        state: { subscribed: "demoartist" },
      })
    );
    expect(forgetIntent).toHaveBeenCalled();
  });

  it("reads the field the API actually sends", async () => {
    // The whole bug: a user object carrying only `emailVerified` must be
    // enough. If this component ever goes back to looking for a timestamp,
    // this fails.
    currentUser = { id: "reader-1", emailVerified: true };
    show();

    await waitFor(() => expect(subscribeTo).toHaveBeenCalled());
  });

  it("navigates even though the effect was cleaned up mid request", async () => {
    // React re-runs this effect when the signed in user's identity changes,
    // which happens on the refresh right after verifying. The first run's
    // cleanup used to cancel the navigate, leaving somebody subscribed and
    // standing in their hub with nothing to show for it.
    let finish;
    subscribeTo.mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({ subscribed: true, creatorName: "demoartist" });
      })
    );

    const { unmount } = show();
    await waitFor(() => expect(subscribeTo).toHaveBeenCalled());
    unmount();
    finish();

    await waitFor(() => expect(navigate).toHaveBeenCalled());
  });
});

describe("when it should do nothing", () => {
  it("waits while the address is still unconfirmed", async () => {
    currentUser = signedIn(false);
    show();

    await new Promise((r) => setTimeout(r, 50));
    // An address nobody has confirmed is exactly what this flow must not
    // hand to a creator, so the intention keeps rather than firing.
    expect(subscribeTo).not.toHaveBeenCalled();
    expect(forgetIntent).not.toHaveBeenCalled();
  });

  it("does nothing for somebody who is not signed in", async () => {
    currentUser = null;
    show();

    await new Promise((r) => setTimeout(r, 50));
    expect(subscribeTo).not.toHaveBeenCalled();
  });

  it("does nothing when nobody started anything", async () => {
    readIntent.mockReturnValue(null);
    show();

    await new Promise((r) => setTimeout(r, 50));
    expect(subscribeTo).not.toHaveBeenCalled();
  });

  it("forgets a failed attempt rather than retrying on every page", async () => {
    subscribeTo.mockRejectedValue(new Error("network"));
    show();

    await waitFor(() => expect(forgetIntent).toHaveBeenCalled());
    // The button on the page is a better place to try again than every
    // screen they open for the rest of the session.
    expect(navigate).not.toHaveBeenCalled();
  });
});
