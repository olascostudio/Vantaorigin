import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Something said to everybody at once.
//
// This is the screen where a wrong press reaches people who cannot refuse
// it, two of the five reasons reach somebody who has reported us as spam,
// and none of it can be taken back. So the tests are about the friction
// rather than the feature: that the consequence of a choice is shown where
// the choice is made, and that nothing goes out without a number being
// agreed to.

vi.mock("../data/announcements", () => ({
  loadAnnouncements: vi.fn(),
  startAnnouncement: vi.fn(),
  saveAnnouncement: vi.fn(),
  discardAnnouncement: vi.fn(),
  previewAnnouncement: vi.fn(),
  audienceFor: vi.fn(),
  testAnnouncement: vi.fn(),
  sendAnnouncement: vi.fn(),
}));

const api = await import("../data/announcements");
const { default: AnnouncementsPanel } = await import("./AnnouncementsPanel.jsx");

const DRAFT = {
  id: "b1",
  subject: "We are changing the terms",
  blocks: [{ type: "text", text: "From 1 December." }],
  reasonCategory: null,
  termsVersion: null,
  status: "draft",
};

const show = () => {
  const onTrouble = vi.fn();
  render(<AnnouncementsPanel onTrouble={onTrouble} />);
  return onTrouble;
};

const openEditor = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /write one/i }));
  await screen.findByLabelText(/why this is being sent/i);
};

const choose = (value) =>
  fireEvent.change(screen.getByLabelText(/why this is being sent/i), { target: { value } });

beforeEach(() => {
  vi.clearAllMocks();
  api.loadAnnouncements.mockResolvedValue({
    broadcasts: [],
    reasons: [],
    termsVersions: [{ version: "2026-11-14" }],
  });
  api.startAnnouncement.mockResolvedValue(DRAFT);
  api.saveAnnouncement.mockResolvedValue(DRAFT);
  api.previewAnnouncement.mockResolvedValue({ html: "<p>hi</p>", reachesSuppressed: false, problem: null });
  api.audienceFor.mockResolvedValue({ total: 15, waiting: 15 });
  api.sendAnnouncement.mockResolvedValue({ ok: true, sending: true });
  api.testAnnouncement.mockResolvedValue({ ok: true, to: "boss@vantaorigin.test" });
});

describe("choosing why", () => {
  it("says who a terms change reaches, where the choice is made", async () => {
    show();
    await openEditor();
    choose("terms_change");

    expect(
      await screen.findByText(/Reaches everybody, including people who reported us as spam/i)
    ).toBeInTheDocument();
  });

  it("says that a maintenance notice does not reach them", async () => {
    show();
    await openEditor();
    choose("downtime");

    expect(
      await screen.findByText(/Does not reach people who reported us as spam/i)
    ).toBeInTheDocument();
  });

  it("asks which version only for a terms change", async () => {
    show();
    await openEditor();

    choose("downtime");
    expect(screen.queryByLabelText(/which version/i)).not.toBeInTheDocument();

    choose("terms_change");
    // Without it the banner has no version to ask anybody to accept.
    expect(await screen.findByLabelText(/which version/i)).toBeInTheDocument();
  });
});

describe("sending", () => {
  it("asks before it goes, naming the number and saying it cannot be undone", async () => {
    show();
    await openEditor();
    choose("security_notice");
    fireEvent.click(screen.getByRole("button", { name: /send to everybody/i }));

    expect(await screen.findByText(/Send to 15 people\?/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be taken back once it starts/i)).toBeInTheDocument();
    // Nothing has gone anywhere yet.
    expect(api.sendAnnouncement).not.toHaveBeenCalled();
  });

  it("sends the number back with the press, so a stale one is refused", async () => {
    show();
    await openEditor();
    choose("downtime");
    fireEvent.click(screen.getByRole("button", { name: /send to everybody/i }));
    fireEvent.click(await screen.findByRole("button", { name: /yes, send it/i }));

    await waitFor(() => expect(api.sendAnnouncement).toHaveBeenCalledWith("b1", 15));
  });

  it("backing out sends nothing", async () => {
    show();
    await openEditor();
    choose("downtime");
    fireEvent.click(screen.getByRole("button", { name: /send to everybody/i }));
    fireEvent.click(await screen.findByRole("button", { name: /not yet/i }));

    await waitFor(() => expect(screen.queryByText(/Send to 15 people/i)).not.toBeInTheDocument());
    expect(api.sendAnnouncement).not.toHaveBeenCalled();
  });

  it("will not open the confirmation when the server says it is not ready", async () => {
    api.previewAnnouncement.mockResolvedValue({
      html: "",
      reachesSuppressed: false,
      problem: "Choose why this is being sent.",
    });
    const onTrouble = show();
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: /send to everybody/i }));

    await waitFor(() => expect(onTrouble).toHaveBeenCalledWith("Choose why this is being sent."));
    expect(screen.queryByText(/Send to 15 people/i)).not.toBeInTheDocument();
  });

  it("when the number moved, it says the new one instead of sending", async () => {
    const refused = new Error("The number of people changed. It is now 16. Check and send again.");
    refused.data = { audienceCount: 16 };
    api.sendAnnouncement.mockRejectedValue(refused);

    const onTrouble = show();
    await openEditor();
    choose("downtime");
    fireEvent.click(screen.getByRole("button", { name: /send to everybody/i }));
    fireEvent.click(await screen.findByRole("button", { name: /yes, send it/i }));

    await waitFor(() => expect(onTrouble).toHaveBeenCalledWith(refused.message));
    // The screen catches up rather than keeping a number the server refused.
    expect(await screen.findByText(/Send to 16 people\?/i)).toBeInTheDocument();
  });
});

describe("what was already sent", () => {
  it("shows the audit and says it cannot be changed", async () => {
    api.loadAnnouncements.mockResolvedValue({
      broadcasts: [
        {
          ...DRAFT,
          status: "sent",
          reasonCategory: "security_notice",
          sentAt: "2026-11-15T10:00:00Z",
          sentByEmail: "boss@vantaorigin.test",
          createdByEmail: "boss@vantaorigin.test",
          audienceCount: 15,
          sentCount: 14,
          skippedCount: 1,
          failedCount: 0,
        },
      ],
      reasons: [],
      termsVersions: [],
    });
    show();

    expect(await screen.findByText(/cannot be edited or removed/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Sent by boss@vantaorigin\.test to 15 people\. 14 delivered, 1 not sent on purpose\./i)
    ).toBeInTheDocument();
  });
});

describe("the copy", () => {
  it("has no em dashes or en dashes", async () => {
    show();
    await openEditor();
    choose("terms_change");
    await screen.findByLabelText(/which version/i);

    expect(document.body.textContent).not.toMatch(/[—–]/);
  });
});
