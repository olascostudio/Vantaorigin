import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Subscribing to a creator.
//
// Pressing this hands somebody's address to another person, which is the
// one thing here nobody can take back. So the tests care most about: the
// consent line being present wherever the press can happen, the button
// never appearing on your own page, and a press made while signed out
// being remembered rather than lost.

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const real = await vi.importActual("react-router-dom");
  return { ...real, useNavigate: () => navigate };
});

let currentUser = null;
vi.mock("../data/AuthContext", () => ({ useAuth: () => ({ user: currentUser }) }));

vi.mock("../data/subscriptions", () => ({
  loadSubscription: vi.fn(),
  subscribeTo: vi.fn(),
  unsubscribeFrom: vi.fn(),
  rememberIntent: vi.fn(),
}));

const { loadSubscription, subscribeTo, unsubscribeFrom, rememberIntent } = await import(
  "../data/subscriptions"
);
const { default: SubscribeButton } = await import("./SubscribeButton.jsx");

const CONSENT = /Your email will be shared with demoartist so they can send you updates\. You can unsubscribe any time\./;

const show = (props = {}) => {
  const onDone = vi.fn();
  render(
    <MemoryRouter initialEntries={["/creator/demoartist"]}>
      <SubscribeButton username="demoartist" creatorName="demoartist" onDone={onDone} {...props} />
    </MemoryRouter>
  );
  return onDone;
};

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = { id: "reader-1", emailVerifiedAt: "2026-01-01T00:00:00Z" };
  loadSubscription.mockResolvedValue({ subscribed: false, own: false, creatorName: "demoartist" });
  subscribeTo.mockResolvedValue({ subscribed: true, creatorName: "demoartist" });
  unsubscribeFrom.mockResolvedValue({ subscribed: false, creatorName: "demoartist" });
});

describe("signed in", () => {
  it("subscribes on one press and says so", async () => {
    const onDone = show();
    fireEvent.click(await screen.findByRole("button", { name: "Subscribe" }));

    await waitFor(() => expect(subscribeTo).toHaveBeenCalledWith("demoartist"));
    expect(await screen.findByText("Subscribed")).toBeInTheDocument();
    expect(onDone).toHaveBeenCalledWith("You’re subscribed to demoartist.");
  });

  it("says what sharing means before the press, not only in a modal", async () => {
    show();
    // Somebody already signed in never sees the modal, so the line has to
    // be on the page itself.
    expect(await screen.findByText(CONSENT)).toBeInTheDocument();
  });

  it("offers a way out once subscribed", async () => {
    loadSubscription.mockResolvedValue({ subscribed: true, own: false, creatorName: "demoartist" });
    const onDone = show();

    fireEvent.click(await screen.findByRole("button", { name: /unsubscribe/i }));

    await waitFor(() => expect(unsubscribeFrom).toHaveBeenCalledWith("demoartist"));
    expect(onDone).toHaveBeenCalledWith("You have unsubscribed from demoartist.");
  });

  it("shows the subscribed state straight away for somebody who already is", async () => {
    loadSubscription.mockResolvedValue({ subscribed: true, own: false, creatorName: "demoartist" });
    show();

    expect(await screen.findByText("Subscribed")).toBeInTheDocument();
    // And does not ask them again.
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
  });

  it("draws nothing until it knows, so the label never flips in front of you", () => {
    loadSubscription.mockReturnValue(new Promise(() => {}));
    show();

    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
    expect(screen.queryByText("Subscribed")).not.toBeInTheDocument();
  });

  it("a failure says so and does not claim to have subscribed", async () => {
    subscribeTo.mockRejectedValue(new Error("network"));
    const onDone = show();

    fireEvent.click(await screen.findByRole("button", { name: "Subscribe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/did not work/i);
    expect(screen.queryByText("Subscribed")).not.toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("an unconfirmed address keeps the intention for after they confirm", async () => {
    const failure = new Error("Confirm your email address first.");
    failure.data = { needsVerification: true };
    subscribeTo.mockRejectedValue(failure);
    show();

    fireEvent.click(await screen.findByRole("button", { name: "Subscribe" }));

    await waitFor(() => expect(rememberIntent).toHaveBeenCalledWith("demoartist"));
    // The API client sends them to the verification screen, so there is
    // nothing for this to complain about.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("on your own page", () => {
  it("there is no button at all", async () => {
    loadSubscription.mockResolvedValue({ subscribed: false, own: true, creatorName: "demoartist" });
    show();

    await waitFor(() => expect(loadSubscription).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Subscribe" })).not.toBeInTheDocument();
    // And no consent line either, since nothing can be shared with yourself.
    expect(screen.queryByText(CONSENT)).not.toBeInTheDocument();
  });
});

describe("signed out", () => {
  beforeEach(() => {
    currentUser = null;
  });

  it("asks them to sign up or sign in rather than failing", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Subscribe" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Subscribe to demoartist");
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    // Nothing was attempted: there is nobody to subscribe yet.
    expect(subscribeTo).not.toHaveBeenCalled();
  });

  it("says what sharing means in the modal too", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Subscribe" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(CONSENT);
  });

  it("remembers the creator before sending them away", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Subscribe" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sign up" }));

    // Remembered first. If it went the other way round a slow navigation
    // would lose the press entirely.
    expect(rememberIntent).toHaveBeenCalledWith("demoartist");
    expect(navigate).toHaveBeenCalledWith("/signup", {
      state: { from: "/creator/demoartist" },
    });
  });

  it("signing in returns them to the page they pressed it on", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Subscribe" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));

    expect(navigate).toHaveBeenCalledWith("/signin", {
      state: { from: "/creator/demoartist" },
    });
  });

  it("can be dismissed without doing anything", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Subscribe" }));
    fireEvent.click(await screen.findByRole("button", { name: /not now/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(rememberIntent).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("escape closes it, because a dialog that traps you is worse than none", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Subscribe" }));
    await screen.findByRole("dialog");

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("the copy", () => {
  it("has no em dashes or en dashes anywhere", async () => {
    currentUser = null;
    show();
    fireEvent.click(await screen.findByRole("button", { name: "Subscribe" }));
    await screen.findByRole("dialog");

    expect(document.body.textContent).not.toMatch(/[—–]/);
  });
});
