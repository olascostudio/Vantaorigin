import { useEffect, useRef, useState } from "react";

export default function PostMenu({ label, items }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (!wrapper.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        className="flex size-8 items-center justify-center rounded-full text-xl text-neutral-400 hover:bg-white/10 hover:text-white"
      >
        •••
      </button>

      {open && (
        <ul className="absolute right-0 top-9 z-20 w-[170px] overflow-hidden rounded-lg bg-[#1a1f2b] py-2 shadow-xl ring-1 ring-white/10">
          {items.map(({ label: itemLabel, onSelect, danger }) => (
            <li key={itemLabel}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSelect();
                }}
                className={`block w-full px-4 py-2 text-left font-ui text-base hover:bg-white/5 ${
                  danger ? "text-[#f2415f]" : "text-white"
                }`}
              >
                {itemLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
