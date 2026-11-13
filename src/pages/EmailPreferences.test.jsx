import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Choosing what you hear about.
//
// The things worth holding still here are the ones that turn a reader into a
// spam complaint: the page has to open from an email with nobody signed in,
// each of the three exits has to be one press, and nothing may claim to have
// saved when it did not.

vi.mock("../data/api", () => {
  class ApiError extends Error {
    constructor(message, status, data = {}) {
      super(message);
      this.status = status;
      this.data = data;
    }
  }
  return {
    ApiError,
    api: { get: vi.fn(), patch: vi.fn() },
  };
});

const { api, ApiError } = await import("../data/api");
const { default: EmailPreferences } = await import("./EmailPreferences.jsx");

const SUBSCRIBED = {
  email: "reader@example.com",
  hasAccount: true,
  marketing: true,
  marketingStatus: "subscribed",
  pausedUntil: null,
  categories: {
    comments: true,
    character_activity: true,
    battle_challenges: true,
    affiliate_earnings: true,
  },
  pauseDays: 30,
};

const show = (at = "/newsletter/preferences?token=abc123") =>
  render(
    <MemoryRouter initialEntries={[at]}>
      <EmailPreferences />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(SUBSCRIBED);
  api.patch.mockImplementation(async (_path, patch) => ({ ...SUBSCRIBED, ...patch }));
});

describe("email preferences", () => {
  it("opens from the token in an email, with nobody signed in", async () => {
    show();

    await screen.findByText("reader@example.com");
    // The token goes along, or the page is somebody else's.
    expect(api.get).toHaveBeenCalledWith("/newsletter/preferences?token=abc123");
  });

  it("works signed in, with no token at all", async () => {
    show("/newsletter/preferences");

    await screen.findByText("reader@example.com");
    expect(api.get).toHaveBeenCalledWith("/newsletter/preferences");
  });

  it("offers all three ways out, each as one press", async () => {
    show();
    await screen.findByText("reader@example.com");

    expect(screen.getByRole("button", { name: /pause for 30 days/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /just the newsletter/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unsubscribe from everything/i })).toBeInTheDocument();
  });

  it("pausing asks for a pause, not an unsubscribe", async () => {
    api.patch.mockResolvedValue({
      ...SUBSCRIBED,
      pausedUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
    });

    show();
    await screen.findByText("reader@example.com");
    fireEvent.click(screen.getByRole("button", { name: /pause for 30 days/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/newsletter/preferences?token=abc123", {
        choose: "pause",
      })
    );
    // And the page says so, rather than looking like nothing happened.
    await screen.findByText("Paused");
  });

  it("hearing less keeps the newsletter", async () => {
    show();
    await screen.findByText("reader@example.com");
    fireEvent.click(screen.getByRole("button", { name: /just the newsletter/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/newsletter/preferences?token=abc123", {
        choose: "fewer",
      })
    );
  });

  it("leaving says so plainly, with no guilt and no second question", async () => {
    api.patch.mockResolvedValue({ ...SUBSCRIBED, marketing: false, marketingStatus: "unsubscribed" });

    show();
    await screen.findByText("reader@example.com");
    fireEvent.click(screen.getByRole("button", { name: /unsubscribe from everything/i }));

    await screen.findByText("You are off the list");
    expect(api.patch).toHaveBeenCalledTimes(1);
    // Nothing that argues with the decision.
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
  });

  it("a single category goes off on its own", async () => {
    show();
    await screen.findByText("reader@example.com");

    fireEvent.click(screen.getByRole("switch", { name: /replies and comments/i }));

    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/newsletter/preferences?token=abc123", {
        comments: false,
      })
    );
  });

  it("says what is not optional, so nobody expects to switch it off", async () => {
    show();
    await screen.findByText("reader@example.com");

    expect(screen.getByText(/password resets/i)).toBeInTheDocument();
    expect(screen.getByText(/security notices/i)).toBeInTheDocument();
  });

  it("a link that matches nothing explains itself instead of showing a broken page", async () => {
    api.get.mockRejectedValue(new ApiError("We could not find that", 404));

    show();

    await screen.findByText(/could not match this link/i);
    // Scoped to the page itself: the navbar has a Sign in of its own.
    expect(
      within(screen.getByRole("main")).getByRole("link", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it("a save that fails says so, and does not claim to have saved", async () => {
    api.patch.mockRejectedValue(new Error("network"));

    show();
    await screen.findByText("reader@example.com");
    fireEvent.click(screen.getByRole("button", { name: /pause for 30 days/i }));

    await screen.findByText(/did not save/i);
    expect(screen.queryByText(/^Paused for/)).not.toBeInTheDocument();
  });

  it("somebody on the list with no account is only shown the newsletter", async () => {
    api.get.mockResolvedValue({
      email: "passerby@example.com",
      hasAccount: false,
      marketing: true,
      marketingStatus: "subscribed",
      pausedUntil: null,
      categories: null,
      pauseDays: 30,
    });

    show();
    await screen.findByText("passerby@example.com");

    expect(screen.queryByText("About your account")).not.toBeInTheDocument();
    // No per-event mail to thin out, so that exit is not offered either.
    expect(screen.queryByRole("button", { name: /just the newsletter/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unsubscribe from everything/i })).toBeInTheDocument();
  });

  it("asks search engines to keep out", async () => {
    show();
    await screen.findByText("reader@example.com");

    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toMatch(
        /noindex/
      );
    });
  });
});

// Added after a probe caught it: a save that failed after one that worked
// left the green confirmation from the first sitting above the red failure
// from the second, so the page said both at once.
describe("a save that fails after one that worked", () => {
  it("drops the old confirmation instead of showing both", async () => {
    render(
      <MemoryRouter initialEntries={["/newsletter/preferences?token=abc123"]}>
        <EmailPreferences />
      </MemoryRouter>
    );
    await screen.findByText("reader@example.com");

    // One that works.
    fireEvent.click(screen.getByRole("switch", { name: /replies and comments/i }));
    await screen.findByText("Switched off.");

    // Then one that does not.
    api.patch.mockRejectedValueOnce(new Error("network"));
    fireEvent.click(screen.getByRole("switch", { name: /^Earnings/ }));

    await screen.findByText(/did not save/i);
    expect(screen.queryByText("Switched off.")).not.toBeInTheDocument();
  });
});
