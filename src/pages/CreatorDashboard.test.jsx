import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// A creator's own subscribers.
//
// The access control lives on the server and is tested there, with two
// accounts. What is worth holding still here is what the screen does with
// the answer: that it never claims a download holds people who left, that
// the empty state gives somebody something to do, and that a creator
// watching their list shrink can see that as plainly as they see it grow.

vi.mock("../data/AuthContext", () => ({ useAuth: () => ({ user: { username: "@artist" } }) }));

vi.mock("../data/creatorDashboard", () => ({
  loadOverview: vi.fn(),
  loadSubscribers: vi.fn(),
  loadActivity: vi.fn(),
  loadInterest: vi.fn(),
  registerInterest: vi.fn(),
  loadCreatorTerms: vi.fn(),
  acceptCreatorTerms: vi.fn(),
  subscribersFileUrl: () => "http://api.test/me/creator/subscribers.csv",
}));

const {
  loadOverview,
  loadSubscribers,
  loadActivity,
  loadInterest,
  registerInterest,
  acceptCreatorTerms,
} = await import("../data/creatorDashboard");
const { default: CreatorDashboard } = await import("./CreatorDashboard.jsx");

const someone = (email, status = "subscribed") => ({
  id: email,
  email,
  status,
  since: "2026-11-01T10:00:00Z",
  unsubscribedAt: status === "unsubscribed" ? "2026-11-05T10:00:00Z" : null,
});

const show = () =>
  render(
    <MemoryRouter>
      <CreatorDashboard />
    </MemoryRouter>
  );

const openTab = async (name) => {
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(`^${name}`) }));
};

beforeEach(() => {
  vi.clearAllMocks();
  loadOverview.mockResolvedValue({
    total: 2,
    thisWeek: 1,
    unsubscribed: 1,
    growth: [
      { week: "2026-11-02T00:00:00Z", value: 1 },
      { week: "2026-11-09T00:00:00Z", value: 1 },
    ],
  });
  loadSubscribers.mockResolvedValue({
    subscribers: [someone("a@readers.test"), someone("b@readers.test", "unsubscribed")],
    page: 1,
    pages: 1,
    total: 2,
  });
  loadActivity.mockResolvedValue({
    activity: [
      { id: "1", email: "a@readers.test", kind: "subscribed", at: "2026-11-10T10:00:00Z" },
      { id: "2", email: "b@readers.test", kind: "unsubscribed", at: "2026-11-11T10:00:00Z" },
    ],
  });
  loadInterest.mockResolvedValue({ features: [] });
  registerInterest.mockResolvedValue({ ok: true });
});

