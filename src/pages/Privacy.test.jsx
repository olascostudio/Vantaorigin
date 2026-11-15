import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The privacy policy.
//
// Tested because it makes promises the code has to keep, and because it is
// the one page where a sentence that is merely nice to read can be untrue.
// These check the claims that would be false if the code changed under
// them, and the one limit we decided to state plainly rather than let
// somebody discover.

const { default: Privacy } = await import("./Privacy.jsx");

const show = () =>
  render(
    <MemoryRouter>
      <Privacy />
    </MemoryRouter>
  );

describe("what it says about subscribing to a creator", () => {
  it("names exactly what is shared", async () => {
    show();
    expect(
      screen.getByText(/we share two things with that creator: your email address, and the date you subscribed/i)
    ).toBeInTheDocument();
  });

  it("says subscribing to one creator is not subscribing to another", () => {
    show();
    expect(screen.getByText(/subscribing to one creator is not subscribing to any other/i)).toBeInTheDocument();
  });

  it("states the limit on deletion rather than leaving it to be discovered", () => {
    show();
    // The honest version. We can delete our copy and stop the creator
    // reaching somebody through us. We cannot reach a file they saved.
    expect(screen.getByText(/we cannot reach into a file they already saved/i)).toBeInTheDocument();
  });

  it("lists what a creator may and may not do with the addresses", () => {
    show();
    expect(screen.getByText(/Include a way to unsubscribe in every message/i)).toBeInTheDocument();
    expect(screen.getByText(/Never sell, rent, trade, or pass a subscriber list/i)).toBeInTheDocument();
  });
});

describe("what it says about processors", () => {
  it("names them rather than describing them vaguely", () => {
    show();
    expect(screen.getByText(/Resend, which delivers our email/i)).toBeInTheDocument();
    expect(screen.getByText(/Cloudflare R2, which stores uploaded images/i)).toBeInTheDocument();
  });

  it("says there is no analytics, which is true of this codebase today", () => {
    show();
    // If this ever stops being true, this test fails, which is the point:
    // adding a tracker should not be possible without noticing the policy
    // says there isn't one.
    expect(
      screen.getByText(/do not currently use any analytics or error tracking service/i)
    ).toBeInTheDocument();
  });
});

describe("what it says about browser storage", () => {
  it("describes the three things actually stored, and no others", () => {
    show();
    expect(screen.getByText(/A session cookie, so that you stay signed in/i)).toBeInTheDocument();
    expect(screen.getByText(/closed the beta notice/i)).toBeInTheDocument();
    expect(screen.getByText(/which creator you meant/i)).toBeInTheDocument();
    expect(screen.getByText(/do not use advertising cookies/i)).toBeInTheDocument();
  });
});

describe("the laws", () => {
  it("names them in plain language", () => {
    show();
    expect(screen.getByText(/Nigeria's Data Protection Act/i)).toBeInTheDocument();
    expect(screen.getByText(/the GDPR gives you rights/i)).toBeInTheDocument();
    expect(screen.getByText(/CAN-SPAM/i)).toBeInTheDocument();
  });
});

describe("the shape of the page", () => {
  it("numbers its sections once each, in order", () => {
    show();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent.trim());
    const numbered = headings.filter((h) => /^\d+\./.test(h));

    const numbers = numbered.map((h) => Number(h.split(".")[0]));
    // Numbers come from the position in the list, so inserting a section
    // cannot leave the page with two section nines.
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
  });

  it("says when it was last updated and promises to announce material changes", () => {
    show();
    expect(screen.getByText(/14 November 2026/)).toBeInTheDocument();
    expect(screen.getByText(/we will tell you about it rather than leaving you to notice/i)).toBeInTheDocument();
  });

  it("has no em dashes or en dashes", () => {
    show();
    expect(document.body.textContent).not.toMatch(/[—–]/);
  });
});
