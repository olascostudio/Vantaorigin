import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SuccessModal } from "./CharacterModals.jsx";

// The end of making a character is the moment somebody finally has something
// worth sharing. The Share button there used to have no handler at all: it
// sat at exactly that moment and did nothing.

const show = (character, props = {}) =>
  render(
    <SuccessModal open character={character} onClose={() => {}} onAddMore={() => {}} {...props} />,
    { wrapper: MemoryRouter }
  );

describe("Finishing a character", () => {
  it("hands over the link, and copies it", async () => {
    const written = [];
    Object.assign(navigator, {
      clipboard: { writeText: async (text) => written.push(text) },
    });

    show({ name: "Urokojin", slug: "urokojin", visibility: "public" });

    expect(screen.getByText("vantaorigin.com/character/urokojin")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    await waitFor(() => expect(written).toEqual(["https://vantaorigin.com/character/urokojin"]));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("offers to publish a private one, because it has no link to give", async () => {
    const onPublish = vi.fn(async () => {});
    show({ name: "Urokojin", slug: "urokojin", visibility: "private" }, { onPublish });

    expect(screen.getByText(/private, so it has no link yet/)).toBeInTheDocument();
    expect(screen.queryByText("vantaorigin.com/character/urokojin")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Publish it and get the link/ }));
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
  });

  it("says so when publishing fails, rather than going quiet", async () => {
    const onPublish = vi.fn(async () => {
      throw new Error("We couldn't publish that one. Try again?");
    });
    show({ name: "Urokojin", slug: "urokojin", visibility: "private" }, { onPublish });

    fireEvent.click(screen.getByRole("button", { name: /Publish it and get the link/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't publish that one."
    );
    // And the button is usable again, not stuck mid-publish.
    expect(screen.getByRole("button", { name: /Publish it and get the link/ })).toBeEnabled();
  });

  it("falls back to the character's id before a name has settled into a slug", () => {
    show({ name: "No slug yet", id: "abc-123", visibility: "public" });
    expect(screen.getByText("vantaorigin.com/character/abc-123")).toBeInTheDocument();
  });

  it("keeps the rest of the character as something to add, not something to do", () => {
    show({ name: "Urokojin", slug: "urokojin", visibility: "public" });
    expect(screen.getByRole("button", { name: "Add more about them" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done for now" })).toBeInTheDocument();
  });
});
