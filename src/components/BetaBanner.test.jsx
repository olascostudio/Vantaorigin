import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The beta notice under the navbar.
//
// Most of this is about the things that are easy to get wrong and hard to
// see: a banner already turned off that appears and then vanishes, pushing
// the page down and back; words that move for somebody who asked for less
// movement; a marquee that cannot be stopped long enough to read.

vi.mock("../data/feedback", () => ({ sendFeedback: vi.fn(async () => ({ ok: true })) }));

const { sendFeedback } = await import("../data/feedback");
const { default: BetaBanner } = await import("./BetaBanner.jsx");

const REMEMBERED = "vantaorigin.beta-banner.dismissed";
const LINE = /VantaOrigin is in beta/;

// jsdom has no layout, so nothing ever overflows and nothing ever scrolls
// unless the measurements are made to say so.
const measuring = ({ space, needed }) => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return space;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get() {
      return needed;
    },
  });
};

const stillness = (wanted) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes("prefers-reduced-motion") ? wanted : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const show = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BetaBanner />
    </MemoryRouter>
  );

const track = () => document.querySelector(".animate-marquee");

// The line is drawn more than once on purpose: a second copy makes the loop
// seamless, and a hidden one is what gets measured. Both are aria-hidden, so
// assistive tech is told about exactly one, and these queries ask the same
// question the screen reader does.
const spoken = (matcher) => screen.getAllByText(matcher, { ignore: "[aria-hidden='true']" });

beforeEach(() => {
  window.localStorage.clear();
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  stillness(false);
  measuring({ space: 600, needed: 200 });
  vi.clearAllMocks();
});

afterEach(() => {
  delete HTMLElement.prototype.clientWidth;
  delete HTMLElement.prototype.scrollWidth;
});

describe("Where it appears", () => {
  it("is on the pages anyone can see", () => {
    show("/");
    expect(spoken(LINE)).toHaveLength(1);
  });

  it("stays off the workspace and the sign-in screens", () => {
    for (const path of ["/creators-hub", "/settings", "/admin", "/admin/blog/new", "/signin", "/signup"]) {
      const { unmount } = show(path);
      expect(screen.queryByText(LINE), path).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe("Closing it", () => {
  it("remembers, so it does not come back next time", () => {
    show("/");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss this notice" }));

    expect(screen.queryByText(LINE)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(REMEMBERED)).toBe("yes");
  });

  it("never draws one already closed, so the page does not jump", () => {
    // Read before the first paint rather than in an effect. In an effect the
    // banner appears, the page moves down, and then both undo themselves.
    window.localStorage.setItem(REMEMBERED, "yes");
    show("/");

    expect(screen.queryByText(LINE)).not.toBeInTheDocument();
  });

  it("still closes when storage refuses, which a private window does", () => {
    const broken = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage is full");
    });

    show("/");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss this notice" }));
    // Forgetting is survivable. Failing to close is not.
    expect(screen.queryByText(LINE)).not.toBeInTheDocument();
    broken.mockRestore();
  });
});

describe("Whether the words move", () => {
  it("stays still when they fit", async () => {
    measuring({ space: 600, needed: 200 });
    await act(async () => {
      show("/");
    });
    expect(track()).toBeNull();
  });

  it("moves when they do not", async () => {
    measuring({ space: 200, needed: 600 });
    await act(async () => {
      show("/");
    });
    expect(track()).not.toBeNull();
  });

  it("stays still for somebody who asked for less movement, even when they do not fit", async () => {
    stillness(true);
    measuring({ space: 200, needed: 600 });
    await act(async () => {
      show("/");
    });

    expect(track()).toBeNull();
    // And the line is still there to be read.
    expect(spoken(LINE)).toHaveLength(1);
  });

  it("says the line once for a screen reader, however many copies are drawn", async () => {
    measuring({ space: 200, needed: 600 });
    await act(async () => {
      show("/");
    });

    expect(spoken(LINE)).toHaveLength(1);
  });
});

describe("The buttons beside it", () => {
  it("are there whether the words move or not", async () => {
    measuring({ space: 200, needed: 600 });
    await act(async () => {
      show("/");
    });

    expect(screen.getByRole("button", { name: "Give feedback" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss this notice" })).toBeInTheDocument();
    // Outside the box the words scroll in, so they never move with them.
    expect(track()?.contains(screen.getByRole("button", { name: "Give feedback" }))).toBeFalsy();
  });
});

describe("Saying something", () => {
  it("sends the message, the address and the page they were on", async () => {
    show("/");
    fireEvent.click(screen.getByRole("button", { name: "Give feedback" }));

    fireEvent.change(screen.getByPlaceholderText(/What worked/), {
      target: { value: "The publish button hides on a phone." },
    });
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "me@example.test" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    });

    expect(sendFeedback).toHaveBeenCalledWith({
      message: "The publish button hides on a phone.",
      email: "me@example.test",
      page: window.location.href,
    });
    expect(screen.getByRole("status")).toHaveTextContent(/reached us/i);
  });

  it("does not send an empty one", () => {
    show("/");
    fireEvent.click(screen.getByRole("button", { name: "Give feedback" }));

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("says so when it does not go through, rather than pretending", async () => {
    sendFeedback.mockRejectedValueOnce(new Error("That did not send."));

    show("/");
    fireEvent.click(screen.getByRole("button", { name: "Give feedback" }));
    fireEvent.change(screen.getByPlaceholderText(/What worked/), {
      target: { value: "Does this reach anybody?" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    });

    expect(screen.getByRole("alert")).toHaveTextContent("That did not send.");
    // Still open, so the words they wrote are not thrown away.
    expect(screen.getByPlaceholderText(/What worked/)).toHaveValue("Does this reach anybody?");
  });

  it("closes on Escape", async () => {
    show("/");
    fireEvent.click(screen.getByRole("button", { name: "Give feedback" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
