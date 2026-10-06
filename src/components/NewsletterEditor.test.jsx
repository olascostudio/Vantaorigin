import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// A letter has three lives -- being written, going out, gone -- and the screen
// has to tell them apart. Saying "sent" while copies are still leaving is not
// a cosmetic slip: it is the difference between waiting and pressing send a
// second time.

const answers = {
  issue: null,
  waiting: { waiting: 4, sending: true },
};

vi.mock("../data/admin", () => ({
  loadIssues: async () => [answers.issue],
  loadIssue: async () => answers.issue,
  startIssue: async () => answers.issue,
  saveIssue: async () => answers.issue,
  discardIssue: async () => ({ ok: true }),
  previewIssue: async () => ({ html: "<p>the letter</p>" }),
  countWaiting: async () => answers.waiting,
  sendIssue: vi.fn(async () => ({ ok: true })),
  loadTemplates: vi.fn(async () => []),
  saveTemplate: vi.fn(async () => ({ id: "t1", name: "Monthly" })),
  forgetTemplate: vi.fn(async () => ({ ok: true })),
  startFromTemplate: vi.fn(async () => ({ id: "letter-2" })),
  sendTestCopy: async () => ({ to: "boss@vantaorigin.test" }),
}));

// An upload we can hold open, to see what happens when one finishes after
// the block it belongs to has been moved.
const upload = { finish: null };
vi.mock("../data/api", () => ({
  api: {
    upload: () => new Promise((resolve) => {
      upload.finish = (url) => resolve({ url });
    }),
  },
}));

const { default: NewsletterLetters } = await import("./NewsletterEditor.jsx");
const { sendIssue, saveTemplate, loadTemplates, startFromTemplate } = await import("../data/admin");

const anIssue = (extra) => ({
  id: "letter-1",
  subject: "Three new characters",
  preheader: "",
  blocks: [{ type: "text", text: "Hello" }],
  status: "draft",
  sentAt: null,
  sentCount: 0,
  failedCount: 0,
  failures: [],
  updatedAt: "2026-09-30T10:00:00.000Z",
  author: "@boss",
  ...extra,
});

const open = async () => {
  render(<NewsletterLetters onTrouble={() => {}} />);
  const button = await screen.findByRole("button", { name: /^(Open|Read it)$/ });
  fireEvent.click(button);
};

beforeEach(() => {
  answers.waiting = { waiting: 4, sending: true };
  vi.clearAllMocks();
});

describe("A letter on its way out", () => {
  it("says it is still going, not that it has gone", async () => {
    answers.issue = anIssue({ status: "sending", sentCount: 12, sentAt: null });
    await open();

    expect(await screen.findByText(/Going out now · 12 sent/)).toBeInTheDocument();
    // The record belongs to a letter that has finished. Claiming it while
    // copies are still leaving reads as "sent to nobody".
    expect(screen.queryByText(/has gone out, so it is kept/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sent — to/)).not.toBeInTheDocument();
  });

  it("offers a way to pick up a send that stopped partway", async () => {
    // Marked as sending, with nobody sending it: what a restart leaves.
    answers.issue = anIssue({ status: "sending", sentCount: 80 });
    answers.waiting = { waiting: 220, sending: false };
    await open();

    expect(await screen.findByText(/This send stopped partway/)).toBeInTheDocument();
    expect(screen.getByText(/80 went out, 220 still to go/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Carry on sending/ }));
    await waitFor(() => expect(sendIssue).toHaveBeenCalledWith("letter-1"));
  });

  it("keeps quiet about stopping while it is really running", async () => {
    answers.issue = anIssue({ status: "sending", sentCount: 3 });
    answers.waiting = { waiting: 9, sending: true };
    await open();

    // Said in the header and again over the progress; both are right.
    expect((await screen.findAllByText(/Going out now/)).length).toBe(2);
    expect(screen.queryByText(/stopped partway/)).not.toBeInTheDocument();
  });
});

describe("A letter that has gone", () => {
  it("shows the record, and nothing to send", async () => {
    answers.issue = anIssue({
      status: "sent",
      sentAt: "2026-09-30T12:00:00.000Z",
      sentCount: 40,
      failedCount: 1,
      failures: [{ email: "bounces@example.com", reason: "that address does not exist" }],
    });
    await open();

    expect(await screen.findByText(/has gone out, so it is kept/)).toBeInTheDocument();
    expect(screen.getByText("bounces@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send it|Carry on sending/ })).not.toBeInTheDocument();
  });
});

describe("A letter still being written", () => {
  it("will not send a test copy of a version that is not saved yet", async () => {
    answers.issue = anIssue();
    await open();

    const test = await screen.findByRole("button", { name: /Send a test copy/ });
    expect(test).toBeEnabled();

    // Typing puts the letter ahead of what the server holds, and the test
    // copy is built from what the server holds.
    fireEvent.change(screen.getByPlaceholderText(/What they see in their inbox/), {
      target: { value: "Three new characters!" },
    });
    await waitFor(() => expect(test).toBeDisabled());
  });
});

describe("A picture still being sent", () => {
  it("lands on the block it was chosen for, even after that block is moved", async () => {
    answers.issue = anIssue({
      blocks: [
        { type: "text", text: "first" },
        { type: "image", url: "", alt: "", href: "" },
      ],
    });
    await open();

    // Choose a file for the picture, which is the second block.
    await screen.findByPlaceholderText(/Paste a picture address/);
    const picker = document.querySelector('input[type="file"]');
    fireEvent.change(picker, {
      target: { files: [new File(["x"], "art.png", { type: "image/png" })] },
    });

    // Move it above the words while the upload is still going.
    const up = await screen.findAllByRole("button", { name: "Move up" });
    fireEvent.click(up[1]);

    // Only now does the upload finish.
    upload.finish("https://pictures.test/art.png");

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/Paste a picture address/)).toHaveValue(
        "https://pictures.test/art.png"
      )
    );
    // And the words it was moved past are untouched -- with the address
    // written by position rather than by block, they would have been
    // overwritten by a picture.
    expect(screen.getByDisplayValue("first")).toBeInTheDocument();
  });
});

describe("Bringing your own email in", () => {
  it("offers a block for code, beside the written ones", async () => {
    answers.issue = anIssue();
    await open();

    expect(await screen.findByRole("button", { name: "Code" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    const box = await screen.findByPlaceholderText(/<table width/);
    expect(box.tagName).toBe("TEXTAREA");
    // Code is read as code, not as prose.
    expect(box.className).toContain("font-mono");
    expect(box).toHaveAttribute("spellcheck", "false");
  });

  it("keeps a letter as a template, and starts the next one from it", async () => {
    answers.issue = anIssue();
    await open();

    fireEvent.click(await screen.findByRole("button", { name: "Save as template" }));
    fireEvent.change(screen.getByPlaceholderText("Call it something"), {
      target: { value: "Monthly" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));

    await waitFor(() => expect(saveTemplate).toHaveBeenCalledWith("Monthly", "letter-1"));
    expect(await screen.findByText(/Kept as "Monthly"/)).toBeInTheDocument();
  });

  it("lists what has been kept, and opens a letter from one", async () => {
    answers.issue = anIssue();
    loadTemplates.mockResolvedValue([{ id: "t1", name: "Monthly", subject: "The monthly one" }]);

    render(<NewsletterLetters onTrouble={() => {}} />);
    await screen.findByText("Or start from");

    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));
    await waitFor(() => expect(startFromTemplate).toHaveBeenCalledWith("t1"));
  });
});
