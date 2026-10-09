import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// Writing when the editor does not arrive.
//
// The editor is a megabyte and a half, fetched the first time a writing
// screen opens. When that download failed there was an empty bordered box
// and no explanation, which is indistinguishable from a broken page. These
// tests are about the way out.

const loaded = { fail: false };

vi.mock("./RichText.jsx", () => ({
  default: ({ value, onChange }) => {
    if (loaded.fail) throw new Error("chunk would not load");
    return (
      <div data-testid="rich">
        <textarea aria-label="rich" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  },
}));

const { default: Writing } = await import("./Writing.jsx");

const show = (props = {}) => {
  const onChange = vi.fn();
  render(<Writing value="" onChange={onChange} {...props} />);
  return onChange;
};

describe("Writing a post", () => {
  beforeEach(() => {
    loaded.fail = false;
    vi.clearAllMocks();
  });

  it("gives the plain HTML box to anyone who wants it, working editor or not", async () => {
    show();
    expect(await screen.findByTestId("rich")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Paste HTML" }));

    const box = screen.getByLabelText("The article, as HTML");
    expect(box).toBeInTheDocument();
    expect(screen.queryByTestId("rich")).not.toBeInTheDocument();
  });

  it("keeps what was written when swapping between the two", () => {
    const onChange = show({ value: "<p>Already written</p>" });
    fireEvent.click(screen.getByRole("button", { name: "Paste HTML" }));

    const box = screen.getByLabelText("The article, as HTML");
    expect(box).toHaveValue("<p>Already written</p>");

    fireEvent.change(box, { target: { value: "<p>Changed</p>" } });
    expect(onChange).toHaveBeenCalledWith("<p>Changed</p>");
  });

  it("falls back and says so when the editor will not load", async () => {
    loaded.fail = true;
    show({ value: "<p>Safe</p>" });

    // Not an empty box: it says what happened and leaves a way to write.
    expect(await screen.findByRole("alert")).toHaveTextContent(/editor would not load/i);
    expect(screen.getByLabelText("The article, as HTML")).toHaveValue("<p>Safe</p>");
  });

  it("does not offer the broken editor back once it has failed", async () => {
    loaded.fail = true;
    show();
    await screen.findByRole("alert");

    expect(screen.getByRole("button", { name: "Write" })).toBeDisabled();
  });
});
