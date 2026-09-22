import { useEffect, useRef, useState } from "react";

function UploadSlot({ image, onPick, onClear }) {
  const inputRef = useRef(null);

  if (image) {
    return (
      <div className="relative aspect-[430/192] w-full overflow-hidden rounded-2xl border border-dashed border-white/70">
        <img src={image.url} alt={image.name} className="size-full object-cover" />
        <button
          type="button"
          onClick={onClear}
          aria-label={`Remove ${image.name}`}
          className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/60 font-ui text-lg text-white hover:bg-black/80"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="flex aspect-[430/192] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/50 px-4">
      <p className="text-center font-ui text-xs font-bold tracking-wide text-[#c8cede] sm:text-sm">
        Optional&nbsp; Images
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-full bg-white px-4 py-2 font-ui text-sm text-black transition-opacity hover:opacity-90 sm:px-6"
      >
        <span className="text-xl font-bold leading-none">+</span> Upload Image
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onPick({ url: URL.createObjectURL(file), name: file.name });
          event.target.value = "";
        }}
      />
    </div>
  );
}

export default function HighlightModal({ open, mode = "create", post, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState([null, null]);

  useEffect(() => {
    if (!open) return;
    setTitle(post?.title ?? "");
    setContent(post?.content ?? "");
    const existing = (post?.images ?? []).map((url, i) => ({ url, name: `Image ${i + 1}` }));
    setImages([existing[0] ?? null, existing[1] ?? null, ...existing.slice(2)]);
  }, [open, post]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const setImage = (index, value) =>
    setImages((prev) => prev.map((img, i) => (i === index ? value : img)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Edit highlight" : "Add highlight"}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[760px] overflow-y-auto rounded-2xl bg-[#2b3547] p-5 sm:p-7"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            title,
            content,
            images: images.filter(Boolean).map((image) => image.url),
          });
        }}
      >
        <div className="mb-2 flex items-start justify-between gap-4">
          <label className="block font-ui text-lg font-bold text-white sm:text-xl" htmlFor="highlight-title">
            Title:
          </label>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-neutral-300 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>
        <input
          id="highlight-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="h-[48px] w-full rounded-xl border border-white/25 bg-transparent px-4 font-ui text-base text-white outline-none focus:border-primary sm:px-5"
        />

        <label
          className="mb-2 mt-5 block font-ui text-lg font-bold text-white sm:text-xl"
          htmlFor="highlight-content"
        >
          Content:
        </label>
        <textarea
          id="highlight-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={6}
          required
          className="w-full resize-y rounded-xl border border-white/25 bg-transparent px-4 py-3 font-ui text-base leading-relaxed text-white outline-none focus:border-primary sm:px-5"
        />

        {/* Image slots sit side by side, with the "add slot" control after them. */}
        <div className="mt-5 flex items-center gap-3 sm:gap-4">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:gap-4">
            {images.map((image, index) => (
              <UploadSlot
                key={index}
                image={image}
                onPick={(value) => setImage(index, value)}
                onClear={() => setImage(index, null)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setImages((prev) => [...prev, null])}
            aria-label="Add another image slot"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-white/60 font-ui text-xl text-white hover:bg-white/10"
          >
            +
          </button>
        </div>

        <button
          type="submit"
          className="mt-6 h-[52px] w-full rounded-lg bg-primary font-ui text-lg font-bold text-white transition-opacity hover:opacity-90"
        >
          {mode === "edit" ? "Update Highlights" : "+ Add Highlights"}
        </button>
      </form>
    </div>
  );
}
