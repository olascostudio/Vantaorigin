import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The dashboard, rendered for real.
//
// It went blank in front of the person who runs the site, because a hook was
// used in one of its panels and never imported -- a ReferenceError at render
// time, which a passing build says nothing about. Every tab is opened here so
// that a panel which cannot render is a failing test rather than an empty
// screen.

vi.mock("../data/admin", () => ({
  amIAdmin: vi.fn(async () => true),
  loadOverview: vi.fn(async () => ({
    creators: { total: 5, verified: 3, thisWeek: 1 },
    characters: { total: 2, public: 2, thisWeek: 0 },
    posts: 0,
    likes: 4,
    openReports: 0,
    newsletter: { subscribed: 7, thisWeek: 2 },
  })),
  loadReports: vi.fn(async () => []),
  loadCreators: vi.fn(async () => []),
  loadFunnel: vi.fn(async () => ({
    days: 30,
    recent: { joined: 20, verified: 12, made: 7, published: 3 },
    allTime: { joined: 31, verified: 20, made: 11, published: 5 },
  })),
  loadTopCharacters: vi.fn(async () => []),
  settleReport: vi.fn(),
  loadSubscribers: vi.fn(async () => ({
    rows: [
      {
        id: "s1",
        email: "reader@example.com",
        status: "subscribed",
        source: "footer",
        hasAccount: false,
        createdAt: "2026-09-30T10:00:00.000Z",
        unsubscribedAt: null,
      },
    ],
    matching: 1,
    counts: { subscribed: 7, unsubscribed: 1, total: 8 },
    limit: 100,
    offset: 0,
  })),
  setSubscriberStatus: vi.fn(),
  forgetSubscriber: vi.fn(),
  subscribersFileUrl: () => "https://api.test/admin/newsletter.csv",
  resendWelcome: vi.fn(),
  shrinkProgress: vi.fn(async () => ({ running: false, shrunk: 0, skipped: 0, saved: 0 })),
  startShrinking: vi.fn(),
  loadIssues: vi.fn(async () => []),
  loadIssue: vi.fn(),
  startIssue: vi.fn(),
  saveIssue: vi.fn(),
  discardIssue: vi.fn(),
  previewIssue: vi.fn(),
  countWaiting: vi.fn(),
  sendIssue: vi.fn(),
  loadTemplates: vi.fn(async () => []),
  saveTemplate: vi.fn(async () => ({ id: "t1", name: "Monthly" })),
  forgetTemplate: vi.fn(async () => ({ ok: true })),
  startFromTemplate: vi.fn(async () => ({ id: "letter-2" })),
  sendTestCopy: vi.fn(),
}));

vi.mock("../data/api", () => ({ api: { upload: vi.fn() }, API_BASE: "https://api.test" }));
vi.mock("../data/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { username: "@boss", emailVerifiedAt: "2026-01-01" }, loading: false }),
}));

const { default: Admin } = await import("./Admin.jsx");

const open = async () => {
  render(<Admin />, { wrapper: MemoryRouter });
  // The page asks whether this account may see it before showing anything.
  await act(async () => {});
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("The dashboard", () => {
  it("opens on the numbers", async () => {
    await open();
    expect(screen.getByRole("heading", { name: "Site activity" })).toBeInTheDocument();
    // Said twice on purpose: once as a number, once as a tab.
    expect(screen.getAllByText("Newsletter").length).toBeGreaterThan(1);
    expect(screen.getByText("2 this week")).toBeInTheDocument();
  });

  it("says how far people get, and where most of them stop", async () => {
    await open();

    expect(screen.getByText(/How far people get, these last 30 days/)).toBeInTheDocument();
    expect(screen.getByText("Made an account")).toBeInTheDocument();
    expect(screen.getByText("Published one")).toBeInTheDocument();
    // 3 of 20 is 15%.
    expect(screen.getByText("15%")).toBeInTheDocument();
    expect(screen.getByText(/5 of 31 have ever published/)).toBeInTheDocument();

    // The widest fall is 20 -> 12, which is the one worth looking at first:
    // eight people, against five and four at the later steps.
    expect(screen.getByText(/Most are lost between/)).toBeInTheDocument();
    expect(screen.getByText("made an account")).toBeInTheDocument();
    expect(screen.getByText("confirmed their email")).toBeInTheDocument();
    expect(screen.getByText(/8 people/)).toBeInTheDocument();
  });

  it("renders every tab without falling over", async () => {
    await open();

    for (const name of ["Reports", "Creators", "Characters", "Newsletter", "Letters"]) {
      const tab = screen.getByRole("button", { name: new RegExp(`^${name}`) });
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        fireEvent.click(tab);
      });
      // Still here, with its own heading, rather than an empty screen.
      expect(screen.getByRole("heading", { name: "Site activity" })).toBeInTheDocument();
    }
  });

  it("shows the newsletter panel's own tools", async () => {
    await open();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Newsletter/ }));
    });

    expect(screen.getByText("7 on the list")).toBeInTheDocument();
    expect(screen.getByText("reader@example.com")).toBeInTheDocument();
    // Moved below the table: they are occasional jobs, and they used to sit
    // between the count and the search, in front of the list itself.
    expect(screen.getByText("Send the welcome letter again")).toBeInTheDocument();
    expect(screen.getByText("Shrink the stored pictures")).toBeInTheDocument();
    expect(screen.getByText("Other jobs")).toBeInTheDocument();

    // The two halves of one thing, side by side.
    expect(screen.getByRole("link", { name: "Download CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import addresses" })).toBeInTheDocument();
  });

  it("opens a way to put addresses back on the list", async () => {
    // Erasing a row leaves nothing behind. Until this existed the list could
    // be carried out and never carried back in, so erasing the wrong person
    // was final.
    await open();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Newsletter/ }));
    });

    expect(screen.queryByLabelText("Addresses to add")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Import addresses" }));
    });

    expect(screen.getByLabelText("Addresses to add")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add them" })).toBeInTheDocument();
    // Said plainly, because importing a list that then emails everybody is
    // the thing somebody would be afraid of.
    expect(screen.getByText(/Nobody is emailed/i)).toBeInTheDocument();
  });
});
