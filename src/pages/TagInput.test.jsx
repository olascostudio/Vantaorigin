import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Keywords, pasted as a list.
//
// They arrive that way far more often than one at a time: out of a
// spreadsheet, a notes app, somebody's suggested set. Pasting one used to
// make a single tag the length of a sentence, and the only way to get them
// in properly was typing each one back out by hand.

vi.mock("../data/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: "u1", username: "@ola" }, loading: false }),
}));

vi.mock("../data/blog.js", async () => {
  const actual = await vi.importActual("../data/blog.js");
  return {
    ...actual,
    getAdminPost: vi.fn(),
    createPost: vi.fn(),
    updatePost: vi.fn(),
    uploadBlogImage: vi.fn(),
  };
});

const { default: BlogEditor } = await import("./BlogEditor.jsx");

const open = async () => {
  render(
    <MemoryRouter initialEntries={["/admin/blog/new"]}>
      <Routes>
        <Route path="/admin/blog/:id" element={<BlogEditor />} />
      </Routes>
    </MemoryRouter>
  );
  return screen.findByPlaceholderText("Type and press Enter");
};

// Pasting, the way the browser does it.
const paste = (input, text) =>
  fireEvent.paste(input, { clipboardData: { getData: () => text } });

describe("Putting keywords in", () => {
  beforeEach(() => vi.clearAllMocks());

  it("breaks a pasted list into one tag each", async () => {
    const input = await open();

    paste(
      input,
      "webcomic character template, dark fantasy worldbuilding stats, OC profile template, character lore cards, organize webcomic lore"
    );

    for (const one of [
      "webcomic character template",
      "dark fantasy worldbuilding stats",
      "OC profile template",
      "character lore cards",
      "organize webcomic lore",
    ]) {
      expect(await screen.findByText(one)).toBeInTheDocument();
    }

    // And not as one tag the length of the whole line.
    expect(screen.queryByText(/template, dark fantasy/)).not.toBeInTheDocument();
  });

  it("takes a column copied out of a spreadsheet, which comes across on new lines", async () => {
    const input = await open();
    paste(input, "character design\nworldbuilding\ncomic art");

    expect(await screen.findByText("character design")).toBeInTheDocument();
    expect(screen.getByText("worldbuilding")).toBeInTheDocument();
    expect(screen.getByText("comic art")).toBeInTheDocument();
  });

  it("drops the repeats, and does not mind their case", async () => {
    const input = await open();
    paste(input, "SEO, seo, Seo , character design,, character design");

    await waitFor(() => expect(screen.getByText("SEO")).toBeInTheDocument());
    expect(screen.getAllByText(/^SEO$/i)).toHaveLength(1);
    expect(screen.getAllByText("character design")).toHaveLength(1);
  });

  it("still takes them one at a time, typed", async () => {
    const input = await open();

    fireEvent.change(input, { target: { value: "one word" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByText("one word")).toBeInTheDocument();

    // A comma while typing commits what came before it.
    fireEvent.change(input, { target: { value: "another," } });
    expect(await screen.findByText("another")).toBeInTheDocument();
  });

  it("pastes a single keyword into the box rather than committing it", async () => {
    const input = await open();
    paste(input, "just one");

    // No separator in it, so it behaves like typing: still editable.
    expect(screen.queryByText("just one")).not.toBeInTheDocument();
  });
});