describe("overview", () => {
  it("shows what grew and what shrank", async () => {
    show();

    // "Subscribers" is the heading, a tab and a figure label, so the
    // figure is found by its number rather than by a word three things share.
    expect(await screen.findByText("New this week")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Subscribers" })).toBeInTheDocument();
    // Shown rather than quietly left out: a creator watching their list
    // shrink deserves to see it.
    expect(screen.getByText("Unsubscribed")).toBeInTheDocument();
  });

  it("asks not to be indexed, being a page of other people's addresses", async () => {
    show();
    await screen.findByText("New this week");

    await waitFor(() =>
      expect(document.querySelector('meta[name="robots"]')?.content).toMatch(/noindex/)
    );
  });

  it("says plainly there is nothing to chart rather than drawing an empty box", async () => {
    loadOverview.mockResolvedValue({ total: 0, thisWeek: 0, unsubscribed: 0, growth: [] });
    show();

    expect(await screen.findByText(/nothing to chart yet/i)).toBeInTheDocument();
  });
});

describe("the subscriber list", () => {
  it("shows who stayed and who left, and says the file is only the stayers", async () => {
    show();
    await openTab("Subscribers");

    expect(await screen.findByText("a@readers.test")).toBeInTheDocument();
    expect(screen.getByText("b@readers.test")).toBeInTheDocument();
    // The promise the export actually keeps.
    expect(screen.getByText(/file holds subscribed people only/i)).toBeInTheDocument();
  });

  it("the download is a plain link, so the session cookie travels with it", async () => {
    show();
    await openTab("Subscribers");

    const link = await screen.findByRole("link", { name: /download csv/i });
    expect(link).toHaveAttribute("href", "http://api.test/me/creator/subscribers.csv");
  });

  it("searching asks the server rather than filtering what is on screen", async () => {
    show();
    await openTab("Subscribers");
    await screen.findByText("a@readers.test");

    fireEvent.change(screen.getByLabelText(/search an address/i), {
      target: { value: "wanted" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    // Otherwise a search would only ever look at the current page.
    await waitFor(() =>
      expect(loadSubscribers).toHaveBeenCalledWith({ q: "wanted", page: 1 })
    );
  });

  it("pages only when there is more than one page", async () => {
    show();
    await openTab("Subscribers");
    await screen.findByText("a@readers.test");

    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
  });

  it("offers paging when there is more, and asks for the next page", async () => {
    loadSubscribers.mockResolvedValue({
      subscribers: [someone("a@readers.test")],
      page: 1,
      pages: 3,
      total: 60,
    });
    show();
    await openTab("Subscribers");

    fireEvent.click(await screen.findByRole("button", { name: /next/i }));

    await waitFor(() =>
      expect(loadSubscribers).toHaveBeenLastCalledWith({ q: "", page: 2 })
    );
  });

  it("an empty list gives somebody something to do", async () => {
    loadSubscribers.mockResolvedValue({ subscribers: [], page: 1, pages: 1, total: 0 });
    show();
    await openTab("Subscribers");

    expect(
      await screen.findByText("No subscribers yet. Share your profile link to get your first one.")
    ).toBeInTheDocument();
    // With the link itself on screen, so it works even where the clipboard
    // is refused.
    expect(screen.getByText(/\/creator\/artist$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
  });

  it("a search that matches nothing is not mistaken for an empty list", async () => {
    show();
    await openTab("Subscribers");
    await screen.findByText("a@readers.test");

    loadSubscribers.mockResolvedValue({ subscribers: [], page: 1, pages: 1, total: 0 });
    fireEvent.change(screen.getByLabelText(/search an address/i), { target: { value: "zzz" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    // "No subscribers yet" would be a lie told to somebody who has plenty.
    expect(await screen.findByText(/nothing matching that/i)).toBeInTheDocument();
    expect(screen.queryByText(/no subscribers yet/i)).not.toBeInTheDocument();
  });
});

describe("activity", () => {
  it("shows both directions", async () => {
    show();
    await openTab("Activity");

    // Not by role "list": the navbar has one of its own.
    expect(await screen.findByText("a@readers.test")).toBeInTheDocument();
    expect(screen.getByText("b@readers.test")).toBeInTheDocument();
    expect(screen.getByText("Subscribed")).toBeInTheDocument();
    expect(screen.getByText("Unsubscribed")).toBeInTheDocument();
  });
});

describe("the locked tab", () => {
  it("is visible, marked, and records interest once", async () => {
    show();
    await openTab("Editor");

    expect(await screen.findByText("Coming soon")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /notify me/i }));

    await waitFor(() => expect(registerInterest).toHaveBeenCalledWith("editor"));
    const after = await screen.findByRole("button", { name: /we will tell you/i });
    expect(after).toBeDisabled();
  });

  it("remembers somebody who already asked", async () => {
    loadInterest.mockResolvedValue({ features: ["editor"] });
    show();
    await openTab("Editor");

    expect(await screen.findByRole("button", { name: /we will tell you/i })).toBeDisabled();
    expect(registerInterest).not.toHaveBeenCalled();
  });
});

describe("the copy", () => {
  it("tells a creator what they may do with these addresses", async () => {
    show();
    await screen.findByText("New this week");

    expect(screen.getByText(/only write to them about that/i)).toBeInTheDocument();
    expect(screen.getByText(/never sell or/i)).toBeInTheDocument();
  });

  it("has no em dashes or en dashes", async () => {
    show();
    await screen.findByText("New this week");

    expect(document.body.textContent).not.toMatch(/[—–]/);
  });
});

// The rules a creator agrees to before being shown anybody's address.
//
// The gate is enforced on the server, and tested there with the data. What
// matters here is that the screen reacts to the refusal rather than asking
// separately: the refusal is the authority, so a screen that decided for
// itself could drift out of step with it.
describe("the creator terms gate", () => {
  const refused = () => {
    const error = new Error("Agree to the rules for subscriber information first.");
    error.data = {
      needsCreatorTerms: true,
      version: "creator-2026-11-15",
      summary: "Never sell a subscriber list.",
      url: "/privacy",
    };
    return error;
  };

  it("asks instead of showing the list, when the server refuses", async () => {
    loadSubscribers.mockRejectedValue(refused());
    show();
    await openTab("Subscribers");

    expect(await screen.findByText(/Before you see anybody/i)).toBeInTheDocument();
    expect(screen.getByText(/Never sell, rent, trade, or pass a subscriber list/i)).toBeInTheDocument();
    // No addresses anywhere, which is the point of the refusal.
    expect(screen.queryByText("a@readers.test")).not.toBeInTheDocument();
  });

  it("will not let somebody agree without ticking the box", async () => {
    loadSubscribers.mockRejectedValue(refused());
    show();
    await openTab("Subscribers");

    const agree = await screen.findByRole("button", { name: /agree and see my subscribers/i });
    expect(agree).toBeDisabled();

    fireEvent.click(agree);
    expect(acceptCreatorTerms).not.toHaveBeenCalled();
  });

  it("names the version it is recording, not just the current one", async () => {
    loadSubscribers.mockRejectedValue(refused());
    show();
    await openTab("Subscribers");

    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /agree and see my subscribers/i }));

    // Sent back with the press, so nobody is recorded as agreeing to a
    // document that changed while the page was open.
    await waitFor(() =>
      expect(acceptCreatorTerms).toHaveBeenCalledWith("creator-2026-11-15")
    );
  });

  it("shows the list once they have agreed", async () => {
    loadSubscribers.mockRejectedValueOnce(refused());
    show();
    await openTab("Subscribers");
    await screen.findByText(/Before you see anybody/i);

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /agree and see my subscribers/i }));

    expect(await screen.findByText("a@readers.test")).toBeInTheDocument();
  });

  it("guards the activity list too, since it names people as well", async () => {
    loadActivity.mockRejectedValue(refused());
    show();
    await openTab("Activity");

    expect(await screen.findByText(/Before you see anybody/i)).toBeInTheDocument();
  });

  it("says the record is kept, with the version", async () => {
    loadSubscribers.mockRejectedValue(refused());
    show();
    await openTab("Subscribers");

    expect(await screen.findByText(/creator-2026-11-15/)).toBeInTheDocument();
  });
});
