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
    <div className="flex aspect-[430/192] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/50 px-4 sm:gap-6">
      <p className="text-center font-ui text-sm font-bold tracking-wide text-[#c8cede] sm:text-base">
        Optional&nbsp; Images
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-ui text-sm text-black transition-opacity hover:opacity-90 sm:px-8 sm:py-3 sm:text-base"
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-md"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={mode === "edit" ? "Edit highlight" : "Add highlight"}
        className="w-full max-w-[1100px] rounded-2xl bg-[#2b3547] p-5 sm:p-8 lg:p-10"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            title,
            content,
            images: images.filter(Boolean).map((image) => image.url),
          });
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-4 sm:mb-4">
          <label className="block font-ui text-xl font-bold text-white sm:text-2xl" htmlFor="highlight-title">
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
          className="h-[52px] w-full rounded-xl border border-white/25 bg-transparent px-4 font-ui text-base text-white outline-none focus:border-primary sm:h-[60px] sm:px-6 sm:text-lg lg:max-w-[900px]"
        />

        <label
          className="mb-3 mt-6 block font-ui text-xl font-bold text-white sm:mb-4 sm:mt-8 sm:text-2xl"
          htmlFor="highlight-content"
        >
          Content:
        </label>
        <textarea
          id="highlight-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={8}
          required
          className="w-full rounded-xl border border-white/25 bg-transparent px-4 py-3 font-ui text-base leading-relaxed text-white outline-none focus:border-primary sm:px-6 sm:py-4 sm:text-lg"
        />

        {/* Image slots sit side by side, with the "add slot" control after them. */}
        <div className="mt-6 flex items-center gap-4 sm:mt-8 sm:gap-6">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-4 sm:gap-6">
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
          className="mt-8 h-[60px] w-full rounded-lg bg-primary font-ui text-lg font-bold text-white transition-opacity hover:opacity-90 sm:mt-10 sm:h-[70px] sm:text-2xl"
        >
          {mode === "edit" ? "Update Highlights" : "+ Add Highlights"}
        </button>
      </form>
    </div>
  );
}
