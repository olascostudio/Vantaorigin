import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

// Addresses nothing is sent to, and the way back.
//
// The thing worth holding still is that lifting one cannot happen by
// accident or without a reason: being on this list means not even a
// password reset arrives, so a careless press costs somebody their account.

vi.mock("../data/admin", () => ({
  loadSuppressions: vi.fn(),
  liftSuppression: vi.fn(),
  loadWebhookEvents: vi.fn(),
}));

const { loadSuppressions, liftSuppression, loadWebhookEvents } = await import("../data/admin");
const { default: SuppressionPanel } = await import("./SuppressionPanel.jsx");

const BLOCKED = {
  total: 1,
  suppressions: [
    {
      id: "row-1",
      email: "locked-out@example.com",
      reason: "hard_bounce",
      createdAt: "2026-11-01T10:00:00Z",
      bounceType: "Permanent",
      bounceSubType: "General",
      diagnostic: "smtp; 550 5.1.1 user unknown",
    },
  ],
  lifts: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  loadSuppressions.mockResolvedValue(BLOCKED);
  liftSuppression.mockResolvedValue({ ok: true });
  loadWebhookEvents.mockResolvedValue({ everReceived: false, total: 0, events: [], thisWeek: [] });
});

const open = async () => {
  render(<SuppressionPanel onTrouble={() => {}} />);
  await screen.findByText("locked-out@example.com");
};

describe("the blocked list", () => {
  it("shows why, and what the sender actually said", async () => {
    await open();

    expect(screen.getByText(/bounced permanently/i)).toBeInTheDocument();
    // The diagnostic line, not our summary: an admin deciding whether a
    // permanent bounce was really permanent needs the sender's own words.
    expect(screen.getByText(/550 5\.1\.1 user unknown/)).toBeInTheDocument();
    expect(screen.getByText(/Permanent \/ General/)).toBeInTheDocument();
  });

  it("will not lift one without a reason", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /write to them again/i }));

    const lift = screen.getByRole("button", { name: /^lift it$/i });
    expect(lift).toBeDisabled();

    fireEvent.click(lift);
    expect(liftSuppression).not.toHaveBeenCalled();
  });

  it("lifts it once a reason is given, and sends the reason along", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /write to them again/i }));

    fireEvent.change(screen.getByLabelText(/why are you lifting it/i), {
      target: { value: "their server was misconfigured" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^lift it$/i }));

    await waitFor(() =>
      expect(liftSuppression).toHaveBeenCalledWith(
        "locked-out@example.com",
        "their server was misconfigured"
      )
    );
    // Scoped to the status line: the confirmation question says something
    // very similar, and matching either would not prove the lift landed.
    expect(await screen.findByRole("status")).toHaveTextContent(
      /writing to locked-out@example.com again/i
    );
  });

  it("takes one press to open the question, not to do the thing", async () => {
    await open();
    // Nothing happens on the first press but a question.
    fireEvent.click(screen.getByRole("button", { name: /write to them again/i }));
    expect(liftSuppression).not.toHaveBeenCalled();
    expect(screen.getByText(/starts writing to .* again/i)).toBeInTheDocument();
  });

  it("cancelling leaves it blocked", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /write to them again/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(liftSuppression).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^lift it$/i })).not.toBeInTheDocument();
  });

  it("an empty list is said to be the good state, not an error", async () => {
    loadSuppressions.mockResolvedValue({ total: 0, suppressions: [], lifts: [] });
    render(<SuppressionPanel onTrouble={() => {}} />);

    await screen.findByText(/nothing is blocked/i);
  });

  it("shows what was lifted before, since lifting destroys the record of the block", async () => {
    loadSuppressions.mockResolvedValue({
      total: 0,
      suppressions: [],
      lifts: [
        {
          id: "lift-1",
          email: "forgiven@example.com",
          wasReason: "complaint",
          liftedBy: "boss@vantaorigin.test",
          liftedAt: "2026-11-10T12:00:00Z",
          note: "they wrote in",
        },
      ],
    });

    render(<SuppressionPanel onTrouble={() => {}} />);
    const history = within(await screen.findByRole("list"));

    expect(history.getByText("forgiven@example.com")).toBeInTheDocument();
    expect(history.getByText(/boss@vantaorigin\.test/)).toBeInTheDocument();
    expect(history.getByText(/they wrote in/)).toBeInTheDocument();
  });

  it("a failure to load is handed up rather than swallowed", async () => {
    const onTrouble = vi.fn();
    loadSuppressions.mockRejectedValue(new Error("Can't reach VantaOrigin."));

    render(<SuppressionPanel onTrouble={onTrouble} />);

    await waitFor(() => expect(onTrouble).toHaveBeenCalledWith("Can't reach VantaOrigin."));
  });
});

// Whether the sender is telling us anything at all.
//
// This exists for one moment: setting the webhook up. At that moment the
// blocked list below is empty, so a panel that led with "nothing is
// blocked, that is the good state" would look reassuring whether or not a
// single event had ever arrived.
describe("what the sender tells us", () => {
  it("says plainly when nothing has ever arrived, and what that costs", async () => {
    loadWebhookEvents.mockResolvedValue({ everReceived: false, total: 0, events: [], thisWeek: [] });
    render(<SuppressionPanel onTrouble={() => {}} />);

    expect(await screen.findByText(/Nothing has ever arrived/i)).toBeInTheDocument();
    // Not just "no data": the consequence, which is the part somebody
    // needs to understand.
    expect(screen.getByText(/still writing to addresses that no longer exist/i)).toBeInTheDocument();
    // And how to fix it, without sending anybody to find the docs.
    expect(screen.getByText(/api\.vantaorigin\.com\/webhooks\/resend/)).toBeInTheDocument();
    expect(screen.getByText(/RESEND_WEBHOOK_SECRET/)).toBeInTheDocument();
  });

  it("shows what has come in once it is working", async () => {
    loadWebhookEvents.mockResolvedValue({
      everReceived: true,
      total: 42,
      lastAt: "2026-11-16T09:00:00Z",
      thisWeek: [
        { type: "email.delivered", value: 40 },
        { type: "email.bounced", value: 2 },
      ],
      events: [
        {
          id: "e1",
          type: "email.bounced",
          email: "gone@example.com",
          at: "2026-11-16T09:00:00Z",
          bounceType: "Permanent",
        },
        { id: "e2", type: "email.delivered", email: "fine@example.com", at: "2026-11-16T08:00:00Z", bounceType: null },
      ],
    });
    render(<SuppressionPanel onTrouble={() => {}} />);

    expect(await screen.findByText(/42 in total/)).toBeInTheDocument();
    expect(screen.getByText(/Arrived 40, Bounced 2/)).toBeInTheDocument();
    // The bounce type, because that is what decided whether the address
    // was suppressed.
    expect(screen.getByText(/Bounced \(Permanent\)/)).toBeInTheDocument();
    expect(screen.getByText("gone@example.com")).toBeInTheDocument();
    expect(screen.queryByText(/Nothing has ever arrived/i)).not.toBeInTheDocument();
  });

  it("a failure to load it does not take the blocked list down with it", async () => {
    loadWebhookEvents.mockRejectedValue(new Error("nope"));
    render(<SuppressionPanel onTrouble={() => {}} />);

    // The list is the thing somebody came for; the feed is context.
    expect(await screen.findByText("locked-out@example.com")).toBeInTheDocument();
  });
});
